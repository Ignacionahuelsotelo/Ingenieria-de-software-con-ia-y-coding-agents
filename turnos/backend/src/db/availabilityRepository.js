import { pool } from './pool.js'
import { getWeeklySchedule, getScheduleSettings } from './scheduleRepository.js'

/**
 * Lee horario semanal + duración de turno, bloqueos activos y reservas
 * activas dentro del rango [from, to), para alimentar
 * domain/availability.js.
 */
export async function loadAvailabilityInputs(from, to) {
  const [weeklySchedule, slotDurationMinutes, blocksResult, bookingsResult] = await Promise.all([
    getWeeklySchedule(),
    getScheduleSettings(),
    pool.query('select starts_at, ends_at from blocks where starts_at < $2 and ends_at > $1', [from, to]),
    pool.query(
      "select slot_start from bookings where status = 'active' and slot_start >= $1 and slot_start < $2",
      [from, to]
    ),
  ])

  return {
    weeklySchedule,
    slotDurationMinutes,
    blocks: blocksResult.rows.map((r) => ({ startsAt: r.starts_at, endsAt: r.ends_at })),
    activeBookings: bookingsResult.rows.map((r) => ({ slotStart: r.slot_start })),
  }
}
