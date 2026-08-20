/** Tools que pegan contra la API publica del USGS. */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registrarTool } from "./registrar.js";
import { buscarSismos, obtenerSismo } from "../services/usgs.js";
import { REGIONES, buscarRegion } from "../constants.js";

const haceDias = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString();

export function registrarToolsSismos(server: McpServer): void {
  registrarTool(server, "sismo_listar_regiones", "MCP", {
    title: "Listar regiones soportadas",
    description:
      "Devuelve las regiones que el servidor sabe convertir a coordenadas (Chile, Japón, " +
      "California...). Usar cuando el usuario nombra un país o zona y necesitás su id, " +
      "o cuando pregunta qué regiones se pueden consultar.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => ({
    resumen: `${REGIONES.length} regiones`,
    datos: { regiones: REGIONES },
  }));

  registrarTool(server, "sismo_buscar", "API", {
    title: "Buscar sismos",
    description:
      "Busca sismos en la base del USGS filtrando por región, magnitud mínima y ventana de " +
      "días hacia atrás. Es la tool principal: usala para '¿hubo sismos en X?', '¿tembló " +
      "fuerte esta semana?' o cualquier consulta sobre actividad sísmica reciente.",
    inputSchema: {
      region: z.string().optional().describe("id o nombre de región, ej: 'chile'. Omitir para búsqueda global"),
      magnitudMinima: z.number().min(0).max(10).optional().describe("magnitud mínima, ej: 5.0"),
      dias: z.number().int().min(1).max(365).optional().describe("cuántos días hacia atrás mirar (default 7)"),
      limite: z.number().int().min(1).max(200).optional().describe("máximo de resultados (default 20)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ region, magnitudMinima, dias, limite }) => {
    let coords = {};
    let etiqueta = "global";
    if (region) {
      const r = buscarRegion(region);
      if (!r) {
        throw new Error(
          `Región '${region}' desconocida. Usá sismo_listar_regiones para ver las disponibles.`,
        );
      }
      coords = { lat: r.lat, lon: r.lon, radioKm: r.radioKm };
      etiqueta = r.nombre;
    }
    const sismos = await buscarSismos({
      ...coords,
      desde: haceDias(dias ?? 7),
      magnitudMinima,
      limite: limite ?? 20,
    });
    return {
      resumen: `${sismos.length} sismos en ${etiqueta}`,
      datos: { region: etiqueta, ventanaDias: dias ?? 7, cantidad: sismos.length, sismos },
    };
  });

  registrarTool(server, "sismo_detalle", "API", {
    title: "Detalle de un sismo",
    description:
      "Devuelve el detalle completo de un sismo por su id del USGS (ej: 'us7000abcd'). " +
      "Usar después de sismo_buscar cuando el usuario pregunta por un evento puntual.",
    inputSchema: { eventoId: z.string().describe("id del evento en el USGS") },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ eventoId }) => {
    const sismo = await obtenerSismo(eventoId);
    if (!sismo) throw new Error(`No existe un sismo con id '${eventoId}'.`);
    return { resumen: `M${sismo.magnitud} · ${sismo.lugar}`, datos: sismo };
  });
}
