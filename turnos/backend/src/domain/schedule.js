import { getSchedule as storeGetSchedule, setSchedule as storeSetSchedule } from "../store/memoryStore.js";

class ScheduleValidationError extends Error {
  constructor(message) {
    super(message);
    this.code = "INVALID_SCHEDULE";
    this.statusCode = 400;
  }
}

function isValidHHmm(value) {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function toMinutes(hhmm) {
  const [hour, minute] = hhmm.split(":").map(Number);
  return hour * 60 + minute;
}

function validate(input) {
  if (
    typeof input.slotDurationMinutes !== "number" ||
    !Number.isInteger(input.slotDurationMinutes) ||
    input.slotDurationMinutes <= 0
  ) {
    throw new ScheduleValidationError("slotDurationMinutes debe ser un entero mayor a 0.");
  }

  if (!Array.isArray(input.weeklyHours)) {
    throw new ScheduleValidationError("weeklyHours debe ser un arreglo.");
  }

  for (const day of input.weeklyHours) {
    if (!Number.isInteger(day.dayOfWeek) || day.dayOfWeek < 0 || day.dayOfWeek > 6) {
      throw new ScheduleValidationError("dayOfWeek debe ser un entero entre 0 y 6.");
    }

    if (!Array.isArray(day.ranges) || day.ranges.length === 0) {
      throw new ScheduleValidationError("Cada día debe tener al menos un rango horario.");
    }

    const normalizedRanges = day.ranges.map((range) => {
      if (!isValidHHmm(range.startLocal) || !isValidHHmm(range.endLocal)) {
        throw new ScheduleValidationError("startLocal/endLocal deben tener formato HH:mm.");
      }
      const start = toMinutes(range.startLocal);
      const end = toMinutes(range.endLocal);
      if (end <= start) {
        throw new ScheduleValidationError("endLocal debe ser posterior a startLocal.");
      }
      return { start, end };
    });

    normalizedRanges.sort((a, b) => a.start - b.start);
    for (let i = 1; i < normalizedRanges.length; i++) {
      if (normalizedRanges[i].start < normalizedRanges[i - 1].end) {
        throw new ScheduleValidationError("Los rangos de un mismo día no deben solaparse.");
      }
    }
  }
}

function setSchedule(input) {
  validate(input);
  const schedule = {
    slotDurationMinutes: input.slotDurationMinutes,
    weeklyHours: input.weeklyHours.map((day) => ({
      dayOfWeek: day.dayOfWeek,
      ranges: day.ranges.map((range) => ({ startLocal: range.startLocal, endLocal: range.endLocal })),
    })),
    updatedAt: new Date(),
  };
  return storeSetSchedule(schedule);
}

function getSchedule() {
  return storeGetSchedule();
}

export { setSchedule, getSchedule, ScheduleValidationError };
