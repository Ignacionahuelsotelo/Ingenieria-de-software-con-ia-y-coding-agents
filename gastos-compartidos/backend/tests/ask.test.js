import { describe, it, expect, vi } from "vitest";

// Mockeamos el loop: los tests NO llaman a la API de Anthropic.
vi.mock("../src/tools/loop.js", () => ({ ask: vi.fn() }));

import request from "supertest";
import { app } from "../src/app.js";
import { ask } from "../src/tools/loop.js";


describe("POST /api/ask", () => {
  it("devuelve la respuesta del asistente", async () => {
    vi.mocked(ask).mockResolvedValue({ answer: "Beto le debe $100,00 a Ana." });
    const res = await request(app).post("/api/ask").send({ question: "¿quién debe?" });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ answer: "Beto le debe $100,00 a Ana." });
  });

  it("rechaza si falta question", async () => {
    const res = await request(app).post("/api/ask").send({});
    expect(res.status).toBe(400);
  });

  it("rechaza question vacía", async () => {
    const res = await request(app).post("/api/ask").send({ question: "   " });
    expect(res.status).toBe(400);
  });

  it("rechaza history que no es array", async () => {
    const res = await request(app).post("/api/ask").send({ question: "hola", history: "nope" });
    expect(res.status).toBe(400);
  });

  it("pasa el history al loop en orden", async () => {
    vi.mocked(ask).mockResolvedValue({ answer: "ok" });
    const history = [{ role: "user", content: "hola" }, { role: "assistant", content: "¡hola!" }];
    await request(app).post("/api/ask").send({ question: "¿y ahora?", history });
    expect(vi.mocked(ask).mock.calls.at(-1)[1]).toEqual(history);
  });

  it("por defecto NO habilita las tools de escritura", async () => {
    vi.mocked(ask).mockResolvedValue({ answer: "ok" });
    await request(app).post("/api/ask").send({ question: "hola" });
    expect(vi.mocked(ask).mock.calls.at(-1)[2]).toEqual({ allowWrites: false });
  });

  it("devuelve 503 si falta la API key", async () => {
    const err = new Error("Falta ANTHROPIC_API_KEY");
    err.code = "NOT_CONFIGURED";
    vi.mocked(ask).mockImplementation(async () => { throw err; });
    const res = await request(app).post("/api/ask").send({ question: "hola" });
    expect(res.status).toBe(503);
  });

  it("devuelve 502 ante un error genérico", async () => {
    vi.mocked(ask).mockImplementation(async () => { throw new Error("boom"); });
    const res = await request(app).post("/api/ask").send({ question: "hola" });
    expect(res.status).toBe(502);
  });
});
