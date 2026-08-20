/**
 * Backend del frontend didactico.
 *
 * Sirve la UI y expone la corrida del agente como SSE: cada paso del loop
 * (el modelo pensando, la tool que eligio, el resultado) sale como un evento
 * que el navegador dibuja en vivo.
 *
 * OJO: este proceso es el CLIENTE MCP. El servidor MCP corre aparte, en :8787,
 * y publica sus propios eventos en /events. El frontend se conecta a los dos
 * — por eso el split-screen es fiel: son dos procesos distintos de verdad.
 */
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ClienteSismos } from "../cliente/mcp.js";
import { responder } from "../cliente/agente.js";
import { LLM_MODEL, HTTP_PORT } from "../constants.js";

const aca = path.dirname(fileURLToPath(import.meta.url));
const PUERTO_WEB = Number(process.env.WEB_PORT ?? 8788);
const URL_MCP = process.env.MCP_URL ?? `http://localhost:${HTTP_PORT}/mcp`;

const app = express();
app.use(express.static(path.join(aca, "public")));

app.get("/api/config", (_req, res) => {
  res.json({ urlMcp: URL_MCP, urlEventosServidor: URL_MCP.replace("/mcp", "/events"), modeloPorDefecto: LLM_MODEL });
});

app.get("/api/preguntar", async (req, res) => {
  const pregunta = String(req.query.q ?? "").trim();
  const modelo = String(req.query.modelo ?? LLM_MODEL);

  if (!pregunta) {
    res.status(400).json({ error: "Falta el parámetro q" });
    return;
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const enviar = (dato: unknown) => res.write(`data: ${JSON.stringify(dato)}\n\n`);
  const mcp = new ClienteSismos(URL_MCP);

  try {
    try {
      await mcp.conectar();
    } catch {
      throw new Error(
        `No hay ningún servidor MCP escuchando en ${URL_MCP}. ` +
        `Abrí otra terminal y corré:  npm run dev`,
      );
    }
    enviar({ tipo: "conectado", modelo });
    await responder(pregunta, mcp, (e) => enviar(e), modelo);
  } catch (err) {
    let texto = err instanceof Error ? err.message : String(err);
    // "fetch failed" es el error de Node cuando no hay nadie del otro lado.
    // Traducirlo evita el diagnóstico a ciegas.
    if (texto.includes("fetch failed") || texto.includes("ECONNREFUSED")) {
      texto =
        `No pude alcanzar el modelo en ${process.env.LLM_BASE_URL ?? "http://localhost:11434/v1"}. ` +
        `¿Está Ollama corriendo?  Probá:  curl -s localhost:11434/api/tags`;
    }
    enviar({ tipo: "fallo", texto });
  } finally {
    await mcp.cerrar().catch(() => {});
    enviar({ tipo: "fin" });
    res.end();
  }
});

app.listen(PUERTO_WEB, () => {
  console.log(`\n  visualizador  http://localhost:${PUERTO_WEB}`);
  console.log(`  servidor MCP  ${URL_MCP}\n`);
});
