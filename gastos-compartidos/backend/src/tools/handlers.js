/**
 * LO QUE CLAUDE **NO** VE: la implementación.
 *
 * El modelo pide `{"name": "get_balances", "input": {}}`. Nosotros ejecutamos.
 * Esa separación es todo el concepto de tool use: el modelo decide QUÉ hacer,
 * nuestro código decide CÓMO y si tiene permiso.
 */
import { store } from "../store.js";
import { computeBalances, simplifyDebts } from "../domain/balances.js";

/** Tools que solo leen. Seguras de ejecutar sin preguntar. */
const READ_ONLY = new Set(["list_people", "list_expenses", "get_balances", "settle_up"]);

export function isReadOnly(name) {
  return READ_ONLY.has(name);
}

const handlers = {
  list_people: () => ({ people: store.listPeople() }),

  list_expenses: () => ({ expenses: store.listExpenses() }),

  get_balances: () => ({
    balances: computeBalances(store.listPeople(), store.listExpenses()),
  }),

  settle_up: () => {
    const balances = computeBalances(store.listPeople(), store.listExpenses());
    return { transfers: simplifyDebts(balances) };
  },

  add_expense: ({ description, amountCents, paidBy, splitBetween }) => {
    // El modelo puede mandar cualquier cosa. Validamos SIEMPRE del lado nuestro.
    if (!Number.isInteger(amountCents) || amountCents <= 0) {
      throw new Error("amountCents debe ser un entero positivo (en centavos)");
    }
    if (!store.hasPerson(paidBy)) {
      throw new Error(`No existe la persona '${paidBy}'`);
    }
    if (!Array.isArray(splitBetween) || splitBetween.length === 0) {
      throw new Error("splitBetween debe tener al menos una persona");
    }
    for (const id of splitBetween) {
      if (!store.hasPerson(id)) throw new Error(`No existe la persona '${id}'`);
    }
    return { expense: store.addExpense({ description, amountCents, paidBy, splitBetween }) };
  },
};

/**
 * Ejecuta una tool y devuelve SIEMPRE un tool_result, incluso si falló.
 * Un error devuelto como resultado deja que el modelo se recupere;
 * una excepción que sube corta la conversación entera.
 */
export function executeTool(name, input) {
  const handler = handlers[name];
  if (!handler) {
    return { content: `Herramienta desconocida: ${name}`, is_error: true };
  }
  try {
    return { content: JSON.stringify(handler(input ?? {})), is_error: false };
  } catch (err) {
    return { content: `Error: ${err.message}`, is_error: true };
  }
}
