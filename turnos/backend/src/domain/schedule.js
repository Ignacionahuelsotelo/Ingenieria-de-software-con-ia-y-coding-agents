// Reglas puras de horario semanal y duración de turno (Principio II).

import { invalidSchedule } from '../errors.js'

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

/**
 * Valida el horario semanal completo (7 filas, una por weekday). Lanza
 * AppError INVALID_SCHEDULE con `field` indicando el weekday afectado
 * (`weekday:<n>`) si algo es inválido. Devuelve el mismo array si es válido.
 */
export function validateWeeklySchedule(weeklySchedule) {
  for (const day of weeklySchedule) {
    const { weekday, isOpen, startTime, endTime } = day

    if (isOpen) {
      if (!startTime || !endTime) {
        throw invalidSchedule(
          `weekday:${weekday}`,
          `El día ${weekday} está marcado como abierto pero falta la hora de inicio o de fin.`
        )
      }
      if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
        throw invalidSchedule(`weekday:${weekday}`, `El día ${weekday} tiene un formato de hora inválido (usar HH:mm).`)
      }
      if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
        throw invalidSchedule(
          `weekday:${weekday}`,
          `El día ${weekday}: la hora de fin (${endTime}) debe ser posterior a la de inicio (${startTime}).`
        )
      }
    } else if (startTime !== null || endTime !== null) {
      throw invalidSchedule(
        `weekday:${weekday}`,
        `El día ${weekday} está cerrado, así que no debe tener hora de inicio ni de fin.`
      )
    }
  }

  return weeklySchedule
}

/** Valida la duración de turno (minutos, > 0). */
export function validateSlotDuration(minutes) {
  if (typeof minutes !== 'number' || !Number.isFinite(minutes) || minutes <= 0) {
    throw invalidSchedule(
      'slotDurationMinutes',
      'La duración del turno debe ser un número de minutos mayor que 0.'
    )
  }
  return minutes
}
