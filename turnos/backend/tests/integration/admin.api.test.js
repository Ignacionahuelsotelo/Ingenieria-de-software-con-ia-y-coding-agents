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

describe("GET /api/admin/bookings", () => {
  it("200 con lista vacía si no hay reservas", async () => {
    const res = await fetch(`${baseUrl}/api/admin/bookings`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookings).toEqual([]);
  });

  it("200 con todas las reservas de todos los clientes, incluidos nombre y contacto", async () => {
    await fetch(`${baseUrl}/api/bookings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startLocal: "2026-08-17T09:00:00-03:00",
        customerName: "Juan Pérez",
        customerContact: "juan@example.com",
      }),
    });

    const res = await fetch(`${baseUrl}/api/admin/bookings`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookings).toHaveLength(1);
    expect(body.bookings[0].customerName).toBe("Juan Pérez");
    expect(body.bookings[0].customerContact).toBe("juan@example.com");
  });
});
