import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import { clearCache } from "../src/cache/index.js";

const callSportDbTool = vi.fn();
vi.mock("../src/mcp/client.js", () => ({ callSportDbTool: (...args) => callSportDbTool(...args) }));

const { app } = await import("../src/app.js");

beforeEach(() => {
  clearCache();
  callSportDbTool.mockReset();
});

describe("GET /api/matches", () => {
  it("400s when league query param is missing", async () => {
    const res = await request(app).get("/api/matches");
    expect(res.status).toBe(400);
  });

  it("400s for an unknown league slug", async () => {
    const res = await request(app).get("/api/matches?league=not-a-real-league");
    expect(res.status).toBe(400);
  });

  it("resolves the active season, fetches results and maps them to a simplified DTO", async () => {
    callSportDbTool.mockImplementation(async (tool) => {
      if (tool === "flashscore_list_competition_seasons") {
        return [{ season: "2025-2026" }, { season: "2024-2025" }];
      }
      if (tool === "flashscore_get_competition_results") {
        return [
          {
            eventId: "KGB564l2",
            round: "Final",
            startDateTimeUtc: "2025-08-10T14:00:00.000Z",
            homeName: "Crystal Palace",
            homeParticipantIds: "AovF1Mia",
            homeScore: "3",
            awayName: "Liverpool",
            awayParticipantIds: "lId4TMwf",
            awayScore: "2",
            winner: "1",
          },
        ];
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    const res = await request(app).get("/api/matches?league=fa-community-shield");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: "KGB564l2",
        date: "2025-08-10T14:00:00.000Z",
        round: "Final",
        home: { name: "Crystal Palace", teamId: "AovF1Mia", score: "3" },
        away: { name: "Liverpool", teamId: "lId4TMwf", score: "2" },
        winner: "home",
      },
    ]);
  });

  it("returns an empty array when SportDB has no results for the season (data: null)", async () => {
    callSportDbTool.mockImplementation(async (tool) => {
      if (tool === "flashscore_list_competition_seasons") return [{ season: "2026" }];
      if (tool === "flashscore_get_competition_results") return null;
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    const res = await request(app).get("/api/matches?league=liga-profesional");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 502 when the SportDB MCP call fails", async () => {
    callSportDbTool.mockRejectedValue(new Error("boom"));

    const res = await request(app).get("/api/matches?league=premier-league");

    expect(res.status).toBe(502);
  });
});

describe("GET /api/matches?date=", () => {
  it("400s when neither league nor date is provided", async () => {
    const res = await request(app).get("/api/matches");
    expect(res.status).toBe(400);
  });

  it("aggregates matches from every configured league for the given date", async () => {
    callSportDbTool.mockImplementation(async (tool, args) => {
      if (tool === "flashscore_list_competition_seasons") return [{ season: "2025-2026" }];
      if (tool === "flashscore_get_competition_fixtures") return [];
      if (tool === "flashscore_get_competition_results") {
        if (args.competition_id === "dYlOSQOD") {
          return [
            {
              eventId: "KGB564l2",
              eventStage: "FINISHED",
              startDateTimeUtc: "2025-08-10T14:00:00.000Z",
              homeName: "Crystal Palace",
              homeParticipantIds: "AovF1Mia",
              homeScore: "3",
              awayName: "Liverpool",
              awayParticipantIds: "lId4TMwf",
              awayScore: "2",
            },
          ];
        }
        return [];
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    const res = await request(app).get("/api/matches?date=2025-08-10");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        id: "KGB564l2",
        competition: { id: "premier-league", name: "Premier League", logoUrl: null, country: "England" },
        status: "finished",
        kickoff: "2025-08-10T14:00:00.000Z",
        stadium: null,
        minute: null,
        homeTeam: { id: "AovF1Mia", name: "Crystal Palace" },
        awayTeam: { id: "lId4TMwf", name: "Liverpool" },
        score: { home: 3, away: 2 },
      },
    ]);
  });

  it("maps postponed/cancelled eventStage to a non-live status instead of defaulting to live", async () => {
    callSportDbTool.mockImplementation(async (tool, args) => {
      if (tool === "flashscore_list_competition_seasons") return [{ season: "2025-2026" }];
      if (tool === "flashscore_get_competition_fixtures") return [];
      if (tool === "flashscore_get_competition_results") {
        if (args.competition_id === "dYlOSQOD") {
          return [
            {
              eventId: "postponed1",
              eventStage: "POSTP",
              startDateTimeUtc: "2025-08-10T14:00:00.000Z",
              homeName: "Crystal Palace",
              homeParticipantIds: "AovF1Mia",
              homeScore: null,
              awayName: "Liverpool",
              awayParticipantIds: "lId4TMwf",
              awayScore: null,
            },
          ];
        }
        return [];
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    const res = await request(app).get("/api/matches?date=2025-08-10");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].status).toBe("cancelled");
    expect(res.body[0].statusLabel).toBe("POSTP");
  });
});

describe("GET /api/matches/:id", () => {
  it("finds a match by id across the configured leagues", async () => {
    callSportDbTool.mockImplementation(async (tool, args) => {
      if (tool === "flashscore_list_competition_seasons") return [{ season: "2025" }];
      if (tool === "flashscore_get_competition_fixtures") return [];
      if (tool === "flashscore_get_competition_results") {
        if (args.competition_id === "AsSx0P9K") {
          return [
            {
              eventId: "KGB564l2",
              eventStage: "FINISHED",
              startDateTimeUtc: "2025-08-10T14:00:00.000Z",
              homeName: "Crystal Palace",
              homeParticipantIds: "AovF1Mia",
              homeScore: "3",
              awayName: "Liverpool",
              awayParticipantIds: "lId4TMwf",
              awayScore: "2",
            },
          ];
        }
        return [];
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    const res = await request(app).get("/api/matches/KGB564l2");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("KGB564l2");
    expect(res.body.competition.id).toBe("fa-community-shield");
  });

  it("404s when the match isn't found in any configured league", async () => {
    callSportDbTool.mockImplementation(async (tool) => {
      if (tool === "flashscore_list_competition_seasons") return [{ season: "2025" }];
      return [];
    });

    const res = await request(app).get("/api/matches/does-not-exist");

    expect(res.status).toBe(404);
  });

  it("caches the not-found lookup instead of re-scanning every league on repeated requests", async () => {
    callSportDbTool.mockImplementation(async (tool) => {
      if (tool === "flashscore_list_competition_seasons") return [{ season: "2025" }];
      return [];
    });

    const first = await request(app).get("/api/matches/does-not-exist");
    expect(first.status).toBe(404);

    const callsAfterFirstRequest = callSportDbTool.mock.calls.length;
    expect(callsAfterFirstRequest).toBeGreaterThan(0);

    const second = await request(app).get("/api/matches/does-not-exist");
    expect(second.status).toBe(404);

    // Same id, still within TTL: should be served from cache, no extra MCP calls.
    expect(callSportDbTool.mock.calls.length).toBe(callsAfterFirstRequest);
  });
});

describe("GET /api/matches/:id/events", () => {
  it("maps SportDB incidents to simplified match events", async () => {
    callSportDbTool.mockResolvedValue({
      homeName: "Crystal Palace",
      awayName: "Liverpool",
      events: [
        {
          eventId: "baWbmWGt",
          incidentTime: "4'",
          incidentSide: "2",
          incidentTypeName: ["Goal", "Assistance"],
          incidentPlayerName: ["Ekitike H.", "Wirtz F."],
          incidentCommentary: ["Goal! Hugo Ekitike ... 0:1.", ""],
        },
        {
          eventId: "yc1",
          incidentTime: "12'",
          incidentSide: "1",
          incidentTypeName: "Yellow Card",
          incidentPlayerName: "Eze E.",
          incidentCommentary: "",
        },
      ],
    });

    const res = await request(app).get("/api/matches/KGB564l2/events");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: "baWbmWGt", minute: 4, type: "goal", side: "away", player: "Ekitike H.", detail: "Goal! Hugo Ekitike ... 0:1." },
      { id: "yc1", minute: 12, type: "yellow", side: "home", player: "Eze E." },
    ]);
  });
});

describe("GET /api/matches/:id/lineups", () => {
  it("groups starters and substitutes by side", async () => {
    callSportDbTool.mockResolvedValue([
      {
        group: "Starting Lineups",
        home: [{ participantId: "Stf4BYFn", participantName: "Eze E.", participantNumber: "10", formation: "1-3-4-2-1" }],
        away: [],
      },
      { group: "Substitutes", home: [], away: [] },
    ]);

    const res = await request(app).get("/api/matches/KGB564l2/lineups");

    expect(res.status).toBe(200);
    expect(res.body.home.formation).toBe("1-3-4-2-1");
    expect(res.body.home.starters).toEqual([
      { id: "Stf4BYFn", number: 10, name: "Eze E.", position: "" },
    ]);
  });
});

describe("GET /api/matches/:id/statistics", () => {
  it("parses percentage and raw stat values", async () => {
    callSportDbTool.mockResolvedValue([
      {
        period: "Match",
        stats: [
          { statName: "Ball possession", homeValue: "41%", awayValue: "59%" },
          { statName: "Total shots", homeValue: "14", awayValue: "12" },
        ],
      },
    ]);

    const res = await request(app).get("/api/matches/KGB564l2/statistics");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { label: "Ball possession", home: 41, away: 59, isPercent: true },
      { label: "Total shots", home: 14, away: 12, isPercent: false },
    ]);
  });
});

describe("GET /api/matches/river-boca", () => {
  const RIVER_ID = "EVqSBe2f";
  const BOCA_ID = "hMrWAFH0";

  it("filters to only River/Boca matches across Liga Profesional and Copa Argentina, most recent first", async () => {
    callSportDbTool.mockImplementation(async (tool, args) => {
      if (tool === "flashscore_list_competition_seasons") return [{ season: "2025" }];

      if (tool === "flashscore_get_competition_results") {
        if (args.competition_id === "naYhNOaA") {
          // Liga Profesional: un clásico River-Boca + un partido sin relación (debe filtrarse)
          return [
            {
              eventId: "clasico1",
              startDateTimeUtc: "2025-09-01T00:00:00.000Z",
              homeName: "River Plate",
              homeParticipantIds: RIVER_ID,
              homeScore: "2",
              awayName: "Boca Juniors",
              awayParticipantIds: BOCA_ID,
              awayScore: "1",
              winner: "1",
            },
            {
              eventId: "irrelevante",
              startDateTimeUtc: "2025-09-05T00:00:00.000Z",
              homeName: "Talleres",
              homeParticipantIds: "otherTeam1",
              homeScore: "0",
              awayName: "Platense",
              awayParticipantIds: "otherTeam2",
              awayScore: "0",
              winner: "0",
            },
          ];
        }
        if (args.competition_id === "OWsjCTcG") {
          // Copa Argentina: Boca solo (sin River)
          return [
            {
              eventId: "copa1",
              startDateTimeUtc: "2025-10-10T00:00:00.000Z",
              homeName: "Boca Juniors",
              homeParticipantIds: BOCA_ID,
              homeScore: "1",
              awayName: "Instituto",
              awayParticipantIds: "otherTeam3",
              awayScore: "0",
              winner: "1",
            },
          ];
        }
      }
      throw new Error(`Unexpected tool call: ${tool} ${JSON.stringify(args)}`);
    });

    const res = await request(app).get("/api/matches/river-boca");

    expect(res.status).toBe(200);
    expect(res.body.map((m) => m.id)).toEqual(["copa1", "clasico1"]);
    expect(res.body.every((m) => ["liga-profesional", "copa-argentina"].includes(m.league))).toBe(true);
  });

  it("returns 502 when the SportDB MCP call fails", async () => {
    callSportDbTool.mockRejectedValue(new Error("boom"));

    const res = await request(app).get("/api/matches/river-boca");

    expect(res.status).toBe(502);
  });
});
