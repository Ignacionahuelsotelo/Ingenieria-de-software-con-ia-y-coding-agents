const BARBERSHOP_TIMEZONE = "America/Argentina/Buenos_Aires";

function offsetMinutesForZone(zone, date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    parts.hour === "24" ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );
  return (asUtc - date.getTime()) / 60000;
}

/**
 * Convierte una fecha (dayOfWeek-relative) + hora local "HH:mm" de la timezone de la
 * barbería a un Date en UTC.
 */
function localDateTimeToUtc(year, month, day, hourLocal, minuteLocal) {
  const naiveUtcGuess = new Date(Date.UTC(year, month, day, hourLocal, minuteLocal));
  const offsetMinutes = offsetMinutesForZone(BARBERSHOP_TIMEZONE, naiveUtcGuess);
  return new Date(naiveUtcGuess.getTime() - offsetMinutes * 60000);
}

function parseHHmm(hhmm) {
  const [hour, minute] = hhmm.split(":").map(Number);
  return { hour, minute };
}

function utcToLocalIso(date) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: BARBERSHOP_TIMEZONE,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  const offsetMinutes = offsetMinutesForZone(BARBERSHOP_TIMEZONE, date);
  const sign = offsetMinutes < 0 ? "-" : "+";
  const abs = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(abs / 60)).padStart(2, "0");
  const offsetMins = String(abs % 60).padStart(2, "0");
  const hour = parts.hour === "24" ? "00" : parts.hour;
  return `${parts.year}-${parts.month}-${parts.day}T${hour}:${parts.minute}:${parts.second}${sign}${offsetHours}:${offsetMins}`;
}

function utcToLocalDateParts(date) {
  const dtf = new Intl.DateTimeFormat("en-CA", {
    timeZone: BARBERSHOP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = dtf.formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return { year: Number(parts.year), month: Number(parts.month) - 1, day: Number(parts.day) };
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA.getTime() < endB.getTime() && startB.getTime() < endA.getTime();
}

function isBefore(dateA, dateB) {
  return dateA.getTime() < dateB.getTime();
}

export {
  BARBERSHOP_TIMEZONE,
  localDateTimeToUtc,
  parseHHmm,
  utcToLocalIso,
  utcToLocalDateParts,
  rangesOverlap,
  isBefore,
};
