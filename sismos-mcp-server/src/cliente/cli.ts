/**
 * CLI interactiva. La entrada es lenguaje natural; el modelo abierto decide
 * qué tool del MCP activar y la pantalla lo muestra en vivo.
 *
 *   npm run ask                      → modo interactivo
 *   npm run ask -- "tu pregunta"     → una sola consulta
 */
import readline from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { ClienteSismos } from "./mcp.js";
import { responder, type EventoAgente } from "./agente.js";
import { LLM_MODEL, HTTP_PORT } from "../constants.js";

const C = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m",
  magenta: "\x1b[35m", red: "\x1b[31m", gray: "\x1b[90m",
};

const URL_MCP = process.env.MCP_URL ?? `http://localhost:${HTTP_PORT}/mcp`;

function dibujar(e: EventoAgente): void {
  switch (e.tipo) {
    case "pensando":
      stdout.write(`  ${C.dim}${C.magenta}⋯ ${LLM_MODEL} pensando…${C.reset}\r`);
      break;
    case "tool":
      stdout.write("\x1b[2K");
      console.log(`  ${C.magenta}⚙${C.reset}  eligió ${C.bold}${e.tool}${C.reset}`);
      console.log(`     ${C.dim}${JSON.stringify(e.args)}${C.reset}`);
      break;
    case "resultado":
      console.log(
        e.error
          ? `     ${C.red}✗ la tool devolvió un error${C.reset} ${C.dim}· ${e.ms}ms${C.reset}`
          : `     ${C.green}✓${C.reset} ${C.dim}${e.ms}ms${C.reset}`,
      );
      break;
    case "respuesta":
      stdout.write("\x1b[2K");
      console.log(`\n${C.cyan}${e.texto}${C.reset}\n`);
      break;
  }
}

async function main(): Promise<void> {
  const mcp = new ClienteSismos(URL_MCP);

  try {
    await mcp.conectar();
  } catch {
    console.error(`\n${C.red}No pude conectarme al MCP en ${URL_MCP}${C.reset}`);
    console.error(`${C.dim}Levantá el servidor en otra terminal:  npm run dev${C.reset}\n`);
    process.exit(1);
  }

  const tools = await mcp.listarTools();

  console.log(`\n${C.bold}${C.cyan}  asistente sísmico${C.reset}`);
  console.log(`  ${C.dim}MCP     ${URL_MCP} · ${tools.length} tools${C.reset}`);
  console.log(`  ${C.dim}modelo  ${LLM_MODEL} (decide qué tool activar)${C.reset}\n`);

  const preguntaDirecta = process.argv.slice(2).join(" ").trim();
  if (preguntaDirecta) {
    console.log(`${C.bold}› ${preguntaDirecta}${C.reset}\n`);
    await responder(preguntaDirecta, mcp, dibujar);
    await mcp.cerrar();
    return;
  }

  console.log(`  ${C.dim}Escribí tu pregunta. 'salir' para terminar.${C.reset}\n`);
  const rl = readline.createInterface({ input: stdin, output: stdout });

  for (;;) {
    const pregunta = (await rl.question(`${C.bold}› ${C.reset}`)).trim();
    if (!pregunta) continue;
    if (["salir", "exit", "quit"].includes(pregunta.toLowerCase())) break;

    console.log();
    try {
      await responder(pregunta, mcp, dibujar);
    } catch (err) {
      console.error(`\n${C.red}✗ ${err instanceof Error ? err.message : String(err)}${C.reset}\n`);
    }
  }

  rl.close();
  await mcp.cerrar();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
