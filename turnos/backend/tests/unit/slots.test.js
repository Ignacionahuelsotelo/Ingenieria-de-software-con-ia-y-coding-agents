import { describe, it, expect } from "vitest";
import { listAvailableSlots } from "../../src/domain/slots.js";

function schedule() {
  return {
    slotDurationMinutes: 30,
    // 2026-08-17 es lunes (dayOfWeek 1)
    weeklyHours: [{ dayOfWeek: 1, ranges: [{ startLocal: "09:00", endLocal: "10:00" }] }],
  };
}

describe("domain/slots listAvailableSlots", () => {
  it("genera slots de la duración configurada dentro del rango del día", () => {
    const slots = listAvailableSlots({
      schedule: schedule(),
      bookings: [],
      from: "2026-08-17",
      to: "2026-08-17",
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(slots).toHaveLength(2);
    expect(slots[0].startUtc.toISOString()).toBe("2026-08-17T12:00:00.000Z");
    expect(slots[0].endUtc.toISOString()).toBe("2026-08-17T12:30:00.000Z");
    expect(slots[1].startUtc.toISOString()).toBe("2026-08-17T12:30:00.000Z");
  });

  it("no genera slots para días fuera del horario configurado", () => {
    const slots = listAvailableSlots({
      schedule: schedule(),
      bookings: [],
      from: "2026-08-18", // martes, sin configuración
      to: "2026-08-18",
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(slots).toHaveLength(0);
  });

  it("excluye slots cuyo horario ya pasó", () => {
    const slots = listAvailableSlots({
      schedule: schedule(),
      bookings: [],
      from: "2026-08-17",
      to: "2026-08-17",
      now: new Date("2026-08-17T12:15:00.000Z"), // entre el primer y segundo slot
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].startUtc.toISOString()).toBe("2026-08-17T12:30:00.000Z");
  });

  it("excluye slots ya reservados por una booking activa", () => {
    const slots = listAvailableSlots({
      schedule: schedule(),
      bookings: [
        {
          startUtc: new Date("2026-08-17T12:00:00.000Z"),
          endUtc: new Date("2026-08-17T12:30:00.000Z"),
          status: "active",
        },
      ],
      from: "2026-08-17",
      to: "2026-08-17",
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(slots).toHaveLength(1);
    expect(slots[0].startUtc.toISOString()).toBe("2026-08-17T12:30:00.000Z");
  });

  it("no excluye slots cuya única reserva superpuesta está cancelada", () => {
    const slots = listAvailableSlots({
      schedule: schedule(),
      bookings: [
        {
          startUtc: new Date("2026-08-17T12:00:00.000Z"),
          endUtc: new Date("2026-08-17T12:30:00.000Z"),
          status: "cancelled",
        },
      ],
      from: "2026-08-17",
      to: "2026-08-17",
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    expect(slots).toHaveLength(2);
  });

  it("devuelve lista vacía si no hay schedule configurado", () => {
    const slots = listAvailableSlots({ schedule: null, bookings: [], from: "2026-08-17", to: "2026-08-17" });
    expect(slots).toHaveLength(0);
  });
});
