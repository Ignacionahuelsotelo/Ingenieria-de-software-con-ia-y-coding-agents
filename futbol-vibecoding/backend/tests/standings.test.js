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

describe("GET /api/standings", () => {
  it("400s for an unknown league slug", async () => {
    const res = await request(app).get("/api/standings?league=nope");
    expect(res.status).toBe(400);
  });

  it("resolves the active season, fetches standings and maps them to a simplified DTO", async () => {
    callSportDbTool.mockImplementation(async (tool) => {
      if (tool === "flashscore_list_competition_seasons") {
        return [{ season: "2025-2026" }];
      }
      if (tool === "flashscore_get_competition_standings") {
        return [
          {
            rank: "1",
            teamId: "hA1Zm19f",
            teamName: "Arsenal",
            matches: "38",
            wins: "26",
            draws: "7",
            lossesRegular: "5",
            goals: "71:27",
            goalDiff: "44",
            points: "85",
            events: [{ eventType: "w" }, { eventType: "d" }],
          },
        ];
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    const res = await request(app).get("/api/standings?league=premier-league");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        rank: 1,
        teamId: "hA1Zm19f",
        teamName: "Arsenal",
        played: 38,
        wins: 26,
        draws: 7,
        losses: 5,
        goalsFor: 71,
        goalsAgainst: 27,
        goalDiff: 44,
        points: 85,
        form: ["w", "d"],
      },
    ]);
  });

  it("caches standings and only calls the MCP tool once for repeated requests", async () => {
    callSportDbTool.mockImplementation(async (tool) => {
      if (tool === "flashscore_list_competition_seasons") return [{ season: "2025-2026" }];
      if (tool === "flashscore_get_competition_standings") return [];
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    await request(app).get("/api/standings?league=premier-league");
    await request(app).get("/api/standings?league=premier-league");

    const standingsCalls = callSportDbTool.mock.calls.filter(
      ([tool]) => tool === "flashscore_get_competition_standings"
    );
    expect(standingsCalls.length).toBe(1);
  });

  it("returns 502 when the SportDB MCP call fails", async () => {
    callSportDbTool.mockRejectedValue(new Error("boom"));

    const res = await request(app).get("/api/standings?league=premier-league");

    expect(res.status).toBe(502);
  });
});
