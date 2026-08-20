/**
 * Base de datos local. `node:sqlite` viene incluido en Node 22 — cero
 * dependencias nativas, cero instalacion.
 */
import { DatabaseSync } from "node:sqlite";
import { DB_PATH } from "./constants.js";

const db = new DatabaseSync(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS watchlist (
    region_id  TEXT PRIMARY KEY,
    nombre     TEXT NOT NULL,
    umbral_mag REAL NOT NULL DEFAULT 4.5,
    motivo     TEXT,
    creado_en  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notas (
    id        INTEGER PRIMARY KEY AUTOINCREMENT,
    evento_id TEXT NOT NULL,
    texto     TEXT NOT NULL,
    creado_en TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_notas_evento ON notas(evento_id);
`);

export interface FilaWatchlist {
  region_id: string;
  nombre: string;
  umbral_mag: number;
  motivo: string | null;
  creado_en: string;
}

export interface FilaNota {
  id: number;
  evento_id: string;
  texto: string;
  creado_en: string;
}

export const repo = {
  listarWatchlist(): FilaWatchlist[] {
    return db.prepare("SELECT * FROM watchlist ORDER BY creado_en").all() as unknown as FilaWatchlist[];
  },

  obtenerRegion(regionId: string): FilaWatchlist | undefined {
    return db.prepare("SELECT * FROM watchlist WHERE region_id = ?").get(regionId) as unknown as FilaWatchlist | undefined;
  },

  agregarWatchlist(regionId: string, nombre: string, umbral: number, motivo: string | null): void {
    db.prepare(
      `INSERT INTO watchlist (region_id, nombre, umbral_mag, motivo) VALUES (?, ?, ?, ?)
       ON CONFLICT(region_id) DO UPDATE SET umbral_mag = excluded.umbral_mag, motivo = excluded.motivo`,
    ).run(regionId, nombre, umbral, motivo);
  },

  quitarWatchlist(regionId: string): boolean {
    return db.prepare("DELETE FROM watchlist WHERE region_id = ?").run(regionId).changes > 0;
  },

  agregarNota(eventoId: string, texto: string): FilaNota {
    const { lastInsertRowid } = db.prepare("INSERT INTO notas (evento_id, texto) VALUES (?, ?)").run(eventoId, texto);
    return db.prepare("SELECT * FROM notas WHERE id = ?").get(lastInsertRowid) as unknown as FilaNota;
  },

  listarNotas(eventoId?: string): FilaNota[] {
    return (
      eventoId
        ? db.prepare("SELECT * FROM notas WHERE evento_id = ? ORDER BY creado_en DESC").all(eventoId)
        : db.prepare("SELECT * FROM notas ORDER BY creado_en DESC LIMIT 50").all()
    ) as unknown as FilaNota[];
  },
};
