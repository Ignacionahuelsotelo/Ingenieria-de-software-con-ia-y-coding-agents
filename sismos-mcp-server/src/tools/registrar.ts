/**
 * Envoltorio unico para registrar tools.
 *
 * Cada tool declara DE DONDE saca los datos (`fuente`) y el envoltorio se
 * encarga del resto: cronometrar, loguear bonito en la terminal, mandar la
 * notificacion MCP al cliente, y convertir cualquier excepcion en un
 * resultado con `isError` — un error devuelto deja que el modelo se
 * recupere; una excepcion que sube corta la conversacion.
 */
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { ZodRawShape } from "zod";
import { abrirLlamada, cerrarLlamada, fallarLlamada, type Fuente } from "../log.js";

export interface Resultado {
  resumen: string;
  datos: unknown;
}

export function registrarTool<S extends ZodRawShape>(
  server: McpServer,
  nombre: string,
  fuente: Fuente,
  config: { title: string; description: string; inputSchema: S; annotations?: Record<string, boolean> },
  handler: (args: any) => Promise<Resultado>,
): void {
  server.registerTool(nombre, config as any, (async (args: any) => {
    const inicio = abrirLlamada(nombre, fuente, args ?? {});
    try {
      const { resumen, datos } = await handler(args ?? {});
      cerrarLlamada(inicio, resumen);
      server
        .sendLoggingMessage({ level: "info", logger: nombre, data: { fuente, resumen } })
        .catch(() => {});
      return { content: [{ type: "text" as const, text: JSON.stringify(datos, null, 2) }] };
    } catch (err) {
      const mensaje = err instanceof Error ? err.message : String(err);
      fallarLlamada(inicio, mensaje);
      server
        .sendLoggingMessage({ level: "error", logger: nombre, data: { fuente, error: mensaje } })
        .catch(() => {});
      return { content: [{ type: "text" as const, text: `Error: ${mensaje}` }], isError: true };
    }
  }) as any);
}
