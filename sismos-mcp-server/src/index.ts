/**
 * sismos-mcp-server — entrypoint.
 *
 * Transporte: Streamable HTTP. Elegido a proposito sobre stdio para que el
 * servidor sea un proceso visible con su propia terminal: asi se ven los logs
 * mientras el agente dispara tools. Con stdio el servidor es un subproceso
 * del cliente y los logs quedan escondidos.
 */
import express from "express";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { SERVER_NAME, SERVER_VERSION, HTTP_PORT, LLM_MODEL, DB_PATH } from "./constants.js";
import { registrarToolsSismos } from "./tools/sismos.js";
import { registrarToolsWatchlist } from "./tools/watchlist.js";
import { registrarToolsAnalisis } from "./tools/analisis.js";
import { registrarRecursos } from "./recursos.js";
import { registrarPrompts } from "./prompts.js";
import { banner, suscribir, type EventoServidor } from "./log.js";

function construirServidor(): McpServer {
  const server = new McpServer(
    { name: SERVER_NAME, version: SERVER_VERSION },
    {
      capabilities: { logging: {} },
      instructions:
        "Servidor de monitoreo sísmico. Las tools sismo_* consultan la API pública del USGS; " +
        "las watchlist_* y nota_* leen y escriben una base local; sismo_explicar e " +
        "informe_watchlist además razonan con un modelo abierto. Ante una consulta sobre una " +
        "región, empezá por sismo_listar_regiones si no conocés el id.",
    },
  );

  registrarToolsSismos(server);
  registrarToolsWatchlist(server);
  registrarToolsAnalisis(server);
  registrarRecursos(server);
  registrarPrompts(server);

  return server;
}

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok", server: SERVER_NAME, version: SERVER_VERSION });
});

/**
 * SSE con la actividad interna del servidor.
 * Es lo que el frontend didactico dibuja en el panel derecho: que tool corrio,
 * contra que fuente, con que latencia.
 */
app.get("/events", (_req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  res.write(": conectado\n\n");

  const desuscribir = suscribir((e: EventoServidor) => {
    res.write(`data: ${JSON.stringify(e)}\n\n`);
  });
  const latido = setInterval(() => res.write(": ping\n\n"), 15_000);

  _req.on("close", () => {
    clearInterval(latido);
    desuscribir();
  });
});

// Stateless: un transporte nuevo por request. Mas simple de escalar y evita
// colisiones de ids entre clientes concurrentes.
app.post("/mcp", async (req, res) => {
  const server = construirServidor();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on("close", () => {
    transport.close();
    server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(HTTP_PORT, () => {
  banner([
    `escuchando en  http://localhost:${HTTP_PORT}/mcp`,
    `base de datos  ${DB_PATH}`,
    `modelo         ${LLM_MODEL}`,
    ``,
    `conectalo:  claude mcp add --transport http sismos http://localhost:${HTTP_PORT}/mcp`,
  ]);
});
