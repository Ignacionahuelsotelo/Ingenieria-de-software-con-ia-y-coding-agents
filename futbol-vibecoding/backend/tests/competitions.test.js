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

describe("GET /api/competitions", () => {
  it("returns every configured league with its active season", async () => {
    callSportDbTool.mockImplementation(async (tool) => {
      if (tool === "flashscore_list_competition_seasons") return [{ season: "2025-2026" }];
      throw new Error(`Unexpected tool call: ${tool}`);
    });

    const res = await request(app).get("/api/competitions");

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(6);
    expect(res.body).toContainEqual({
      id: "premier-league",
      name: "Premier League",
      country: "England",
      season: "2025-2026",
      logoUrl: null,
    });
  });

  it("returns 502 when the SportDB MCP call fails", async () => {
    callSportDbTool.mockRejectedValue(new Error("boom"));

    const res = await request(app).get("/api/competitions");

    expect(res.status).toBe(502);
  });
});
