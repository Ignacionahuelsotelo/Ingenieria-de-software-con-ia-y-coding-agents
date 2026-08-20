import { describe, it, expect } from 'vitest'
import { computeAvailableSlots } from '../../../src/domain/availability.js'
import { localDateToUtcInstant } from '../../../src/domain/time.js'

function schedule(weekday, isOpen, startTime, endTime) {
  return { weekday, isOpen, startTime, endTime }
}

// Usamos localDateToUtcInstant (mismo módulo que el dominio) para construir
// los instantes esperados: el test no asume una timezone de servidor
// concreta (Principio III), solo que la conversión sea consistente.
const LOCAL_DATE = '2026-08-17' // debe ser lunes en la timezone del proceso de test

describe('domain/availability', () => {
  it('genera slots candidatos a partir de horario + duración, dentro del rango', () => {
    const weeklySchedule = [schedule(1, true, '09:00', '10:00')]
    const from = localDateToUtcInstant(LOCAL_DATE, '00:00')
    const to = localDateToUtcInstant('2026-08-18', '00:00')

    const days = computeAvailableSlots({
      weeklySchedule,
      slotDurationMinutes: 30,
      blocks: [],
      activeBookings: [],
      from,
      to,
      now: from,
    })

    const targetDay = days.find((d) => d.date === LOCAL_DATE)
    expect(targetDay.slots).toHaveLength(2)
  })

  it('excluye slots que se solapan total o parcialmente con un bloqueo', () => {
    const weeklySchedule = [schedule(1, true, '09:00', '11:00')]
    const from = localDateToUtcInstant(LOCAL_DATE, '00:00')
    const to = localDateToUtcInstant('2026-08-18', '00:00')
    const blocks = [
      {
        startsAt: localDateToUtcInstant(LOCAL_DATE, '09:45'),
        endsAt: localDateToUtcInstant(LOCAL_DATE, '10:15'),
      },
    ]

    const days = computeAvailableSlots({
      weeklySchedule,
      slotDurationMinutes: 30,
      blocks,
      activeBookings: [],
      from,
      to,
      now: from,
    })

    const starts = days[0].slots.map((s) => s.start)
    const expectStart = (t) => localDateToUtcInstant(LOCAL_DATE, t).toISOString()

    expect(starts).toContain(expectStart('09:00'))
    expect(starts).not.toContain(expectStart('09:30')) // solapa parcialmente con el bloqueo
    expect(starts).not.toContain(expectStart('10:00')) // solapa parcialmente con el bloqueo
    expect(starts).toContain(expectStart('10:30'))
  })

  it('excluye slots con una reserva activa', () => {
    const weeklySchedule = [schedule(1, true, '09:00', '10:00')]
    const from = localDateToUtcInstant(LOCAL_DATE, '00:00')
    const to = localDateToUtcInstant('2026-08-18', '00:00')
    const activeBookings = [{ slotStart: localDateToUtcInstant(LOCAL_DATE, '09:00') }]

    const days = computeAvailableSlots({
      weeklySchedule,
      slotDurationMinutes: 30,
      blocks: [],
      activeBookings,
      from,
      to,
      now: from,
    })

    const starts = days[0].slots.map((s) => s.start)
    const expectStart = (t) => localDateToUtcInstant(LOCAL_DATE, t).toISOString()

    expect(starts).not.toContain(expectStart('09:00'))
    expect(starts).toContain(expectStart('09:30'))
  })

  it('excluye slots que ya pasaron respecto de "now"', () => {
    const weeklySchedule = [schedule(1, true, '09:00', '10:00')]
    const from = localDateToUtcInstant(LOCAL_DATE, '00:00')
    const to = localDateToUtcInstant('2026-08-18', '00:00')
    const now = localDateToUtcInstant(LOCAL_DATE, '09:15')

    const days = computeAvailableSlots({
      weeklySchedule,
      slotDurationMinutes: 30,
      blocks: [],
      activeBookings: [],
      from,
      to,
      now,
    })

    const starts = days[0].slots.map((s) => s.start)
    const expectStart = (t) => localDateToUtcInstant(LOCAL_DATE, t).toISOString()

    expect(starts).not.toContain(expectStart('09:00'))
    expect(starts).toContain(expectStart('09:30'))
  })
})
