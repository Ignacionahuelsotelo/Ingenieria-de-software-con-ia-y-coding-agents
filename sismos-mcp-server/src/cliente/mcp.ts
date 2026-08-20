/**
 * CLIENTE MCP.
 *
 * Se conecta al servidor por HTTP, le pregunta qué tools expone, y las traduce
 * al formato de function calling de OpenAI — que es el que entiende gpt-oss.
 *
 * Esa traducción es la bisagra de todo: MCP describe las tools con JSON Schema,
 * y OpenAI también. Son el mismo schema con otro envoltorio.
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

/** Forma de tool que entiende un endpoint OpenAI-compatible. */
export interface ToolOpenAI {
  type: "function";
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export class ClienteSismos {
  private client: Client;
  private conectado = false;

  constructor(private url: string) {
    this.client = new Client({ name: "cliente-sismos", version: "1.0.0" }, { capabilities: {} });
  }

  async conectar(): Promise<void> {
    if (this.conectado) return;
    await this.client.connect(new StreamableHTTPClientTransport(new URL(this.url)));
    this.conectado = true;
  }

  /** Lista las tools del servidor y las devuelve en formato OpenAI. */
  async listarTools(): Promise<ToolOpenAI[]> {
    const { tools } = await this.client.listTools();
    return tools.map((t) => ({
      type: "function" as const,
      function: {
        name: t.name,
        description: t.description ?? "",
        // El inputSchema de MCP YA es JSON Schema: pasa tal cual.
        parameters: (t.inputSchema as Record<string, unknown>) ?? { type: "object", properties: {} },
      },
    }));
  }

  /** Ejecuta una tool en el servidor y devuelve su salida como texto. */
  async llamarTool(nombre: string, args: Record<string, unknown>): Promise<{ texto: string; error: boolean }> {
    const r = await this.client.callTool({ name: nombre, arguments: args });
    const bloques = (r.content ?? []) as Array<{ type: string; text?: string }>;
    const texto = bloques.filter((b) => b.type === "text").map((b) => b.text ?? "").join("\n");
    return { texto, error: r.isError === true };
  }

  async cerrar(): Promise<void> {
    if (this.conectado) await this.client.close();
    this.conectado = false;
  }
}
