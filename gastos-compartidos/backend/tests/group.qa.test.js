/**
 * H-001 — batería de @qa. Complementa tests/group.test.js (del dev, caso feliz).
 * Acá van los bordes: grupo vacío, orden, integridad referencial, formas de
 * respuesta, métodos no soportados y los hallazgos abiertos.
 *
 * Los tests marcados con `it.fails` son los HALLAZGOS de docs/qa-report.md:
 * el cuerpo del test afirma el comportamiento CORRECTO según specs/H-001.md y
 * hoy falla. Se dejan bajo `it.fails` para no romper la suite (ningún hallazgo
 * es bloqueante), pero si @dev arregla el bug el test grita
 * "expected to fail but passed" y hay que sacarle el `.fails`.
 * Para ver la falla real: sacá `.fails` y corré `npx vitest run tests/group.qa.test.js`.
 */
import { describe, it, expect, afterEach, vi } from "vitest";
import request from "supertest";
import { app } from "../src/app.js";
import { store } from "../src/store.js";
import { executeTool } from "../src/tools/handlers.js";
import { computeBalances } from "../src/domain/balances.js";

const EXPENSE_KEYS = ["amountCents", "description", "id", "paidBy", "splitBetween"];

afterEach(() => {
  store._reset();
});

describe("GET /api/group — bordes", () => {
  it("el objeto group tiene exactamente las claves id y name", async () => {
    const res = await request(app).get("/api/group");
    expect(Object.keys(res.body.group).sort()).toEqual(["id", "name"]);
  });

  it("la respuesta tiene exactamente las claves group y people", async () => {
    const res = await request(app).get("/api/group");
    expect(Object.keys(res.body).sort()).toEqual(["group", "people"]);
  });

  it("people respeta el orden de inserción del Map (ana, beto, caro)", async () => {
    const res = await request(app).get("/api/group");
    expect(res.body.people.map((p) => p.id)).toEqual(["ana", "beto", "caro"]);
  });

  it("no hay ids de persona duplicados", async () => {
    const res = await request(app).get("/api/group");
    const ids = res.body.people.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("responde application/json", async () => {
    const res = await request(app).get("/api/group");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("dos GET seguidos devuelven exactamente lo mismo (lectura pura)", async () => {
    const a = await request(app).get("/api/group");
    const b = await request(app).get("/api/group");
    expect(a.body).toEqual(b.body);
  });

  it("ignora query params y sigue respondiendo 200", async () => {
    const res = await request(app).get("/api/group?id=g99&foo=bar");
    expect(res.status).toBe(200);
    expect(res.body.group.id).toBe("g1");
  });

  it("con el grupo vacío devuelve people: [] y 200, nunca null ni 404", async () => {
    vi.resetModules();
    vi.doMock("../src/store.js", () => ({
      store: {
        group: { id: "g1", name: "Viaje a Bariloche" },
        listPeople: () => [],
        listExpenses: () => [],
        hasPerson: () => false,
      },
    }));
    const { app: emptyApp } = await import("../src/app.js");
    const res = await request(emptyApp).get("/api/group");
    expect(res.status).toBe(200);
    expect(res.body.people).toEqual([]);
    vi.doUnmock("../src/store.js");
    vi.resetModules();
  });
});

describe("GET /api/expenses — bordes", () => {
  it("la respuesta tiene exactamente la clave expenses", async () => {
    const res = await request(app).get("/api/expenses");
    expect(Object.keys(res.body)).toEqual(["expenses"]);
  });

  it("cada gasto semilla tiene exactamente las 5 claves del contrato", async () => {
    const res = await request(app).get("/api/expenses");
    for (const e of res.body.expenses) {
      expect(Object.keys(e).sort()).toEqual(EXPENSE_KEYS);
    }
  });

  it("expenses respeta el orden de inserción (e1, e2, e3)", async () => {
    const res = await request(app).get("/api/expenses");
    expect(res.body.expenses.map((e) => e.id)).toEqual(["e1", "e2", "e3"]);
  });

  it("ningún amountCents es 0, negativo, float ni string", async () => {
    const res = await request(app).get("/api/expenses");
    for (const e of res.body.expenses) {
      expect(typeof e.amountCents).toBe("number");
      expect(Number.isInteger(e.amountCents)).toBe(true);
      expect(e.amountCents).toBeGreaterThan(0);
      expect(String(e.amountCents)).not.toContain(".");
    }
  });

  it("ningún número de la respuesta tiene decimales (D-2)", async () => {
    const res = await request(app).get("/api/expenses");
    const walk = (v) => {
      if (typeof v === "number") expect(Number.isInteger(v)).toBe(true);
      else if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") Object.values(v).forEach(walk);
    };
    walk(res.body);
  });

  it("integridad referencial: paidBy y splitBetween existen en people", async () => {
    const group = await request(app).get("/api/group");
    const known = new Set(group.body.people.map((p) => p.id));
    const res = await request(app).get("/api/expenses");
    for (const e of res.body.expenses) {
      expect(known.has(e.paidBy)).toBe(true);
      for (const id of e.splitBetween) expect(known.has(id)).toBe(true);
    }
  });

  it("splitBetween nunca está vacío ni tiene ids repetidos", async () => {
    const res = await request(app).get("/api/expenses");
    for (const e of res.body.expenses) {
      expect(Array.isArray(e.splitBetween)).toBe(true);
      expect(e.splitBetween.length).toBeGreaterThan(0);
      expect(new Set(e.splitBetween).size).toBe(e.splitBetween.length);
    }
  });

  it("no hay ids de gasto duplicados", async () => {
    const res = await request(app).get("/api/expenses");
    const ids = res.body.expenses.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("los balances de los datos semilla suman exactamente 0 centavos", async () => {
    const group = await request(app).get("/api/group");
    const res = await request(app).get("/api/expenses");
    const balances = computeBalances(group.body.people, res.body.expenses);
    const total = Object.values(balances).reduce(
      (acc, b) => acc + (typeof b === "number" ? b : b.balanceCents ?? 0),
      0,
    );
    expect(total).toBe(0);
  });

  it("la suma de los gastos coincide con la suma de lo pagado", async () => {
    const res = await request(app).get("/api/expenses");
    const total = res.body.expenses.reduce((a, e) => a + e.amountCents, 0);
    expect(total).toBe(120000 + 45000 + 33000);
    expect(Number.isInteger(total)).toBe(true);
  });

  it("sin gastos devuelve { expenses: [] } con 200, no un error", async () => {
    vi.resetModules();
    vi.doMock("../src/store.js", () => ({
      store: {
        group: { id: "g1", name: "Viaje a Bariloche" },
        listPeople: () => [],
        listExpenses: () => [],
        hasPerson: () => false,
      },
    }));
    const { app: emptyApp } = await import("../src/app.js");
    const res = await request(emptyApp).get("/api/expenses");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ expenses: [] });
    vi.doUnmock("../src/store.js");
    vi.resetModules();
  });

  it("refleja un gasto agregado por el asistente (no cachea la lista)", async () => {
    executeTool("add_expense", {
      description: "Peaje",
      amountCents: 1000,
      paidBy: "ana",
      splitBetween: ["ana", "beto"],
    });
    const res = await request(app).get("/api/expenses");
    expect(res.body.expenses).toHaveLength(4);
    expect(res.body.expenses.at(-1)).toEqual({
      id: "e4",
      description: "Peaje",
      amountCents: 1000,
      paidBy: "ana",
      splitBetween: ["ana", "beto"],
    });
  });
});

describe("H-001 no adelanta verbos de otras historias", () => {
  it("POST /api/expenses todavía no existe (es H-003)", async () => {
    const res = await request(app).post("/api/expenses").send({ description: "x" });
    expect(res.status).toBe(404);
  });

  it("DELETE /api/expenses/e1 todavía no existe (es H-004)", async () => {
    const res = await request(app).delete("/api/expenses/e1");
    expect(res.status).toBe(404);
  });

  it("POST /api/group responde 404", async () => {
    const res = await request(app).post("/api/group").send({});
    expect(res.status).toBe(404);
  });

  it("POST /api/people todavía no existe (es H-002)", async () => {
    const res = await request(app).post("/api/people").send({ name: "Dani" });
    expect(res.status).toBe(404);
  });

  it("GET /api/balances todavía no existe (es H-005)", async () => {
    const res = await request(app).get("/api/balances");
    expect(res.status).toBe(404);
  });

  it("no hay alias /api/groups en plural (D-1)", async () => {
    const res = await request(app).get("/api/groups");
    expect(res.status).toBe(404);
  });

  it("las rutas previas siguen vivas (piso irrenunciable)", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

// ---------------------------------------------------------------------------
// HALLAZGOS — ver docs/qa-report.md. Cada uno afirma lo correcto y hoy falla.
// ---------------------------------------------------------------------------

describe("hallazgos abiertos (rojos por construcción)", () => {
  it.fails("[B-1] GET /api/group con body JSON inválido debería seguir dando 200", async () => {
    // specs/H-001.md §1: "Ambas rutas son lecturas sin parámetros y siempre
    // devuelven 200." express.json() está montado global y parsea el body de
    // CUALQUIER método: un GET con Content-Type json y body roto corta en 400.
    const res = await request(app)
      .get("/api/group")
      .set("Content-Type", "application/json")
      .send("{roto");
    expect(res.status).toBe(200);
  });

  it.fails("[B-1b] el 400 de body inválido no respeta la forma de error {error, code}", async () => {
    // El tablero fija: todo error responde { error, code }. Este responde HTML.
    const res = await request(app)
      .get("/api/expenses")
      .set("Content-Type", "application/json")
      .send("{roto");
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(res.body).toHaveProperty("code");
  });

  it.fails("[B-2] la respuesta no debería exponer los objetos internos del store", async () => {
    // specs/H-001.md §4 (Riesgos): "listExpenses() devuelve referencias al objeto
    // guardado; un consumidor podría mutarlas". Queda demostrado: mutar el array
    // devuelto por el store contamina la respuesta HTTP y _reset() no lo repara.
    const leaked = store.listExpenses()[0];
    try {
      leaked.splitBetween.push("fantasma");
      leaked.amountCents = 999999;
      const res = await request(app).get("/api/expenses");
      expect(res.body.expenses[0].splitBetween).toEqual(["ana", "beto", "caro"]);
      expect(res.body.expenses[0].amountCents).toBe(120000);
    } finally {
      leaked.splitBetween = ["ana", "beto", "caro"];
      leaked.amountCents = 120000;
    }
  });

  it.fails("[B-3] todo gasto devuelto debe tener las 5 claves, aun los que agrega el asistente", async () => {
    // handlers.add_expense no valida `description`: entra undefined, el store lo
    // guarda y GET /api/expenses devuelve un gasto con 4 claves, fuera del
    // contrato de §1. Alcanzable por HTTP vía POST /api/ask.
    executeTool("add_expense", { amountCents: 500, paidBy: "ana", splitBetween: ["ana"] });
    const res = await request(app).get("/api/expenses");
    for (const e of res.body.expenses) {
      expect(Object.keys(e).sort()).toEqual(EXPENSE_KEYS);
    }
  });

  it.fails("[B-4] un gasto agregado por el asistente no debería repetir personas en splitBetween", async () => {
    // handlers.add_expense acepta splitBetween: ["ana","ana"]; GET /api/expenses
    // lo publica y computeBalances le cobra dos veces a la misma persona.
    executeTool("add_expense", {
      description: "doble",
      amountCents: 1000,
      paidBy: "ana",
      splitBetween: ["ana", "ana"],
    });
    const res = await request(app).get("/api/expenses");
    for (const e of res.body.expenses) {
      expect(new Set(e.splitBetween).size).toBe(e.splitBetween.length);
    }
  });
});
