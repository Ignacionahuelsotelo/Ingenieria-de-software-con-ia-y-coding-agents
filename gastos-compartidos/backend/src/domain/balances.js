/**
 * Reglas de negocio puras. Sin Express, sin SQL, sin Anthropic.
 * TODO el dinero es un entero en CENTAVOS. Nunca floats.
 */

/**
 * Divide un monto en centavos entre N personas sin perder ni inventar un centavo.
 * El resto se reparte de a un centavo entre los primeros, en orden.
 */
export function splitCents(amountCents, n) {
  if (!Number.isInteger(amountCents)) throw new Error("amountCents debe ser entero");
  if (n <= 0) throw new Error("n debe ser mayor a cero");
  const base = Math.floor(amountCents / n);
  const rest = amountCents - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rest ? 1 : 0));
}

/**
 * Balance neto por persona: lo que puso menos lo que le tocaba.
 * Positivo = le deben. Negativo = debe.
 * La suma de todos los balances es SIEMPRE exactamente 0.
 */
export function computeBalances(people, expenses) {
  const balance = new Map(people.map((p) => [p.id, 0]));

  for (const exp of expenses) {
    const shares = splitCents(exp.amountCents, exp.splitBetween.length);
    balance.set(exp.paidBy, balance.get(exp.paidBy) + exp.amountCents);
    exp.splitBetween.forEach((personId, i) => {
      balance.set(personId, balance.get(personId) - shares[i]);
    });
  }

  return people.map((p) => ({
    personId: p.id,
    name: p.name,
    balanceCents: balance.get(p.id),
  }));
}

/**
 * Lista mínima de transferencias para saldar todo.
 * Estrategia greedy: el que más debe le paga al que más le deben.
 */
export function simplifyDebts(balances) {
  const debtors = balances
    .filter((b) => b.balanceCents < 0)
    .map((b) => ({ ...b, remaining: -b.balanceCents }))
    .sort((a, b) => b.remaining - a.remaining);

  const creditors = balances
    .filter((b) => b.balanceCents > 0)
    .map((b) => ({ ...b, remaining: b.balanceCents }))
    .sort((a, b) => b.remaining - a.remaining);

  const transfers = [];
  let i = 0;
  let j = 0;

  while (i < debtors.length && j < creditors.length) {
    const amount = Math.min(debtors[i].remaining, creditors[j].remaining);
    if (amount > 0) {
      transfers.push({
        fromPersonId: debtors[i].personId,
        from: debtors[i].name,
        toPersonId: creditors[j].personId,
        to: creditors[j].name,
        amountCents: amount,
      });
    }
    debtors[i].remaining -= amount;
    creditors[j].remaining -= amount;
    if (debtors[i].remaining === 0) i++;
    if (creditors[j].remaining === 0) j++;
  }

  return transfers;
}
