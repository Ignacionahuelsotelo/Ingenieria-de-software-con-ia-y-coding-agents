import { describe, it, expect, beforeEach } from "vitest";
import { setSchedule, getSchedule } from "../../src/domain/schedule.js";
import { reset } from "../../src/store/memoryStore.js";

function expectInvalidSchedule(fn) {
  expect(fn).toThrow();
  try {
    fn();
  } catch (err) {
    expect(err.code).toBe("INVALID_SCHEDULE");
  }
}

function validInput() {
  return {
    slotDurationMinutes: 30,
    weeklyHours: [
      { dayOfWeek: 1, ranges: [{ startLocal: "09:00", endLocal: "13:00" }, { startLocal: "14:00", endLocal: "18:00" }] },
      { dayOfWeek: 2, ranges: [{ startLocal: "09:00", endLocal: "18:00" }] },
    ],
  };
}

describe("domain/schedule", () => {
  beforeEach(() => {
    reset();
  });

  it("guarda una configuración válida y permite recuperarla", () => {
    const saved = setSchedule(validInput());
    expect(saved.slotDurationMinutes).toBe(30);
    expect(getSchedule().slotDurationMinutes).toBe(30);
    expect(getSchedule().updatedAt).toBeInstanceOf(Date);
  });

  it("rechaza slotDurationMinutes <= 0", () => {
    const input = { ...validInput(), slotDurationMinutes: 0 };
    expectInvalidSchedule(() => setSchedule(input));
  });

  it("rechaza slotDurationMinutes no entero", () => {
    const input = { ...validInput(), slotDurationMinutes: 15.5 };
    expectInvalidSchedule(() => setSchedule(input));
  });

  it("rechaza un rango con endLocal anterior o igual a startLocal", () => {
    const input = validInput();
    input.weeklyHours[0].ranges[0] = { startLocal: "13:00", endLocal: "09:00" };
    expectInvalidSchedule(() => setSchedule(input));
  });

  it("rechaza rangos solapados dentro del mismo día", () => {
    const input = validInput();
    input.weeklyHours[0].ranges = [
      { startLocal: "09:00", endLocal: "13:00" },
      { startLocal: "12:00", endLocal: "15:00" },
    ];
    expectInvalidSchedule(() => setSchedule(input));
  });

  it("rechaza dayOfWeek fuera de 0-6", () => {
    const input = validInput();
    input.weeklyHours[0].dayOfWeek = 7;
    expectInvalidSchedule(() => setSchedule(input));
  });

  it("no afecta la configuración anterior si la nueva es inválida", () => {
    setSchedule(validInput());
    const invalid = { ...validInput(), slotDurationMinutes: -5 };
    expect(() => setSchedule(invalid)).toThrow();
    expect(getSchedule().slotDurationMinutes).toBe(30);
  });
});
