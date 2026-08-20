import { describe, it, expect } from 'vitest'
import { validateWeeklySchedule, validateSlotDuration } from '../../../src/domain/schedule.js'
import { AppError } from '../../../src/errors.js'

function baseSchedule() {
  return Array.from({ length: 7 }, (_, weekday) => ({
    weekday,
    isOpen: weekday >= 1 && weekday <= 5,
    startTime: weekday >= 1 && weekday <= 5 ? '09:00' : null,
    endTime: weekday >= 1 && weekday <= 5 ? '18:00' : null,
  }))
}

describe('domain/schedule', () => {
  it('acepta un horario semanal válido (fin > inicio en días abiertos)', () => {
    expect(() => validateWeeklySchedule(baseSchedule())).not.toThrow()
  })

  it('rechaza un día abierto con fin <= inicio, indicando el weekday afectado', () => {
    const schedule = baseSchedule()
    schedule[1] = { weekday: 1, isOpen: true, startTime: '18:00', endTime: '09:00' }

    try {
      validateWeeklySchedule(schedule)
      expect.fail('debía lanzar')
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      expect(err.code).toBe('INVALID_SCHEDULE')
      expect(err.field).toBe('weekday:1')
    }
  })

  it('rechaza un día cerrado con start/end no nulos', () => {
    const schedule = baseSchedule()
    schedule[0] = { weekday: 0, isOpen: false, startTime: '09:00', endTime: '18:00' }

    expect(() => validateWeeklySchedule(schedule)).toThrow(AppError)
  })

  it('acepta una duración de turno positiva', () => {
    expect(() => validateSlotDuration(30)).not.toThrow()
  })

  it('rechaza una duración de turno <= 0 con mensaje accionable', () => {
    try {
      validateSlotDuration(0)
      expect.fail('debía lanzar')
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      expect(err.code).toBe('INVALID_SCHEDULE')
      expect(err.field).toBe('slotDurationMinutes')
    }
  })
})
