/** Estado en memoria. Sin base de datos — el proyecto arranca sin infraestructura. */

const people = new Map([
  ["ana", { id: "ana", name: "Ana" }],
  ["beto", { id: "beto", name: "Beto" }],
  ["caro", { id: "caro", name: "Caro" }],
]);

const expenses = new Map([
  ["e1", { id: "e1", description: "Cabaña", amountCents: 120000, paidBy: "ana", splitBetween: ["ana", "beto", "caro"] }],
  ["e2", { id: "e2", description: "Nafta", amountCents: 45000, paidBy: "beto", splitBetween: ["ana", "beto", "caro"] }],
  ["e3", { id: "e3", description: "Asado", amountCents: 33000, paidBy: "caro", splitBetween: ["ana", "caro"] }],
]);

let nextId = 4;

export const store = {
  group: { id: "g1", name: "Viaje a Bariloche" },
  listPeople: () => [...people.values()],
  listExpenses: () => [...expenses.values()],
  hasPerson: (id) => people.has(id),

  addExpense({ description, amountCents, paidBy, splitBetween }) {
    const id = `e${nextId++}`;
    const expense = { id, description, amountCents, paidBy, splitBetween };
    expenses.set(id, expense);
    return expense;
  },

  /** Solo para tests: vuelve al estado inicial. */
  _reset() {
    for (const id of [...expenses.keys()]) if (!["e1", "e2", "e3"].includes(id)) expenses.delete(id);
    nextId = 4;
  },
};
