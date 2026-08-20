import { describe, it, expect } from "vitest";
import { splitCents, computeBalances, simplifyDebts } from "../src/domain/balances.js";
import { store } from "../src/store.js";

describe("splitCents", () => {
  it("divide exacto cuando el monto es divisible", () => {
    expect(splitCents(120000, 3)).toEqual([40000, 40000, 40000]);
  });

  it("reparte el resto de a un centavo, sin perder ni inventar plata", () => {
    const shares = splitCents(10, 3);
    expect(shares).toEqual([4, 3, 3]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("rechaza montos no enteros", () => {
    expect(() => splitCents(10.5, 2)).toThrow();
  });
});

describe("computeBalances", () => {
  const people = store.listPeople();
  const expenses = store.listExpenses();

  it("calcula el neto de cada persona", () => {
    const balances = computeBalances(people, expenses);
    const byId = Object.fromEntries(balances.map((b) => [b.personId, b.balanceCents]));
    expect(byId.ana).toBe(48500);
    expect(byId.beto).toBe(-10000);
    expect(byId.caro).toBe(-38500);
  });

  it("la suma de todos los balances es exactamente cero", () => {
    const total = computeBalances(people, expenses).reduce((a, b) => a + b.balanceCents, 0);
    expect(total).toBe(0);
  });
});

describe("simplifyDebts", () => {
  it("salda todo con la menor cantidad de transferencias", () => {
    const balances = computeBalances(store.listPeople(), store.listExpenses());
    const transfers = simplifyDebts(balances);
    expect(transfers).toHaveLength(2);
    for (const t of transfers) expect(t.to).toBe("Ana");
    const total = transfers.reduce((a, t) => a + t.amountCents, 0);
    expect(total).toBe(48500);
  });

  it("no genera transferencias si ya está todo saldado", () => {
    expect(simplifyDebts([{ personId: "x", name: "X", balanceCents: 0 }])).toEqual([]);
  });
});
