import { describe, it, expect } from "vitest";
import { localDateTimeToUtc, utcToLocalDateParts, utcToLocalIso, rangesOverlap, isBefore } from "../../src/domain/time.js";

describe("domain/time", () => {
  it("convierte una hora local de la barbería a UTC respetando el offset (-03:00)", () => {
    const utc = localDateTimeToUtc(2026, 7, 17, 9, 0); // 17 de agosto de 2026, 09:00 local
    expect(utc.toISOString()).toBe("2026-08-17T12:00:00.000Z");
  });

  it("es la inversa de utcToLocalDateParts para una fecha del mismo día calendario local", () => {
    const utc = localDateTimeToUtc(2026, 7, 17, 9, 0);
    const parts = utcToLocalDateParts(utc);
    expect(parts).toEqual({ year: 2026, month: 7, day: 17 });
  });

  it("detecta solapamiento de rangos", () => {
    const a1 = new Date("2026-08-17T12:00:00.000Z");
    const a2 = new Date("2026-08-17T12:30:00.000Z");
    const b1 = new Date("2026-08-17T12:15:00.000Z");
    const b2 = new Date("2026-08-17T12:45:00.000Z");
    expect(rangesOverlap(a1, a2, b1, b2)).toBe(true);
  });

  it("no detecta solapamiento si los rangos son adyacentes ([start,end) exclusivo)", () => {
    const a1 = new Date("2026-08-17T12:00:00.000Z");
    const a2 = new Date("2026-08-17T12:30:00.000Z");
    const b1 = new Date("2026-08-17T12:30:00.000Z");
    const b2 = new Date("2026-08-17T13:00:00.000Z");
    expect(rangesOverlap(a1, a2, b1, b2)).toBe(false);
  });

  it("utcToLocalIso serializa con el offset -03:00 de la barbería (no +03:00)", () => {
    const utc = new Date("2026-08-17T12:00:00.000Z");
    expect(utcToLocalIso(utc)).toBe("2026-08-17T09:00:00-03:00");
  });

  it("isBefore compara instantes correctamente", () => {
    const earlier = new Date("2026-08-17T12:00:00.000Z");
    const later = new Date("2026-08-17T12:01:00.000Z");
    expect(isBefore(earlier, later)).toBe(true);
    expect(isBefore(later, earlier)).toBe(false);
  });
});
