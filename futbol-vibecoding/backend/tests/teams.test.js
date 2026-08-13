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

describe("GET /api/teams/:id", () => {
  it("happy path via matches - resolves slug from match data and returns team profile", async () => {
    callSportDbTool.mockImplementation(async (tool, params) => {
      if (tool === "flashscore_list_competition_seasons") {
        return [{ season: "2025-2026" }];
      }
      if (tool === "flashscore_get_competition_fixtures") {
        return [];
      }
      if (tool === "flashscore_get_competition_results") {
        return [
          {
            eventId: "match1",
            startDateTimeUtc: "2025-08-10T20:00:00Z",
            homeParticipantIds: "hMrWAFH0",
            homeParticipantNameUrl: "boca-juniors",
            homeName: "Boca Juniors",
            awayParticipantIds: "away123",
            awayParticipantNameUrl: "river-plate",
            awayName: "River Plate",
            homeScore: "2",
            awayScore: "1",
            winner: "1",
          },
        ];
      }
      if (tool === "flashscore_get_team_details") {
        expect(params).toEqual({ team_slug: "boca-juniors", team_id: "hMrWAFH0" });
        return {
          id: "hMrWAFH0",
          teamName: "Boca Juniors",
          slug: "boca-juniors",
          teamLogo: "https://static.flashscore.com/res/image/data/h4UwH8Cr-pGZDw8HC.png",
          country: { name: "Argentina" },
          stadiumName: "Estadio Alberto J. Armando (Buenos Aires)",
          stadiumCapacity: 57200,
          squad: [
            {
              players: [
                { id: "2e5J9jeK", firstName: "Leandro", lastName: "Brey", jerseyNumber: "12", position: "Goalkeepers", countryName: "Argentina" },
                { id: "coach1", firstName: "Rodolfo", lastName: "Arruabarrena", jerseyNumber: "", position: "Coach", countryName: "Argentina" },
              ],
            },
          ],
        };
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    const res = await request(app).get("/api/teams/hMrWAFH0");

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: "hMrWAFH0",
      name: "Boca Juniors",
      slug: "boca-juniors",
      logoUrl: "https://static.flashscore.com/res/image/data/h4UwH8Cr-pGZDw8HC.png",
      country: "Argentina",
      stadium: { name: "Estadio Alberto J. Armando (Buenos Aires)", capacity: 57200 },
      coach: { id: "coach1", name: "Rodolfo Arruabarrena" },
      squad: [
        { id: "2e5J9jeK", name: "Leandro Brey", number: 12, position: "Goalkeepers", country: "Argentina" },
      ],
    });
  });

  it("fallback to standings (grouped form) - resolves slug from standings when not in matches", async () => {
    callSportDbTool.mockImplementation(async (tool, params) => {
      if (tool === "flashscore_list_competition_seasons") {
        return [{ season: "2025-2026" }];
      }
      if (tool === "flashscore_get_competition_fixtures") {
        return [];
      }
      if (tool === "flashscore_get_competition_results") {
        return [];
      }
      if (tool === "flashscore_get_competition_standings") {
        return [
          {
            roundType: "Group A",
            roundTypeId: "group-a",
            teams: [
              { teamId: "hMrWAFH0", teamSlug: "boca-juniors", teamName: "Boca Juniors", rank: "1", matches: "10", wins: "8", draws: "1", lossesRegular: "1", goals: "20:5", goalDiff: "15", points: "25", events: [] },
            ],
          },
        ];
      }
      if (tool === "flashscore_get_team_details") {
        return {
          id: "hMrWAFH0",
          teamName: "Boca Juniors",
          slug: "boca-juniors",
          teamLogo: null,
          country: { name: "Argentina" },
          stadiumName: "Estadio Alberto J. Armando",
          stadiumCapacity: 57200,
          squad: [{ players: [] }],
        };
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    const res = await request(app).get("/api/teams/hMrWAFH0");

    expect(res.status).toBe(200);
    expect(res.body.id).toBe("hMrWAFH0");
  });

  it("returns 404 when team_id not found in any league", async () => {
    callSportDbTool.mockImplementation(async (tool) => {
      if (tool === "flashscore_list_competition_seasons") {
        return [{ season: "2025-2026" }];
      }
      if (tool === "flashscore_get_competition_fixtures") {
        return [];
      }
      if (tool === "flashscore_get_competition_results") {
        return [];
      }
      if (tool === "flashscore_get_competition_standings") {
        return [];
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    const res = await request(app).get("/api/teams/nonexistent");

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: "Team not found" });
  });

  it("returns 502 when SportDB MCP call fails", async () => {
    callSportDbTool.mockRejectedValue(new Error("boom"));

    const res = await request(app).get("/api/teams/hMrWAFH0");

    expect(res.status).toBe(502);
    expect(res.body).toEqual({ error: "Failed to fetch team from SportDB" });
  });

  it("caches team profile - second request does not call flashscore_get_team_details again", async () => {
    callSportDbTool.mockImplementation(async (tool, params) => {
      if (tool === "flashscore_list_competition_seasons") {
        return [{ season: "2025-2026" }];
      }
      if (tool === "flashscore_get_competition_fixtures") {
        return [];
      }
      if (tool === "flashscore_get_competition_results") {
        return [
          {
            eventId: "match1",
            startDateTimeUtc: "2025-08-10T20:00:00Z",
            homeParticipantIds: "hMrWAFH0",
            homeParticipantNameUrl: "boca-juniors",
            homeName: "Boca Juniors",
            awayParticipantIds: "away123",
            awayParticipantNameUrl: "river-plate",
            awayName: "River Plate",
            homeScore: "2",
            awayScore: "1",
            winner: "1",
          },
        ];
      }
      if (tool === "flashscore_get_team_details") {
        return {
          id: "hMrWAFH0",
          teamName: "Boca Juniors",
          slug: "boca-juniors",
          teamLogo: "https://static.flashscore.com/res/image/data/h4UwH8Cr-pGZDw8HC.png",
          country: { name: "Argentina" },
          stadiumName: "Estadio Alberto J. Armando (Buenos Aires)",
          stadiumCapacity: 57200,
          squad: [{ players: [] }],
        };
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    await request(app).get("/api/teams/hMrWAFH0");
    await request(app).get("/api/teams/hMrWAFH0");

    const teamDetailsCalls = callSportDbTool.mock.calls.filter(
      ([tool]) => tool === "flashscore_get_team_details"
    );
    expect(teamDetailsCalls.length).toBe(1);
  });
});