import { callSportDbTool } from "../mcp/client.js";
import { wrap, TTL } from "../cache/index.js";
import { LEAGUES, findLeague } from "../config/leagues.js";
import { TEAMS, RIVER_BOCA_LEAGUES } from "../config/teams.js";

function baseParams(league) {
  return {
    sport: league.sport,
    country_slug: league.country.toLowerCase().replace(/\s+/g, "-"),
    country_id: league.countryId,
    competition_slug: league.slug,
    competition_id: league.competitionId,
  };
}

async function getActiveSeason(league) {
  return wrap("season", { competitionId: league.competitionId }, TTL.SEASON, async () => {
    const seasons = await callSportDbTool("flashscore_list_competition_seasons", baseParams(league));
    if (!seasons || seasons.length === 0) {
      throw new Error(`No seasons found for league ${league.slug}`);
    }
    return seasons[0].season;
  });
}

export function listLeagues() {
  return LEAGUES.map(({ slug, name, country }) => ({ slug, name, country }));
}

function winnerOf(match) {
  if (match.winner === "1") return "home";
  if (match.winner === "2") return "away";
  return "draw";
}

function mapMatch(match) {
  return {
    id: match.eventId,
    date: match.startDateTimeUtc,
    round: match.round ?? null,
    home: { name: match.homeName, teamId: match.homeParticipantIds, score: match.homeScore },
    away: { name: match.awayName, teamId: match.awayParticipantIds, score: match.awayScore },
    winner: winnerOf(match),
  };
}

export async function getMatches(leagueSlug, { page = 1 } = {}) {
  const league = findLeague(leagueSlug);
  if (!league) return null;

  const season = await getActiveSeason(league);
  return wrap("results", { competitionId: league.competitionId, season, page }, TTL.MATCHES, async () => {
    const results = await callSportDbTool("flashscore_get_competition_results", {
      ...baseParams(league),
      season,
      page,
    });
    return (results ?? []).map(mapMatch);
  });
}

const RIVER_BOCA_TEAM_IDS = new Set([TEAMS["river-plate"].id, TEAMS["boca-juniors"].id]);

// Partidos de River y/o Boca en las ligas argentinas donde compiten.
export async function getRiverBocaMatches() {
  const perLeague = await Promise.all(
    RIVER_BOCA_LEAGUES.map(async (leagueSlug) => {
      const matches = await getMatches(leagueSlug);
      return matches.map((match) => ({ ...match, league: leagueSlug }));
    })
  );

  return perLeague
    .flat()
    .filter((match) => RIVER_BOCA_TEAM_IDS.has(match.home.teamId) || RIVER_BOCA_TEAM_IDS.has(match.away.teamId))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
}

function mapStandingRow(row) {
  const [goalsFor, goalsAgainst] = (row.goals ?? "0:0").split(":").map((n) => Number(n));
  return {
    rank: Number(row.rank),
    teamId: row.teamId,
    teamName: row.teamName,
    played: Number(row.matches),
    wins: Number(row.wins),
    draws: Number(row.draws),
    losses: Number(row.lossesRegular),
    goalsFor,
    goalsAgainst,
    goalDiff: Number(row.goalDiff),
    points: Number(row.points),
    form: (row.events ?? []).map((e) => e.eventType),
  };
}

export async function getStandings(leagueSlug) {
  const league = findLeague(leagueSlug);
  if (!league) return null;

  const season = await getActiveSeason(league);
  return wrap("standings", { competitionId: league.competitionId, season }, TTL.STANDINGS, async () => {
    const standings = await callSportDbTool("flashscore_get_competition_standings", {
      ...baseParams(league),
      season,
    });
    return (standings ?? []).map(mapStandingRow);
  });
}

// eventStage de SportDB no es un enum documentado: "SCHEDULED" y "FINISHED" son los únicos
// valores confirmados como no-live, junto con los estados de cancelación/postergación de
// abajo. Cualquier otra cosa ("1H", "2H", "HT", "ET", "PEN", ...) se interpreta como en vivo.
const NON_LIVE_STAGES = new Set(["CANC", "POSTP", "ABAN", "SUSP", "INTER", "AWARDED", "WO"]);

function mapMatchStatus(eventStage) {
  if (eventStage === "FINISHED") return "finished";
  if (eventStage === "SCHEDULED") return "upcoming";
  if (NON_LIVE_STAGES.has(eventStage)) return "cancelled";
  return "live";
}

function toScore(value) {
  return value === undefined || value === null ? null : Number(value);
}

