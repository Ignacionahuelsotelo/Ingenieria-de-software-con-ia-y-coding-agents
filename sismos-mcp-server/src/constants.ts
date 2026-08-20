export const SERVER_NAME = "sismos-mcp-server";
export const SERVER_VERSION = "1.0.0";

/** API publica del USGS. Sin API key, sin registro, sin limite practico. */
export const USGS_BASE = "https://earthquake.usgs.gov/fdsnws/event/1/query";

/** Endpoint OpenAI-compatible para el modelo abierto. Ollama local proxea a la nube. */
export const LLM_BASE_URL = process.env.LLM_BASE_URL ?? "http://localhost:11434/v1";
export const LLM_MODEL = process.env.LLM_MODEL ?? "minimax-m3:cloud";
export const LLM_API_KEY = process.env.LLM_API_KEY ?? "ollama";

export const HTTP_PORT = Number(process.env.PORT ?? 8787);
export const DB_PATH = process.env.DB_PATH ?? "./sismos.db";

/** Catalogo de regiones: convierte "Chile" en coordenadas que la API entiende. */
export interface Region {
  id: string;
  nombre: string;
  lat: number;
  lon: number;
  radioKm: number;
}

export const REGIONES: Region[] = [
  { id: "chile", nombre: "Chile", lat: -33.45, lon: -70.66, radioKm: 1800 },
  { id: "argentina", nombre: "Argentina", lat: -34.6, lon: -64.0, radioKm: 1600 },
  { id: "mexico", nombre: "México", lat: 19.43, lon: -99.13, radioKm: 1200 },
  { id: "japon", nombre: "Japón", lat: 36.2, lon: 138.25, radioKm: 1200 },
  { id: "california", nombre: "California", lat: 36.78, lon: -119.42, radioKm: 800 },
  { id: "indonesia", nombre: "Indonesia", lat: -2.5, lon: 118.0, radioKm: 2000 },
  { id: "turquia", nombre: "Turquía", lat: 39.0, lon: 35.0, radioKm: 900 },
  { id: "italia", nombre: "Italia", lat: 42.5, lon: 12.5, radioKm: 600 },
  { id: "nepal", nombre: "Nepal", lat: 28.4, lon: 84.1, radioKm: 500 },
  { id: "islandia", nombre: "Islandia", lat: 64.9, lon: -19.0, radioKm: 400 },
];

export function buscarRegion(texto: string): Region | undefined {
  const t = texto.trim().toLowerCase();
  return REGIONES.find(
    (r) => r.id === t || r.nombre.toLowerCase() === t || r.nombre.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "") === t,
  );
}
