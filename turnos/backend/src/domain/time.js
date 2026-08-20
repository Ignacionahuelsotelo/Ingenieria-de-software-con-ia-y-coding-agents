// Utilidades de tiempo puras (Principio II: sin Express ni pg).
//
// Todo instante interno es un `Date` (equivalente a un timestamptz UTC). La
// timezone local del servidor se usa únicamente en los bordes explícitos de
// este módulo (combinar fecha+hora local en un instante, y formatear un
// instante como fecha local) — nunca se compara por string (Principio III).

const AVAILABILITY_WINDOW_DAYS = 14

/**
 * Combina una fecha local (YYYY-MM-DD) y una hora local (HH:mm) —
 * interpretadas en la timezone local del proceso Node — en un instante UTC
 * concreto (`Date`).
 */
export function localDateToUtcInstant(localDate, localTime) {
  const [year, month, day] = localDate.split('-').map(Number)
  const [hours, minutes] = localTime.split(':').map(Number)
  // new Date(year, monthIndex, day, hours, minutes) interpreta los
  // componentes en la timezone local del proceso y produce el instante UTC
  // correspondiente internamente.
  return new Date(year, month - 1, day, hours, minutes, 0, 0)
}

/**
 * Ventana de disponibilidad: desde `now` (instante) hasta `now` + 14 días.
 */
export function getAvailabilityWindow(now = new Date()) {
  const from = new Date(now.getTime())
  const to = addMinutes(from, AVAILABILITY_WINDOW_DAYS * 24 * 60)
  return { from, to }
}

/**
 * Weekday local (0=domingo..6=sábado) de una fecha YYYY-MM-DD, interpretada
 * en la timezone local del proceso.
 */
export function weekdayOfLocalDate(localDate) {
  const [year, month, day] = localDate.split('-').map(Number)
  return new Date(year, month - 1, day).getDay()
}

/** Compara dos instantes: ¿a es estrictamente anterior a b? */
export function isBeforeInstant(a, b) {
  return a.getTime() < b.getTime()
}

/** Suma minutos a un instante y devuelve un nuevo instante. */
export function addMinutes(instant, minutes) {
  return new Date(instant.getTime() + minutes * 60 * 1000)
}

/** Formatea un instante como fecha local YYYY-MM-DD (timezone del proceso). */
export function formatLocalDate(instant) {
  const year = instant.getFullYear()
  const month = String(instant.getMonth() + 1).padStart(2, '0')
  const day = String(instant.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/** Minutos transcurridos entre dos instantes (b - a). */
export function minutesBetween(a, b) {
  return (b.getTime() - a.getTime()) / (1000 * 60)
}

export { AVAILABILITY_WINDOW_DAYS }
