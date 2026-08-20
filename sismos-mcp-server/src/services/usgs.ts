/** Cliente de la API publica del USGS. Sin key, sin registro. */
import { USGS_BASE } from "../constants.js";
import { paso } from "../log.js";

export interface Sismo {
  id: string;
  magnitud: number | null;
  lugar: string | null;
  fecha: string;
  profundidadKm: number | null;
  lat: number;
  lon: number;
  tsunami: boolean;
  url: string | null;
}

interface FeatureGeoJSON {
  id: string;
  properties: { mag: number | null; place: string | null; time: number; tsunami: number; url: string | null };
  geometry: { coordinates: [number, number, number] };
}

function aSismo(f: FeatureGeoJSON): Sismo {
  const [lon, lat, prof] = f.geometry.coordinates;
  return {
    id: f.id,
    magnitud: f.properties.mag,
    lugar: f.properties.place,
    fecha: new Date(f.properties.time).toISOString(),
    profundidadKm: prof ?? null,
    lat, lon,
    tsunami: f.properties.tsunami === 1,
    url: f.properties.url,
  };
}

export interface ParamsBusqueda {
  desde?: string;
  hasta?: string;
  magnitudMinima?: number;
  lat?: number;
  lon?: number;
  radioKm?: number;
  limite?: number;
}

export async function buscarSismos(p: ParamsBusqueda): Promise<Sismo[]> {
  const q = new URLSearchParams({ format: "geojson", orderby: "time" });
  if (p.desde) q.set("starttime", p.desde);
  if (p.hasta) q.set("endtime", p.hasta);
  if (p.magnitudMinima !== undefined) q.set("minmagnitude", String(p.magnitudMinima));
  if (p.lat !== undefined && p.lon !== undefined && p.radioKm !== undefined) {
    q.set("latitude", String(p.lat));
    q.set("longitude", String(p.lon));
    q.set("maxradiuskm", String(p.radioKm));
  }
  q.set("limit", String(Math.min(p.limite ?? 20, 200)));

  const url = `${USGS_BASE}?${q}`;
  paso(`GET ${url.replace("https://", "").slice(0, 110)}`);

  const res = await fetch(url, { headers: { "User-Agent": "sismos-mcp-server/1.0 (clase)" } });
  if (!res.ok) {
    throw new Error(`USGS respondió ${res.status}. Revisá el rango de fechas o bajá el límite.`);
  }
  const data = (await res.json()) as { features: FeatureGeoJSON[] };
  return data.features.map(aSismo);
}

export async function obtenerSismo(id: string): Promise<Sismo | null> {
  const url = `${USGS_BASE}?format=geojson&eventid=${encodeURIComponent(id)}`;
  paso(`GET ${url.replace("https://", "")}`);
  const res = await fetch(url, { headers: { "User-Agent": "sismos-mcp-server/1.0 (clase)" } });
  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) throw new Error(`USGS respondió ${res.status}`);
  const data = (await res.json()) as FeatureGeoJSON | { features: FeatureGeoJSON[] };
  const f = "features" in data ? data.features[0] : data;
  return f ? aSismo(f as FeatureGeoJSON) : null;
}
