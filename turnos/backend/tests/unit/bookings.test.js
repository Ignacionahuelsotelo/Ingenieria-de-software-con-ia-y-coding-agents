import { describe, it, expect, beforeEach } from "vitest";
import { createBooking, listBookingsByContact, cancelBooking, listAllBookings } from "../../src/domain/bookings.js";
import { reset, setSchedule } from "../../src/store/memoryStore.js";

const NOW = new Date("2026-08-01T00:00:00.000Z");

function schedule() {
  return {
    slotDurationMinutes: 30,
    // 2026-08-17 es lunes (dayOfWeek 1), 2026-08-18 es martes (dayOfWeek 2)
    weeklyHours: [
      { dayOfWeek: 1, ranges: [{ startLocal: "09:00", endLocal: "10:00" }] },
      { dayOfWeek: 2, ranges: [{ startLocal: "09:00", endLocal: "10:00" }] },
    ],
  };
}

function validInput() {
  return {
    startLocal: "2026-08-17T09:00:00-03:00",
    customerName: "Juan Pérez",
    customerContact: "juan@example.com",
  };
}

describe("domain/bookings createBooking", () => {
  beforeEach(() => {
    reset();
    setSchedule(schedule());
  });

  it("crea una reserva válida sobre un slot generable", () => {
    const booking = createBooking(validInput(), { now: NOW });
    expect(booking.status).toBe("active");
    expect(booking.customerName).toBe("Juan Pérez");
    expect(booking.startUtc.toISOString()).toBe("2026-08-17T12:00:00.000Z");
    expect(booking.endUtc.toISOString()).toBe("2026-08-17T12:30:00.000Z");
    expect(booking.id).toBeTruthy();
  });

  it("rechaza si falta customerName o customerContact", () => {
    expect(() => createBooking({ ...validInput(), customerName: "" }, { now: NOW })).toThrowError(
      expect.objectContaining({ code: "INVALID_BOOKING" })
    );
    expect(() => createBooking({ ...validInput(), customerContact: "  " }, { now: NOW })).toThrowError(
      expect.objectContaining({ code: "INVALID_BOOKING" })
    );
  });

  it("rechaza un horario que no coincide con ningún slot generable (fuera de horario)", () => {
    expect(() =>
      createBooking({ ...validInput(), startLocal: "2026-08-17T20:00:00-03:00" }, { now: NOW })
    ).toThrowError(expect.objectContaining({ code: "INVALID_BOOKING" }));
  });

  it("rechaza un horario en el pasado", () => {
    expect(() =>
      createBooking(validInput(), { now: new Date("2026-08-18T00:00:00.000Z") })
    ).toThrowError(expect.objectContaining({ code: "INVALID_BOOKING" }));
  });

  it("rechaza una reserva que se solapa con otra reserva activa (FR-007)", () => {
    createBooking(validInput(), { now: NOW });
    expect(() => createBooking(validInput(), { now: NOW })).toThrowError(
      expect.objectContaining({ code: "SLOT_ALREADY_BOOKED", statusCode: 409 })
    );
  });
});

describe("domain/bookings listBookingsByContact", () => {
  beforeEach(() => {
    reset();
    setSchedule(schedule());
  });

  it("devuelve solo los turnos del contacto solicitado", () => {
    createBooking(validInput(), { now: NOW });
    createBooking(
      { startLocal: "2026-08-18T09:00:00-03:00", customerName: "Otra Persona", customerContact: "otra@example.com" },
      { now: NOW }
    );

    const results = listBookingsByContact("juan@example.com");
    expect(results).toHaveLength(1);
    expect(results[0].customerContact).toBe("juan@example.com");
  });

  it("compara el contacto sin distinguir mayúsculas/minúsculas ni espacios", () => {
    createBooking(validInput(), { now: NOW });
    const results = listBookingsByContact("  JUAN@EXAMPLE.COM  ");
    expect(results).toHaveLength(1);
  });

  it("devuelve lista vacía si el contacto no tiene turnos", () => {
    expect(listBookingsByContact("nadie@example.com")).toEqual([]);
  });
});

describe("domain/bookings cancelBooking", () => {
  beforeEach(() => {
    reset();
    setSchedule(schedule());
  });

  it("cancela una reserva futura propia y la deja en status cancelled", () => {
    const booking = createBooking(validInput(), { now: NOW });
    const cancelled = cancelBooking(booking.id, "juan@example.com", { now: NOW });
    expect(cancelled.status).toBe("cancelled");
    expect(cancelled.cancelledAt).toBeInstanceOf(Date);
  });

  it("libera el turno para que vuelva a estar disponible tras cancelar", () => {
    const booking = createBooking(validInput(), { now: NOW });
    cancelBooking(booking.id, "juan@example.com", { now: NOW });
    const rebooked = createBooking(validInput(), { now: NOW });
    expect(rebooked.status).toBe("active");
  });

  it("rechaza cancelar un turno que ya comenzó/pasó", () => {
    const booking = createBooking(validInput(), { now: NOW });
    expect(() =>
      cancelBooking(booking.id, "juan@example.com", { now: new Date("2026-08-18T00:00:00.000Z") })
    ).toThrowError(expect.objectContaining({ code: "BOOKING_ALREADY_STARTED", statusCode: 409 }));
  });

  it("rechaza cancelar un turno que no existe", () => {
    expect(() => cancelBooking("no-existe", "juan@example.com", { now: NOW })).toThrowError(
      expect.objectContaining({ code: "BOOKING_NOT_FOUND", statusCode: 404 })
    );
  });

  it("rechaza cancelar un turno ajeno", () => {
    const booking = createBooking(validInput(), { now: NOW });
    expect(() => cancelBooking(booking.id, "otra@example.com", { now: NOW })).toThrowError(
      expect.objectContaining({ code: "NOT_YOUR_BOOKING", statusCode: 403 })
    );
  });

  it("rechaza cancelar un turno ya cancelado", () => {
    const booking = createBooking(validInput(), { now: NOW });
    cancelBooking(booking.id, "juan@example.com", { now: NOW });
    expect(() => cancelBooking(booking.id, "juan@example.com", { now: NOW })).toThrowError(
      expect.objectContaining({ code: "BOOKING_ALREADY_STARTED", statusCode: 409 })
    );
  });
});

describe("domain/bookings listAllBookings", () => {
  beforeEach(() => {
    reset();
    setSchedule(schedule());
  });

  it("devuelve las reservas de todos los clientes, activas y canceladas", () => {
    const b1 = createBooking(validInput(), { now: NOW });
    createBooking(
      { startLocal: "2026-08-18T09:00:00-03:00", customerName: "Otra Persona", customerContact: "otra@example.com" },
      { now: NOW }
    );
    cancelBooking(b1.id, "juan@example.com", { now: NOW });

    const all = listAllBookings();
    expect(all).toHaveLength(2);
    expect(all.map((b) => b.status).sort()).toEqual(["active", "cancelled"]);
  });

  it("devuelve lista vacía si no hay reservas", () => {
    expect(listAllBookings()).toEqual([]);
  });
});
