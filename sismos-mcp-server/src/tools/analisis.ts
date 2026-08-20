/**
 * Tools que llaman a un LLM abierto.
 *
 * Es el caso menos visto de MCP: el servidor no solo devuelve datos, tambien
 * razona sobre ellos usando su propio modelo — distinto del que corre en el
 * cliente. Dos modelos, dos empresas, una sola conversacion.
 */
import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registrarTool } from "./registrar.js";
import { completar } from "../services/llm.js";
import { buscarSismos } from "../services/usgs.js";
import { repo } from "../db.js";
import { buscarRegion, LLM_MODEL } from "../constants.js";

const SYSTEM = `Sos un sismólogo que le explica a personas sin formación técnica.
Escribís en español rioplatense, claro y sin alarmismo.
Nunca inventes datos: usá solo los que te pasan.
Sé breve: 3 a 5 oraciones.`;

export function registrarToolsAnalisis(server: McpServer): void {
  registrarTool(server, "sismo_explicar", "LLM", {
    title: "Explicar actividad sísmica en lenguaje llano",
    description:
      "Toma la actividad sísmica reciente de una región y devuelve una explicación breve " +
      "en lenguaje llano, generada por un modelo abierto. Usar cuando el usuario pide " +
      "'explicame', 'resumime' o '¿esto es normal?' en vez de datos crudos.",
    inputSchema: {
      region: z.string().describe("id o nombre de región, ej: 'chile'"),
      dias: z.number().int().min(1).max(90).optional().describe("ventana en días (default 7)"),
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ region, dias }) => {
    const r = buscarRegion(region);
    if (!r) throw new Error(`Región '${region}' desconocida. Probá con sismo_listar_regiones.`);

    const ventana = dias ?? 7;
    const sismos = await buscarSismos({
      lat: r.lat, lon: r.lon, radioKm: r.radioKm,
      desde: new Date(Date.now() - ventana * 86_400_000).toISOString(),
      limite: 40,
    });

    if (sismos.length === 0) {
      return {
        resumen: "sin actividad — no se consultó al modelo",
        datos: { region: r.nombre, explicacion: `No se registraron sismos en ${r.nombre} en los últimos ${ventana} días.` },
      };
    }

    const tabla = sismos
      .slice(0, 25)
      .map((s) => `M${s.magnitud ?? "?"} · ${s.profundidadKm ?? "?"}km · ${s.fecha.slice(0, 10)} · ${s.lugar ?? "s/d"}`)
      .join("\n");

    const explicacion = await completar(
      SYSTEM,
      `Región: ${r.nombre}. Últimos ${ventana} días. ${sismos.length} sismos registrados:\n\n${tabla}\n\n` +
      `Explicá qué muestra esta actividad: si es normal para la zona, si hay algo que llame la atención, y por qué.`,
    );

    return {
      resumen: `explicación generada con ${LLM_MODEL}`,
      datos: { region: r.nombre, ventanaDias: ventana, sismosAnalizados: sismos.length, modelo: LLM_MODEL, explicacion },
    };
  });

  registrarTool(server, "informe_watchlist", "LLM", {
    title: "Informe de las regiones monitoreadas",
    description:
      "Genera un informe en prosa sobre TODAS las regiones de la watchlist, cruzando la base " +
      "local con la API del USGS y resumiendo con un modelo abierto. Esta tool sola encadena " +
      "las tres fuentes. Usar para 'dame el informe' o '¿cómo viene todo?'.",
    inputSchema: { dias: z.number().int().min(1).max(90).optional().describe("ventana en días (default 7)") },
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async ({ dias }) => {
    const watchlist = repo.listarWatchlist();
    if (watchlist.length === 0) {
      throw new Error("La watchlist está vacía. Agregá regiones con watchlist_agregar antes de pedir el informe.");
    }

    const ventana = dias ?? 7;
    const bloques: string[] = [];
    let total = 0;

    for (const fila of watchlist) {
      const r = buscarRegion(fila.region_id);
      if (!r) continue;
      const sismos = await buscarSismos({
        lat: r.lat, lon: r.lon, radioKm: r.radioKm,
        desde: new Date(Date.now() - ventana * 86_400_000).toISOString(),
        magnitudMinima: fila.umbral_mag,
        limite: 20,
      });
      total += sismos.length;
      bloques.push(
        `${r.nombre} (umbral M${fila.umbral_mag}): ${sismos.length} sismos.` +
        (sismos.length ? ` Mayor: M${Math.max(...sismos.map((s) => s.magnitud ?? 0))}.` : ""),
      );
    }

    const informe = await completar(
      SYSTEM,
      `Informe de monitoreo, últimos ${ventana} días:\n\n${bloques.join("\n")}\n\n` +
      `Escribí un resumen para el usuario: qué regiones merecen atención y cuáles están tranquilas.`,
    );

    return {
      resumen: `${watchlist.length} regiones · ${total} sismos · resumido por ${LLM_MODEL}`,
      datos: { ventanaDias: ventana, regiones: bloques, modelo: LLM_MODEL, informe },
    };
  });
}
