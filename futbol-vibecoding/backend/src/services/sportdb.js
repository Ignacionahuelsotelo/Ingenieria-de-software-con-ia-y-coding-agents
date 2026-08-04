import { callSportDbTool } from "../mcp/client.js";
import { wrap, TTL } from "../cache/index.js";
import { LEAGUES, findLeague } from "../config/leagues.js";

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
