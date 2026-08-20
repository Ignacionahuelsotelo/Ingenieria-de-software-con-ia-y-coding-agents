/**
 * Cliente del modelo abierto (gpt-oss por defecto, vía Ollama).
 * Endpoint OpenAI-compatible: sirve igual para Ollama, Groq u OpenRouter.
 *
 * Que un MCP server llame a un LLM es el caso que menos se ve y el que más
 * sorprende: el servidor no solo devuelve datos, también razona sobre ellos.
 */
import { LLM_BASE_URL, LLM_MODEL, LLM_API_KEY } from "../constants.js";
import { paso } from "../log.js";

export async function completar(system: string, user: string): Promise<string> {
  paso(`POST ${LLM_BASE_URL}/chat/completions  (${LLM_MODEL})`);

  const res = await fetch(`${LLM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LLM_API_KEY}` },
    body: JSON.stringify({
      model: LLM_MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.3,
      max_tokens: 700,
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => "");
    throw new Error(
      `El modelo respondió ${res.status}. ¿Está corriendo 'ollama serve' y bajaste el modelo ` +
      `con 'ollama pull ${LLM_MODEL}'? ${detalle.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const texto = data.choices?.[0]?.message?.content?.trim();
  if (!texto) throw new Error("El modelo devolvió una respuesta vacía.");
  return texto;
}
