/**
 * Logging bonito para la terminal + notificaciones MCP al cliente.
 *
 * Dos destinos a la vez:
 *  - stderr con colores: lo que se ve en la terminal del servidor (la demo)
 *  - notification/message MCP: lo que el cliente (Claude Code) puede mostrar
 *
 * OJO: en transporte stdio jamas se escribe a stdout — ahi viaja el protocolo.
 * Usamos stderr siempre, aunque acá corramos sobre HTTP.
 */

const C = {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m",
  blue: "\x1b[34m", magenta: "\x1b[35m", cyan: "\x1b[36m", gray: "\x1b[90m",
};

/** De dónde saca los datos la tool. El punto pedagógico de toda la demo. */
export type Fuente = "API" | "DB" | "LLM" | "MCP";

const COLOR_FUENTE: Record<Fuente, string> = {
  API: C.cyan, DB: C.green, LLM: C.magenta, MCP: C.yellow,
};

const ETIQUETA: Record<Fuente, string> = {
  API: "API · USGS", DB: "DB · sqlite", LLM: "LLM · abierto", MCP: "MCP",
};

const hora = () => new Date().toTimeString().slice(0, 8);
const out = (s: string) => process.stderr.write(s + "\n");

/* ─── Bus de eventos ────────────────────────────────────────────────────────
   Ademas de imprimir lindo en la terminal, cada evento se emite a quien este
   suscripto. Lo usa el endpoint SSE /events para que el frontend didactico vea
   trabajar al servidor en vivo. */

export interface EventoServidor {
  tipo: "inicio" | "paso" | "fin" | "error";
  tool?: string;
  fuente?: Fuente;
  input?: unknown;
  texto?: string;
  ms?: number;
  ts: number;
}

type Suscriptor = (e: EventoServidor) => void;
const suscriptores = new Set<Suscriptor>();

export function suscribir(fn: Suscriptor): () => void {
  suscriptores.add(fn);
  return () => suscriptores.delete(fn);
}

function emitir(e: Omit<EventoServidor, "ts">): void {
  const evento = { ...e, ts: Date.now() };
  for (const fn of suscriptores) {
    try { fn(evento); } catch { /* un suscriptor caido no rompe el log */ }
  }
}

/** Guarda la tool y la fuente en curso para etiquetar los pasos intermedios. */
let enCurso: { tool: string; fuente: Fuente } | null = null;

export function abrirLlamada(tool: string, fuente: Fuente, input: unknown): number {
  const col = COLOR_FUENTE[fuente];
  const cabecera = `${C.gray}┌─ ${hora()}${C.reset}  ${C.bold}${tool}${C.reset}`;
  const tag = `${col}[${ETIQUETA[fuente]}]${C.reset}`;
  const relleno = Math.max(1, 54 - tool.length);
  out(`${cabecera}${" ".repeat(relleno)}${tag}`);
  out(`${C.gray}│${C.reset}  ${C.dim}→ ${JSON.stringify(input)}${C.reset}`);
  enCurso = { tool, fuente };
  emitir({ tipo: "inicio", tool, fuente, input });
  return Date.now();
}

export function paso(texto: string): void {
  out(`${C.gray}│${C.reset}  ${C.dim}↳ ${texto}${C.reset}`);
  emitir({ tipo: "paso", texto, tool: enCurso?.tool, fuente: enCurso?.fuente });
}

export function cerrarLlamada(inicio: number, resumen: string): void {
  const ms = Date.now() - inicio;
  out(`${C.gray}│${C.reset}  ${C.green}✓${C.reset} ${resumen} ${C.dim}· ${ms}ms${C.reset}`);
  out(`${C.gray}└─${C.reset}`);
  emitir({ tipo: "fin", texto: resumen, ms, tool: enCurso?.tool, fuente: enCurso?.fuente });
  enCurso = null;
}

export function fallarLlamada(inicio: number, mensaje: string): void {
  const ms = Date.now() - inicio;
  out(`${C.gray}│${C.reset}  ${C.red}✗ ${mensaje}${C.reset} ${C.dim}· ${ms}ms${C.reset}`);
  out(`${C.gray}└─${C.reset}`);
  emitir({ tipo: "error", texto: mensaje, ms, tool: enCurso?.tool, fuente: enCurso?.fuente });
  enCurso = null;
}

export function banner(lineas: string[]): void {
  out("");
  out(`${C.bold}${C.cyan}  sismos-mcp-server${C.reset}`);
  for (const l of lineas) out(`  ${C.dim}${l}${C.reset}`);
  out("");
}