function mapMatchFull(match, league) {
  const status = mapMatchStatus(match.eventStage);
  return {
    id: match.eventId,
    competition: { id: league.slug, name: league.name, logoUrl: null, country: league.country },
    status,
    kickoff: match.startDateTimeUtc,
    statusLabel: status === "live" || status === "cancelled" ? match.eventStage : undefined,
    minute: null,
    stadium: match.infoNotice ?? null,
    homeTeam: { id: match.homeParticipantIds, name: match.homeName },
    awayTeam: { id: match.awayParticipantIds, name: match.awayName },
    score: { home: toScore(match.homeScore), away: toScore(match.awayScore) },
  };
}

// El plan de SportDB tiene rate limit (3 req/s); recorrer las 6 ligas en paralelo lo supera
// de forma consistente. Se resuelve secuencialmente en vez de con Promise.all.
async function mapSequential(items, fn) {
  const out = [];
  for (const item of items) {
    out.push(await fn(item));
  }
  return out;
}

async function getLeagueMatches(league) {
  const season = await getActiveSeason(league);
  return wrap("full-matches", { competitionId: league.competitionId, season }, TTL.MATCHES, async () => {
    const fixtures = await callSportDbTool("flashscore_get_competition_fixtures", {
      ...baseParams(league),
      season,
      page: 1,
    });
    const results = await callSportDbTool("flashscore_get_competition_results", {
      ...baseParams(league),
      season,
      page: 1,
    });
    return [...(fixtures ?? []), ...(results ?? [])];
  });
}

export async function getMatchesByDate(date) {
  const perLeague = await mapSequential(LEAGUES, async (league) => {
    try {
      const matches = await getLeagueMatches(league);
      return matches
        .filter((match) => match.startDateTimeUtc?.slice(0, 10) === date)
        .map((match) => mapMatchFull(match, league));
    } catch (err) {
      console.error(`Failed to fetch matches for ${league.slug}`, err);
      return [];
    }
  });

  return perLeague.flat().sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
}

async function findMatchWithLeague(id) {
  for (const league of LEAGUES) {
    const matches = await getLeagueMatches(league);
    const match = matches.find((m) => m.eventId === id);
    if (match) return { match, league };
  }
  return null;
}

// Cachea el resultado (encontrado o no) del lookup por id, no solo los fixtures/results por
// liga. Sin esto, pedir un id inexistente (bots, ids con typos) fuerza un recorrido completo
// de las 6 ligas configuradas -por request- una vez que el cache de "full-matches" por liga
// expira (TTL.MATCHES), agotando buena parte de la cuota de 3 req/s del plan free de SportDB.
export async function getMatchById(id) {
  return wrap("match-lookup", { id }, TTL.MATCHES, async () => {
    const found = await findMatchWithLeague(id);
    return found ? mapMatchFull(found.match, found.league) : null;
  });
}

export async function listCompetitions() {
  return mapSequential(LEAGUES, async (league) => ({
    id: league.slug,
    name: league.name,
    country: league.country,
    season: await getActiveSeason(league),
    logoUrl: null,
  }));
}

// incidentType no está documentado como enum estable; se clasifica por incidentTypeName.
function classifyEventType(typeNames) {
  const names = typeNames.join(" ").toLowerCase();
  if (names.includes("red card")) return "red";
  if (names.includes("yellow card")) return "yellow";
  if (names.includes("substitution")) return "sub";
  if (names.includes("var")) return "var";
  return "goal";
}

function asArray(value) {
  return Array.isArray(value) ? value : [value];
}

function mapMatchEvent(incident) {
  const typeNames = asArray(incident.incidentTypeName ?? []);
  const playerNames = asArray(incident.incidentPlayerName ?? []);
  const commentary = asArray(incident.incidentCommentary ?? []);
  return {
    id: incident.eventId,
    minute: parseInt(incident.incidentTime, 10) || 0,
    type: classifyEventType(typeNames),
    side: incident.incidentSide === "1" ? "home" : "away",
    player: playerNames[0] ?? "",
    detail: commentary.find((c) => c) ?? undefined,
  };
}

export async function getMatchEvents(id) {
  const details = await callSportDbTool("flashscore_get_match_events", { match_id: id });
  return (details?.events ?? []).map(mapMatchEvent);
}

function mapLineupPlayer(player) {
  return {
    id: player.participantId,
    number: parseInt(player.participantNumber, 10) || 0,
    name: player.participantName,
    position: player.participantSpecialPosition ?? "",
  };
}

