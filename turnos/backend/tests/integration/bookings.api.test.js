import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createApp } from "../../src/http/app.js";
import { reset, setSchedule } from "../../src/store/memoryStore.js";

let server;
let baseUrl;

beforeAll(async () => {
  const app = createApp();
  server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

afterAll(() => {
  server.close();
});

beforeEach(() => {
  reset();
  setSchedule({
    slotDurationMinutes: 30,
    weeklyHours: [{ dayOfWeek: 1, ranges: [{ startLocal: "09:00", endLocal: "10:00" }] }],
    updatedAt: new Date(),
  });
});

function bookingPayload(overrides = {}) {
  return {
    startLocal: "2026-08-17T09:00:00-03:00",
    customerName: "Juan Pérez",
    customerContact: "juan@example.com",
    ...overrides,
  };
}

describe("POST /api/bookings", () => {
  it("201 al reservar un slot disponible", async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingPayload()),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.status).toBe("active");
    expect(body.id).toBeTruthy();
  });

  it("400 INVALID_BOOKING si el horario no coincide con un slot generable", async () => {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingPayload({ startLocal: "2026-08-17T20:00:00-03:00" })),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_BOOKING");
  });

  it("409 SLOT_ALREADY_BOOKED cuando dos requests casi simultáneas reservan el mismo slot — solo una tiene éxito", async () => {
    const [res1, res2] = await Promise.all([
      fetch(`${baseUrl}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload()),
      }),
      fetch(`${baseUrl}/api/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingPayload()),
      }),
    ]);

    const statuses = [res1.status, res2.status].sort();
    expect(statuses).toEqual([201, 409]);

    const failedRes = res1.status === 409 ? res1 : res2;
    const failedBody = await failedRes.json();
    expect(failedBody.error.code).toBe("SLOT_ALREADY_BOOKED");
  });
});

describe("GET /api/bookings?customerContact=", () => {
  it("400 MISSING_CONTACT si no se envía customerContact", async () => {
    const res = await fetch(`${baseUrl}/api/bookings`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("MISSING_CONTACT");
  });

  it("200 con la lista de turnos del contacto", async () => {
    await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingPayload()),
    });

    const res = await fetch(`${baseUrl}/api/bookings?customerContact=juan@example.com`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookings).toHaveLength(1);
  });

  it("200 con lista vacía si el contacto no tiene turnos (no es un error)", async () => {
    const res = await fetch(`${baseUrl}/api/bookings?customerContact=nadie@example.com`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookings).toEqual([]);
  });
});

describe("DELETE /api/bookings/:id", () => {
  async function createSampleBooking() {
    const res = await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookingPayload()),
    });
    return res.json();
  }

  it("200 al cancelar una reserva propia futura", async () => {
    const booking = await createSampleBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerContact: "juan@example.com" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("cancelled");
  });

  it("404 BOOKING_NOT_FOUND si el id no existe", async () => {
    const res = await fetch(`${baseUrl}/api/bookings/no-existe`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerContact: "juan@example.com" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("BOOKING_NOT_FOUND");
  });

  it("403 NOT_YOUR_BOOKING si el contacto no coincide", async () => {
    const booking = await createSampleBooking();
    const res = await fetch(`${baseUrl}/api/bookings/${booking.id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customerContact: "otra@example.com" }),
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.error.code).toBe("NOT_YOUR_BOOKING");
  });
});
