import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /api/leagues", () => {
  it("returns the curated list of supported leagues without hitting SportDB", async () => {
    const res = await request(app).get("/api/leagues");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(6);
    expect(res.body).toContainEqual({
      slug: "premier-league",
      name: "Premier League",
      country: "England",
    });
    expect(res.body[0]).not.toHaveProperty("competitionId");
  });
});
