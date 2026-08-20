/**
 * RESOURCES: la segunda primitiva de MCP.
 *
 * A diferencia de una tool (que el MODELO decide invocar), un resource lo lee
 * la APLICACION cliente cuando quiere, por URI. Sirve para datos que son
 * contexto, no acciones: el estado actual, un catalogo, un documento.
 */
import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { repo } from "./db.js";
import { REGIONES, buscarRegion } from "./constants.js";
import { buscarSismos } from "./services/usgs.js";
import { abrirLlamada, cerrarLlamada } from "./log.js";

export function registrarRecursos(server: McpServer): void {
  // Recurso fijo: el estado del monitoreo, leible de una.
  server.registerResource(
    "watchlist",
    "sismos://watchlist",
    {
      title: "Regiones monitoreadas",
      description: "Estado actual del seguimiento: qué regiones se monitorean y con qué umbral.",
      mimeType: "application/json",
    },
    async (uri) => {
      const inicio = abrirLlamada("resource:watchlist", "DB", { uri: uri.href });
      const filas = repo.listarWatchlist();
      cerrarLlamada(inicio, `${filas.length} regiones`);
      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ watchlist: filas }, null, 2) }],
      };
    },
  );

  // Recurso fijo: el catalogo de regiones soportadas.
  server.registerResource(
    "regiones",
    "sismos://regiones",
    {
      title: "Catálogo de regiones",
      description: "Regiones que el servidor sabe traducir a coordenadas.",
      mimeType: "application/json",
    },
    async (uri) => {
      const inicio = abrirLlamada("resource:regiones", "MCP", { uri: uri.href });
      cerrarLlamada(inicio, `${REGIONES.length} regiones`);
      return {
        contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ regiones: REGIONES }, null, 2) }],
      };
    },
  );

  // Recurso con plantilla: una URI por region, resuelta en vivo contra la API.
  server.registerResource(
    "region",
    new ResourceTemplate("sismos://region/{regionId}", {
      list: async () => ({
        resources: REGIONES.map((r) => ({
          uri: `sismos://region/${r.id}`,
          name: r.nombre,
          description: `Actividad sísmica de los últimos 7 días en ${r.nombre}`,
          mimeType: "application/json",
        })),
      }),
    }),
    {
      title: "Actividad por región",
      description: "Resumen de los últimos 7 días de una región, en vivo desde el USGS.",
      mimeType: "application/json",
    },
    async (uri, variables) => {
      const regionId = String(variables.regionId);
      const inicio = abrirLlamada("resource:region", "API", { regionId });
      const r = buscarRegion(regionId);
      if (!r) {
        cerrarLlamada(inicio, "región desconocida");
        return {
          contents: [{ uri: uri.href, mimeType: "application/json", text: JSON.stringify({ error: `Región '${regionId}' desconocida` }) }],
        };
      }
      const sismos = await buscarSismos({
        lat: r.lat, lon: r.lon, radioKm: r.radioKm,
        desde: new Date(Date.now() - 7 * 86_400_000).toISOString(),
        limite: 25,
      });
      cerrarLlamada(inicio, `${sismos.length} sismos en ${r.nombre}`);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: JSON.stringify({ region: r.nombre, ventanaDias: 7, cantidad: sismos.length, sismos }, null, 2),
        }],
      };
    },
  );
}
