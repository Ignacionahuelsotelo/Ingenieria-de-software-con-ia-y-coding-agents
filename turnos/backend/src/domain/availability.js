// Cálculo puro de disponibilidad (Principio II): recibe horario/bloqueos/
// reservas ya leídos de la DB y devuelve los slots candidatos agrupados por
// día calendario local.

import { localDateToUtcInstant, formatLocalDate, weekdayOfLocalDate, addMinutes } from './time.js'
import { slotOverlapsBlock } from './blocks.js'

function eachLocalDate(from, to) {
  const dates = []
  let cursor = formatLocalDate(from)
  const end = formatLocalDate(to)
  // Recorremos por fecha local hasta incluir el día de `to`.
  while (true) {
    dates.push(cursor)
    if (cursor === end) break
    const [y, m, d] = cursor.split('-').map(Number)
    const next = new Date(y, m - 1, d + 1)
    cursor = formatLocalDate(next)
    if (dates.length > 400) break // salvaguarda
  }
  return dates
}

/**
 * @param {object} params
 * @param {Array} params.weeklySchedule - filas { weekday, isOpen, startTime, endTime }
 * @param {number} params.slotDurationMinutes
 * @param {Array} params.blocks - [{ startsAt: Date, endsAt: Date }]
 * @param {Array} params.activeBookings - [{ slotStart: Date }]
 * @param {Date} params.from
 * @param {Date} params.to
 * @param {Date} params.now
 */
export function computeAvailableSlots({
  weeklySchedule,
  slotDurationMinutes,
  blocks,
  activeBookings,
  from,
  to,
  now,
}) {
  const scheduleByWeekday = new Map(weeklySchedule.map((d) => [d.weekday, d]))
  const bookedStarts = new Set(activeBookings.map((b) => b.slotStart.getTime()))

  const days = []

  for (const localDate of eachLocalDate(from, to)) {
    const weekday = weekdayOfLocalDate(localDate)
    const daySchedule = scheduleByWeekday.get(weekday)
    const slots = []

    if (daySchedule && daySchedule.isOpen) {
      let cursor = localDateToUtcInstant(localDate, daySchedule.startTime)
      const dayEnd = localDateToUtcInstant(localDate, daySchedule.endTime)

      while (cursor.getTime() + slotDurationMinutes * 60 * 1000 <= dayEnd.getTime()) {
        const slotEnd = addMinutes(cursor, slotDurationMinutes)
        const slot = { start: cursor, end: slotEnd }

        const withinWindow = cursor.getTime() >= from.getTime() && cursor.getTime() < to.getTime()
        const isPast = cursor.getTime() < now.getTime()
        const isBlocked = blocks.some((block) => slotOverlapsBlock(slot, block))
        const isBooked = bookedStarts.has(cursor.getTime())

        if (withinWindow && !isPast && !isBlocked && !isBooked) {
          slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() })
        }

        cursor = slotEnd
      }
    }

    days.push({ date: localDate, slots })
  }

  return days
}
