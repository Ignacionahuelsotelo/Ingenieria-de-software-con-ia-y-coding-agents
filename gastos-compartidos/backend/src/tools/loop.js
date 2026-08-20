/**
 * EL LOOP DE TOOL USE, ESCRITO A MANO.
 *
 * El SDK trae un `tool_runner` que hace esto solo. Acá está manual A PROPÓSITO:
 * el objetivo es ver el ciclo, no esconderlo.
 *
 *   1. Mandamos la conversación + las definiciones de tools
 *   2. Si stop_reason === "tool_use", el modelo pidió una o más herramientas
 *   3. Ejecutamos cada una y devolvemos los tool_result
 *   4. Volvemos al paso 1
 *   5. Cuando stop_reason === "end_turn", el modelo terminó de razonar
 */
import Anthropic from "@anthropic-ai/sdk";
import { toolDefinitions } from "./definitions.js";
import { executeTool, isReadOnly } from "./handlers.js";

const MODEL = "claude-opus-5";
const MAX_ITERATIONS = 8;

const SYSTEM_PROMPT = `Sos el asistente de una app para dividir gastos entre amigos.

Respondés preguntas sobre los gastos del grupo usando exclusivamente las
herramientas disponibles. Nunca inventes montos, nombres ni balances: si no lo
obtuviste de una herramienta, no lo afirmes.

Reglas:
- Los montos vienen en CENTAVOS. Mostralos siempre en pesos, con dos decimales
  (ej: 48500 se muestra como $485,00).
- Un balance positivo significa que a esa persona le deben; negativo, que debe.
- Respondé en español rioplatense, en 1-3 oraciones. Sin markdown, sin listas
  salvo que la respuesta sea una enumeración de transferencias.
- Si la pregunta no es sobre los gastos del grupo, decilo y no uses herramientas.`;

/**
 * @param {string} question       la pregunta del usuario
 * @param {Array}  history        turnos previos [{role, content}]
 * @param {object} [opts]
 * @param {boolean} [opts.allowWrites=false]  si false, las tools que mutan estado se rechazan
 * @param {function} [opts.onEvent]           callback para observar el loop (clase/debug)
 */
export async function ask(question, history = [], opts = {}) {
  const { allowWrites = false, onEvent = () => {} } = opts;

  if (!process.env.ANTHROPIC_API_KEY) {
    const err = new Error("Falta ANTHROPIC_API_KEY");
    err.code = "NOT_CONFIGURED";
    throw err;
  }

  const client = new Anthropic();

  const messages = [
    ...history
      .filter((m) => m.content && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      tools: toolDefinitions,
      messages,
    });

    onEvent({ type: "response", stop_reason: response.stop_reason, usage: response.usage });

    if (response.stop_reason !== "tool_use") {
      const text = response.content
        .filter((b) => b.type === "text")
        .map((b) => b.text)
        .join("\n")
        .trim();
      return { answer: text || "No pude responder esa pregunta.", iterations: i + 1 };
    }

    // El turno del asistente vuelve COMPLETO, con sus bloques tool_use.
    // Si mandás solo el texto, perdés los ids y la próxima request explota.
    messages.push({ role: "assistant", content: response.content });

    const toolResults = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;

      onEvent({ type: "tool_use", name: block.name, input: block.input });

      // La baranda: el modelo puede PEDIR escribir, nosotros decidimos si dejamos.
      const result =
        !allowWrites && !isReadOnly(block.name)
          ? { content: `La herramienta '${block.name}' modifica datos y está deshabilitada en modo consulta.`, is_error: true }
          : executeTool(block.name, block.input);

      onEvent({ type: "tool_result", name: block.name, is_error: result.is_error });

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id, // tiene que coincidir con el id del tool_use
        content: result.content,
        ...(result.is_error ? { is_error: true } : {}),
      });
    }

    // TODOS los resultados van en UN SOLO mensaje de usuario.
    // Partirlos en varios le enseña al modelo a dejar de pedir tools en paralelo.
    messages.push({ role: "user", content: toolResults });
  }

  return {
    answer: "La consulta requirió demasiados pasos. Probá con una pregunta más específica.",
    iterations: MAX_ITERATIONS,
  };
}
