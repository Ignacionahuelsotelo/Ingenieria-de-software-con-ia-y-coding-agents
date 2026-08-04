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
