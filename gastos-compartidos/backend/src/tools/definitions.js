/**
 * LO QUE CLAUDE VE.
 *
 * Esto es todo lo que el modelo sabe de nuestras herramientas: un nombre, una
 * descripción y un JSON Schema. No ve el código que las implementa.
 *
 * La `description` es la parte que más influye en si la tool se usa bien o mal.
 * Escribila diciendo CUÁNDO llamarla, no solo qué hace.
 */
export const toolDefinitions = [
  {
    name: "list_people",
    description:
      "Devuelve las personas del grupo con su id y su nombre. Usar cuando el " +
      "usuario menciona a alguien por nombre y necesitás su id, o cuando pregunta " +
      "quiénes están en el grupo.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "list_expenses",
    description:
      "Devuelve todos los gastos cargados: descripción, monto en centavos, quién " +
      "pagó y entre quiénes se divide. Usar cuando el usuario pregunta por gastos " +
      "concretos, cuánto costó algo, o quién pagó qué.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "get_balances",
    description:
      "Devuelve el balance neto de cada persona en centavos. Positivo significa " +
      "que le deben; negativo, que debe. Usar para responder '¿cuánto debo?', " +
      "'¿quién debe más?' o '¿estamos a mano?'.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "settle_up",
    description:
      "Devuelve la lista mínima de transferencias para que todos queden en cero. " +
      "Usar cuando el usuario pregunta cómo saldar las cuentas o quién le tiene " +
      "que transferir a quién.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "add_expense",
    description:
      "Carga un gasto nuevo en el grupo. MODIFICA EL ESTADO: usar solo cuando el " +
      "usuario pide explícitamente agregar un gasto, nunca para responder una " +
      "consulta. El monto va en centavos como entero (ej: $1.234,50 son 123450).",
    input_schema: {
      type: "object",
      properties: {
        description: { type: "string", description: "Qué se pagó, ej: 'Supermercado'" },
        amountCents: { type: "integer", description: "Monto total en centavos, entero positivo" },
        paidBy: { type: "string", description: "id de la persona que pagó" },
        splitBetween: {
          type: "array",
          items: { type: "string" },
          description: "ids de las personas entre las que se divide el gasto",
        },
      },
      required: ["description", "amountCents", "paidBy", "splitBetween"],
    },
  },
];
