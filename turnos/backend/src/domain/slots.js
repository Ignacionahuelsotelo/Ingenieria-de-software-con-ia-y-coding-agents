import { localDateTimeToUtc, parseHHmm, utcToLocalDateParts, rangesOverlap, isBefore } from "./time.js";

function parseDateOnly(dateStr) {
  const [year, month, day] = dateStr.split("-").map(Number);
  return { year, month: month - 1, day };
}

function toUtcMidnight({ year, month, day }) {
  return new Date(Date.UTC(year, month, day));
}

function addDays(dateParts, delta) {
  const d = new Date(Date.UTC(dateParts.year, dateParts.month, dateParts.day + delta));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth(), day: d.getUTCDate() };
}

function dayOfWeekOf(dateParts) {
  return toUtcMidnight(dateParts).getUTCDay();
}

function generateSlotsForDate(dateParts, schedule) {
  const dayOfWeek = dayOfWeekOf(dateParts);
  const dayConfig = schedule.weeklyHours.find((d) => d.dayOfWeek === dayOfWeek);
  if (!dayConfig) return [];

  const slots = [];
  for (const range of dayConfig.ranges) {
    const { hour: startHour, minute: startMinute } = parseHHmm(range.startLocal);
    const { hour: endHour, minute: endMinute } = parseHHmm(range.endLocal);
    let cursor = localDateTimeToUtc(dateParts.year, dateParts.month, dateParts.day, startHour, startMinute);
    const rangeEnd = localDateTimeToUtc(dateParts.year, dateParts.month, dateParts.day, endHour, endMinute);

    while (true) {
      const slotEnd = new Date(cursor.getTime() + schedule.slotDurationMinutes * 60000);
      if (slotEnd.getTime() > rangeEnd.getTime()) break;
      slots.push({ startUtc: cursor, endUtc: slotEnd });
      cursor = slotEnd;
    }
  }
  return slots;
}

function isGeneratedSlotStart(schedule, startUtc) {
  const dateParts = utcToLocalDateParts(startUtc);
  return generateSlotsForDate(dateParts, schedule).some((slot) => slot.startUtc.getTime() === startUtc.getTime());
}

function listAvailableSlots({ schedule, bookings, from, to, now = new Date() }) {
  if (!schedule) return [];

  const fromParts = parseDateOnly(from);
  const toParts = parseDateOnly(to);
  const toDate = toUtcMidnight(toParts);
  const activeBookings = bookings.filter((b) => b.status === "active");

  const allSlots = [];
  let cursorParts = fromParts;
  while (toUtcMidnight(cursorParts).getTime() <= toDate.getTime()) {
    allSlots.push(...generateSlotsForDate(cursorParts, schedule));
    cursorParts = addDays(cursorParts, 1);
  }

  return allSlots.filter((slot) => {
    if (!isBefore(now, slot.startUtc)) return false;
    const isBooked = activeBookings.some((b) => rangesOverlap(slot.startUtc, slot.endUtc, b.startUtc, b.endUtc));
    return !isBooked;
  });
}

export { listAvailableSlots, isGeneratedSlotStart, generateSlotsForDate };
