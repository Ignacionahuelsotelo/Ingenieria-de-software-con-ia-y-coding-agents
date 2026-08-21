import { describe, it, expect } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";

describe("GET /api/group", () => {
  it("responde 200", async () => {
    const res = await request(app).get("/api/group");
    expect(res.status).toBe(200);
  });

  it("devuelve el grupo con id g1 y su nombre", async () => {
    const res = await request(app).get("/api/group");
    expect(res.body.group.id).toBe("g1");
    expect(res.body.group.name).toBe("Viaje a Bariloche");
  });

  it("devuelve 3 personas", async () => {
    const res = await request(app).get("/api/group");
    expect(res.body.people).toHaveLength(3);
  });

  it("cada persona tiene id y name como strings no vacíos", async () => {
    const res = await request(app).get("/api/group");
    for (const person of res.body.people) {
      expect(Object.keys(person).sort()).toEqual(["id", "name"]);
      expect(typeof person.id).toBe("string");
      expect(person.id.length).toBeGreaterThan(0);
      expect(typeof person.name).toBe("string");
      expect(person.name.length).toBeGreaterThan(0);
    }
  });
});

describe("GET /api/expenses", () => {
  it("responde 200", async () => {
    const res = await request(app).get("/api/expenses");
    expect(res.status).toBe(200);
  });

  it("devuelve 3 gastos", async () => {
    const res = await request(app).get("/api/expenses");
    expect(res.body.expenses).toHaveLength(3);
  });

  it("el gasto e1 tiene la forma esperada", async () => {
    const res = await request(app).get("/api/expenses");
    const e1 = res.body.expenses.find((e) => e.id === "e1");
    expect(e1).toEqual({
      id: "e1",
      description: "Cabaña",
      amountCents: 120000,
      paidBy: "ana",
      splitBetween: ["ana", "beto", "caro"],
    });
  });

  it("todo amountCents es un entero", async () => {
    const res = await request(app).get("/api/expenses");
    for (const expense of res.body.expenses) {
      expect(Number.isInteger(expense.amountCents)).toBe(true);
    }
  });

  it("expenses es un array", async () => {
    const res = await request(app).get("/api/expenses");
    expect(Array.isArray(res.body.expenses)).toBe(true);
  });
});
