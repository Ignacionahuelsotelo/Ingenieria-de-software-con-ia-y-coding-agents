/**
 * PROMPTS: la tercera primitiva de MCP.
 *
 * Ni el modelo ni la aplicacion los disparan: los elige el USUARIO. En Claude
 * Code aparecen como slash commands del servidor. Son plantillas de consulta
 * que el servidor ofrece porque sabe qué preguntas tienen sentido sobre sus datos.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export function registrarPrompts(server: McpServer): void {
  server.registerPrompt(
    "informe-diario",
    {
      title: "Informe diario de monitoreo",
      description: "Arma el informe del día sobre todas las regiones monitoreadas.",
      argsSchema: { dias: z.string().optional().describe("ventana en días, default 7") },
    },
    ({ dias }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            `Prepará el informe de monitoreo sísmico de los últimos ${dias ?? 7} días.\n\n` +
            `1. Mirá qué regiones están en la watchlist.\n` +
            `2. Para cada una, traé la actividad reciente.\n` +
            `3. Cerrá con el informe en prosa.\n\n` +
            `Terminá diciendo si alguna región merece atención especial y por qué.`,
        },
      }],
    }),
  );

  server.registerPrompt(
    "analizar-region",
    {
      title: "Analizar una región",
      description: "Análisis completo de una región: datos crudos más explicación en lenguaje llano.",
      argsSchema: {
        region: z.string().describe("id o nombre de región, ej: 'chile'"),
        dias: z.string().optional().describe("ventana en días, default 30"),
      },
    },
    ({ region, dias }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            `Analizá la actividad sísmica de ${region} en los últimos ${dias ?? 30} días.\n\n` +
            `Traé los datos crudos, después la explicación en lenguaje llano, y decime si ` +
            `vale la pena poner esta región bajo seguimiento.`,
        },
      }],
    }),
  );

  server.registerPrompt(
    "comparar-regiones",
    {
      title: "Comparar dos regiones",
      description: "Compara la actividad sísmica de dos regiones en la misma ventana.",
      argsSchema: {
        regionA: z.string().describe("primera región"),
        regionB: z.string().describe("segunda región"),
      },
    },
    ({ regionA, regionB }) => ({
      messages: [{
        role: "user" as const,
        content: {
          type: "text" as const,
          text:
            `Compará la actividad sísmica de ${regionA} y ${regionB} en los últimos 30 días.\n\n` +
            `Buscá las dos, poné los números lado a lado (cantidad, magnitud máxima, ` +
            `profundidad típica) y explicá a qué se debe la diferencia.`,
        },
      }],
    }),
  );
}
