import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const SPORTDB_URL = process.env.SPORTDB_URL ?? "https://api.sportdb.dev/mcp/";
const SPORTDB_API_KEY = process.env.SPORTDB_API_KEY;

let clientPromise = null;

function connect() {
  const transport = new StreamableHTTPClientTransport(new URL(SPORTDB_URL), {
    requestInit: {
      headers: { "X-API-Key": SPORTDB_API_KEY },
    },
  });
  const client = new Client({ name: "futbol-vibecoding-backend", version: "0.1.0" });
  return client.connect(transport).then(() => client);
}

async function getClient() {
  if (!clientPromise) {
    clientPromise = connect().catch((err) => {
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

// Envuelve callTool: reconecta una vez si la conexión existente falló, y
// devuelve directamente el `data` del payload { endpoint, source_status_code, data }.
export async function callSportDbTool(name, args = {}) {
  let client = await getClient();
  let result;
  try {
    result = await client.callTool({ name, arguments: args });
  } catch (err) {
    clientPromise = null;
    client = await getClient();
    result = await client.callTool({ name, arguments: args });
  }

  if (result.isError) {
    const message = result.content?.[0]?.text ?? "SportDB MCP tool call failed";
    throw new Error(`SportDB MCP error (${name}): ${message}`);
  }

  const text = result.content?.[0]?.text;
  const parsed = text ? JSON.parse(text) : result;
  return parsed.data;
}
