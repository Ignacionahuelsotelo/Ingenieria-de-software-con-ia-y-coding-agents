/** Tools que pegan contra la base de datos local (SQLite). */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registrarTool } from "./registrar.js";
import { repo } from "../db.js";
import { buscarRegion } from "../constants.js";

export function registrarToolsWatchlist(server: McpServer): void {
  registrarTool(server, "watchlist_listar", "DB", {
    title: "Ver regiones monitoreadas",
    description:
      "Devuelve las regiones que el usuario tiene bajo seguimiento, con su umbral de " +
      "magnitud. Usar para '¿qué estoy monitoreando?' o antes de un informe, para saber " +
      "sobre qué regiones reportar.",
    inputSchema: {},
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async () => {
    const filas = repo.listarWatchlist();
    return { resumen: `${filas.length} regiones monitoreadas`, datos: { watchlist: filas } };
  });

  registrarTool(server, "watchlist_agregar", "DB", {
    title: "Monitorear una región",
    description:
      "Agrega una región al seguimiento con un umbral de magnitud. MODIFICA DATOS: usar " +
      "solo cuando el usuario lo pide explícitamente ('seguí Chile', 'agregá Japón'), " +
      "nunca para responder una consulta.",
    inputSchema: {
      region: z.string().describe("id o nombre de región, ej: 'chile'"),
      umbralMagnitud: z.number().min(0).max(10).optional().describe("magnitud desde la cual interesa (default 4.5)"),
      motivo: z.string().optional().describe("por qué se monitorea, texto libre"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true },
  }, async ({ region, umbralMagnitud, motivo }) => {
    const r = buscarRegion(region);
    if (!r) throw new Error(`Región '${region}' desconocida. Probá con sismo_listar_regiones.`);
    repo.agregarWatchlist(r.id, r.nombre, umbralMagnitud ?? 4.5, motivo ?? null);
    return { resumen: `${r.nombre} agregada (M≥${umbralMagnitud ?? 4.5})`, datos: repo.obtenerRegion(r.id) };
  });

  registrarTool(server, "watchlist_quitar", "DB", {
    title: "Dejar de monitorear una región",
    description:
      "Saca una región del seguimiento. MODIFICA DATOS: pedir confirmación antes de usarla " +
      "si el usuario no la nombró explícitamente.",
    inputSchema: { region: z.string().describe("id o nombre de región") },
    annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true },
  }, async ({ region }) => {
    const r = buscarRegion(region);
    if (!r) throw new Error(`Región '${region}' desconocida.`);
    const quitada = repo.quitarWatchlist(r.id);
    if (!quitada) throw new Error(`${r.nombre} no estaba en la watchlist.`);
    return { resumen: `${r.nombre} quitada`, datos: { regionId: r.id, quitada: true } };
  });

  registrarTool(server, "nota_agregar", "DB", {
    title: "Anotar una observación",
    description:
      "Guarda una nota de texto asociada a un sismo puntual. MODIFICA DATOS. Usar cuando el " +
      "usuario quiere registrar una observación sobre un evento.",
    inputSchema: {
      eventoId: z.string().describe("id del sismo en el USGS"),
      texto: z.string().min(1).describe("la observación a guardar"),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false },
  }, async ({ eventoId, texto }) => {
    const nota = repo.agregarNota(eventoId, texto);
    return { resumen: `nota #${nota.id} guardada`, datos: nota };
  });

  registrarTool(server, "nota_listar", "DB", {
    title: "Ver notas",
    description:
      "Devuelve las notas guardadas, todas o filtradas por un sismo. Usar para '¿qué había " +
      "anotado sobre este sismo?' o para repasar observaciones previas.",
    inputSchema: { eventoId: z.string().optional().describe("filtrar por un sismo; omitir para ver las últimas 50") },
    annotations: { readOnlyHint: true, openWorldHint: false },
  }, async ({ eventoId }) => {
    const notas = repo.listarNotas(eventoId);
    return { resumen: `${notas.length} notas`, datos: { notas } };
  });
}
