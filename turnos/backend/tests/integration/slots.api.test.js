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
});

describe("GET /api/slots", () => {
  it("404 NO_SCHEDULE_CONFIGURED si no hay horario configurado", async () => {
    const res = await fetch(`${baseUrl}/api/slots?from=2026-08-17&to=2026-08-17`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NO_SCHEDULE_CONFIGURED");
  });

  it("400 INVALID_RANGE si falta from/to o to es anterior a from", async () => {
    setSchedule({ slotDurationMinutes: 30, weeklyHours: [{ dayOfWeek: 1, ranges: [{ startLocal: "09:00", endLocal: "10:00" }] }], updatedAt: new Date() });
    const res = await fetch(`${baseUrl}/api/slots?from=2026-08-17&to=2026-08-16`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_RANGE");
  });

  it("200 con la lista de slots disponibles dentro del rango", async () => {
    setSchedule({ slotDurationMinutes: 30, weeklyHours: [{ dayOfWeek: 1, ranges: [{ startLocal: "09:00", endLocal: "10:00" }] }], updatedAt: new Date() });
    const res = await fetch(`${baseUrl}/api/slots?from=2026-08-17&to=2026-08-17`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.slots)).toBe(true);
  });
});