export async function getMatchLineups(id) {
  const groups = await callSportDbTool("flashscore_get_match_lineups", { match_id: id });
  const starting = groups?.find((g) => g.group === "Starting Lineups");
  const subs = groups?.find((g) => g.group === "Substitutes");

  return {
    home: {
      formation: starting?.home?.[0]?.formation ?? "",
      starters: (starting?.home ?? []).map(mapLineupPlayer),
      substitutes: (subs?.home ?? []).map(mapLineupPlayer),
    },
    away: {
      formation: starting?.away?.[0]?.formation ?? "",
      starters: (starting?.away ?? []).map(mapLineupPlayer),
      substitutes: (subs?.away ?? []).map(mapLineupPlayer),
    },
  };
}

// Algunos valores vienen como "86% (459/536)"; nos quedamos con el porcentaje.
function parseStatValue(value) {
  const percentMatch = /(-?\d+(\.\d+)?)%/.exec(value ?? "");
  if (percentMatch) return Number(percentMatch[1]);
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export async function getMatchStatistics(id) {
  const periods = await callSportDbTool("flashscore_get_match_stats", { match_id: id });
  const match = periods?.find((p) => p.period === "Match") ?? periods?.[0];

  // SportDB repite algunos stats "titulares" (xG, tiros, posesión) como resumen antes del
  // desglose completo por categoría; nos quedamos con la primera aparición de cada label.
  const seen = new Set();
  const stats = [];
  for (const stat of match?.stats ?? []) {
    if (seen.has(stat.statName)) continue;
    seen.add(stat.statName);
    stats.push({
      label: stat.statName,
      home: parseStatValue(stat.homeValue),
      away: parseStatValue(stat.awayValue),
      isPercent: (stat.homeValue ?? "").includes("%"),
    });
  }
  return stats;
}

// --- Team profile ---

// Las standings vienen planas (Premier League: array de filas) o agrupadas por grupo
// (Liga Profesional: [{ roundType, roundTypeId, teams: [...] }]). Normalizar a filas planas.
function flattenStandings(standings) {
  if (!Array.isArray(standings)) return [];
  if (Array.isArray(standings[0]?.teams)) return standings.flatMap((group) => group.teams ?? []);
  return standings;
}

// flashscore_get_team_details exige team_slug + team_id, pero la app solo tiene team_id.
// El slug se resuelve desde datos que ya se cachean: primero los partidos de cada liga
// (fixtures+results traen homeParticipantNameUrl/awayParticipantNameUrl) y, si el equipo
// no aparece, las standings crudas (teamSlug). Devuelve null si no se encuentra.
async function findTeamSlug(teamId) {
  for (const league of LEAGUES) {
    const matches = await getLeagueMatches(league);
    for (const match of matches) {
      if (match.homeParticipantIds === teamId) return match.homeParticipantNameUrl;
      if (match.awayParticipantIds === teamId) return match.awayParticipantNameUrl;
    }
  }
  for (const league of LEAGUES) {
    const season = await getActiveSeason(league);
    const standings = await wrap(
      "standings-raw",
      { competitionId: league.competitionId, season },
      TTL.STANDINGS,
      async () => callSportDbTool("flashscore_get_competition_standings", { ...baseParams(league), season })
    );
    const row = flattenStandings(standings).find((r) => r.teamId === teamId);
    if (row?.teamSlug) return row.teamSlug;
  }
  return null;
}

function mapTeamDetails(data) {
  const seen = new Set();
  const squad = [];
  let coach = null;
  for (const group of data.squad ?? []) {
    for (const player of group.players ?? []) {
      if (seen.has(player.id)) continue;
      seen.add(player.id);
      const name = [player.firstName, player.lastName].filter(Boolean).join(" ");
      const number = parseInt(player.jerseyNumber, 10);
      if (player.position === "Coach") {
        coach = { id: player.id, name };
      } else {
        squad.push({
          id: player.id,
          name,
          number: Number.isNaN(number) ? null : number,
          position: player.position ?? "",
          country: player.countryName ?? "",
        });
      }
    }
  }
  return {
    id: data.id,
    name: data.teamName,
    slug: data.slug,
    logoUrl: data.teamLogo ?? null,
    country: data.country?.name ?? "",
    stadium: { name: data.stadiumName ?? "", capacity: data.stadiumCapacity ?? null },
    coach,
    squad,
  };
}

// Cachea el resultado (encontrado o no) por team_id, igual que getMatchById: sin esto,
// un id inexistente fuerza el recorrido completo de las 6 ligas por request.
export async function getTeamById(teamId) {
  return wrap("team", { teamId }, TTL.TEAM, async () => {
    const slug = await findTeamSlug(teamId);
    if (!slug) return null;
    const details = await callSportDbTool("flashscore_get_team_details", {
      team_slug: slug,
      team_id: teamId,
    });
    return mapTeamDetails(details);
  });
}
