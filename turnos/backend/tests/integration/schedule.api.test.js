import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { createApp } from "../../src/http/app.js";
import { reset } from "../../src/store/memoryStore.js";

let server;
let baseUrl;

function validPayload() {
  return {
    slotDurationMinutes: 30,
    weeklyHours: [{ dayOfWeek: 1, ranges: [{ startLocal: "09:00", endLocal: "18:00" }] }],
  };
}

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

describe("PUT/GET /api/schedule", () => {
  it("GET antes de configurar devuelve 404 NO_SCHEDULE_CONFIGURED", async () => {
    const res = await fetch(`${baseUrl}/api/schedule`);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error.code).toBe("NO_SCHEDULE_CONFIGURED");
  });

  it("PUT con configuración válida devuelve 200 y la persiste", async () => {
    const putRes = await fetch(`${baseUrl}/api/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload()),
    });
    expect(putRes.status).toBe(200);
    const putBody = await putRes.json();
    expect(putBody.slotDurationMinutes).toBe(30);

    const getRes = await fetch(`${baseUrl}/api/schedule`);
    expect(getRes.status).toBe(200);
    const getBody = await getRes.json();
    expect(getBody.slotDurationMinutes).toBe(30);
  });

  it("PUT con configuración inválida devuelve 400 INVALID_SCHEDULE", async () => {
    const res = await fetch(`${baseUrl}/api/schedule`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload(), slotDurationMinutes: 0 }),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("INVALID_SCHEDULE");
  });
});
