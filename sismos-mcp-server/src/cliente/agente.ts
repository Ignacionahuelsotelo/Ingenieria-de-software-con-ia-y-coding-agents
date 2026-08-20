/**
 * EL AGENTE.
 *
 * Loop de tool use contra un modelo abierto, escrito a mano. Acá no hay
 * Claude, no hay SDK de Anthropic, no hay Claude Code: solo un endpoint
 * OpenAI-compatible y el protocolo MCP.
 *
 *   1. le mandamos la pregunta + las tools que expone el MCP
 *   2. el modelo responde con tool_calls  ← ACÁ ELIGE LA TOOL
 *   3. ejecutamos cada una contra el servidor MCP
 *   4. le devolvemos los resultados
 *   5. repetimos hasta que responda sin pedir tools
 */
import { LLM_BASE_URL, LLM_MODEL, LLM_API_KEY } from "../constants.js";
import type { ClienteSismos, ToolOpenAI } from "./mcp.js";

const MAX_VUELTAS = 6;

const SYSTEM = `Sos un asistente de monitoreo sísmico. Respondés SIEMPRE usando las
herramientas disponibles: nunca inventes magnitudes, fechas ni lugares.

Cómo trabajar:
- Si no conocés el id de una región, llamá primero a sismo_listar_regiones.
- Para "¿hubo sismos?" usá magnitudMinima 4.0; para "¿algo importante?", 5.5.
- Si el usuario pide una explicación o pregunta si algo es normal, usá sismo_explicar.
- Las tools que escriben (watchlist_agregar, watchlist_quitar, nota_agregar) solo
  se usan si el usuario lo pide explícitamente.

Respondé en español rioplatense, 2 a 4 oraciones, con las fechas y magnitudes
concretas que devolvieron las herramientas.`;

interface MensajeChat {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: Array<{ id: string; type: "function"; function: { name: string; arguments: string } }>;
  tool_call_id?: string;
}

export interface EventoAgente {
  tipo: "pensando" | "tool" | "resultado" | "respuesta" | "tools-listadas" | "request-llm";
  cantidadTools?: number;
  nombresTools?: string[];
  /** Una tool completa, ya traducida al formato que entiende el LLM. */
  ejemploTool?: string;
  /** El cuerpo real del POST al modelo, recortado. */
  cuerpoRequest?: string;
  endpoint?: string;
  tool?: string;
  args?: unknown;
  ms?: number;
  error?: boolean;
  texto?: string;
  /** Recorte de lo que devolvió la tool, para mostrar en la UI. */
  vistazo?: string;
}

async function chat(
  mensajes: MensajeChat[],
  tools: ToolOpenAI[],
  modelo: string,
  onEvento: (e: EventoAgente) => void = () => {},
): Promise<MensajeChat> {
  const cuerpo = { model: modelo, messages: mensajes, tools, tool_choice: "auto", temperature: 0.2 };

  // Lo que realmente sale por el cable, resumido para que se pueda leer:
  // las tools completas ocuparian miles de caracteres.
  onEvento({
    tipo: "request-llm",
    endpoint: `POST ${LLM_BASE_URL}/chat/completions`,
    cuerpoRequest: JSON.stringify(
      {
        model: cuerpo.model,
        tool_choice: cuerpo.tool_choice,
        temperature: cuerpo.temperature,
        tools: `[ ${tools.length} tools — ver arriba el formato ]`,
        messages: mensajes.map((m) =>
          m.tool_calls
            ? { role: m.role, tool_calls: m.tool_calls.map((t) => `${t.function.name}(${t.function.arguments})`) }
            : { role: m.role, content: String(m.content ?? "").replace(/\s+/g, " ").slice(0, 90) + "…" },
        ),
      },
      null,
      2,
    ),
  });

  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify(cuerpo),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(
      `El modelo respondió ${res.status}. ¿Corre 'ollama serve' y bajaste ` +
      `'${modelo}'? ${detalle.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as { choices?: Array<{ message?: MensajeChat }> };
  const msg = data.choices?.[0]?.message;
  if (!msg) throw new Error("El modelo devolvió una respuesta vacía.");
  return msg;
}

/**
 * Responde una pregunta en lenguaje natural.
 * `onEvento` permite ver el loop por dentro — es lo que dibuja la CLI.
 */
export async function responder(
  pregunta: string,
  mcp: ClienteSismos,
  onEvento: (e: EventoAgente) => void = () => {},
  modelo: string = LLM_MODEL,
): Promise<string> {
  const tools = await mcp.listarTools();
  onEvento({
    tipo: "tools-listadas",
    cantidadTools: tools.length,
    nombresTools: tools.map((t) => t.function.name),
    // Una tool entera, tal como la ve el modelo. Es la traduccion MCP → OpenAI.
    ejemploTool: JSON.stringify(tools.find((t) => t.function.name === "sismo_buscar") ?? tools[0], null, 2),
  });

  const mensajes: MensajeChat[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: pregunta },
  ];

  for (let vuelta = 0; vuelta < MAX_VUELTAS; vuelta++) {
    onEvento({ tipo: "pensando" });
    const respuesta = await chat(mensajes, tools, modelo, onEvento);

    // Sin tool_calls => el modelo terminó de razonar.
    if (!respuesta.tool_calls?.length) {
      const texto = respuesta.content?.trim() || "No pude responder esa pregunta.";
      onEvento({ tipo: "respuesta", texto });
      return texto;
    }

    // El turno del asistente vuelve completo, con sus tool_calls.
    mensajes.push(respuesta);

    for (const llamada of respuesta.tool_calls) {
      let args: Record<string, unknown> = {};
      try {
        args = llamada.function.arguments ? JSON.parse(llamada.function.arguments) : {};
      } catch {
        // El modelo mandó JSON roto: se lo devolvemos para que se corrija.
        mensajes.push({
          role: "tool",
          tool_call_id: llamada.id,
          content: `Error: los argumentos no son JSON válido: ${llamada.function.arguments}`,
        });
        continue;
      }

      onEvento({ tipo: "tool", tool: llamada.function.name, args });

      const t0 = Date.now();
      let salida: { texto: string; error: boolean };
      try {
        salida = await mcp.llamarTool(llamada.function.name, args);
      } catch (err) {
        salida = { texto: `Error: ${err instanceof Error ? err.message : String(err)}`, error: true };
      }

      // Recorte legible: es lo que el modelo va a leer, resumido para la pantalla.
      const vistazo = salida.texto.replace(/\s+/g, " ").trim().slice(0, 220);

      onEvento({
        tipo: "resultado",
        tool: llamada.function.name,
        ms: Date.now() - t0,
        error: salida.error,
        vistazo: vistazo + (salida.texto.length > 220 ? " …" : ""),
      });

      mensajes.push({ role: "tool", tool_call_id: llamada.id, content: salida.texto.slice(0, 12_000) });
    }
  }

  return "La consulta necesitó demasiados pasos. Probá con algo más específico.";
}
