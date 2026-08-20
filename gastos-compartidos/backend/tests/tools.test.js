import { describe, it, expect, beforeEach } from "vitest";
import { executeTool, isReadOnly } from "../src/tools/handlers.js";
import { toolDefinitions } from "../src/tools/definitions.js";
import { store } from "../src/store.js";

beforeEach(() => store._reset());

describe("definiciones de tools", () => {
  it("toda tool tiene nombre, descripción y schema de objeto", () => {
    for (const t of toolDefinitions) {
      expect(t.name).toBeTruthy();
      expect(t.description.length).toBeGreaterThan(40);
      expect(t.input_schema.type).toBe("object");
    }
  });

  it("los nombres son únicos", () => {
    const names = toolDefinitions.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("executeTool", () => {
  it("get_balances devuelve JSON parseable", () => {
    const r = executeTool("get_balances", {});
    expect(r.is_error).toBe(false);
    expect(JSON.parse(r.content).balances).toHaveLength(3);
  });

  it("una tool desconocida devuelve error, no explota", () => {
    const r = executeTool("borrar_todo", {});
    expect(r.is_error).toBe(true);
  });

  it("add_expense rechaza montos no enteros en vez de guardarlos", () => {
    const r = executeTool("add_expense", {
      description: "Test", amountCents: 10.5, paidBy: "ana", splitBetween: ["ana"],
    });
    expect(r.is_error).toBe(true);
    expect(store.listExpenses()).toHaveLength(3);
  });

  it("add_expense rechaza personas inexistentes", () => {
    const r = executeTool("add_expense", {
      description: "Test", amountCents: 1000, paidBy: "fulano", splitBetween: ["ana"],
    });
    expect(r.is_error).toBe(true);
  });

  it("add_expense válido agrega el gasto", () => {
    const r = executeTool("add_expense", {
      description: "Supermercado", amountCents: 25000, paidBy: "beto", splitBetween: ["ana", "beto"],
    });
    expect(r.is_error).toBe(false);
    expect(store.listExpenses()).toHaveLength(4);
  });

  it("marca correctamente qué tools son de solo lectura", () => {
    expect(isReadOnly("get_balances")).toBe(true);
    expect(isReadOnly("add_expense")).toBe(false);
  });
});
