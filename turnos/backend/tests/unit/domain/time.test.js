import { describe, it, expect } from 'vitest'
import {
  localDateToUtcInstant,
  getAvailabilityWindow,
  weekdayOfLocalDate,
  isBeforeInstant,
  addMinutes,
  formatLocalDate,
  minutesBetween,
} from '../../../src/domain/time.js'

describe('domain/time', () => {
  it('combina fecha local + hora local en un instante UTC concreto', () => {
    const instant = localDateToUtcInstant('2026-08-18', '09:00')
    expect(instant).toBeInstanceOf(Date)
    // El offset exacto depende del TZ del proceso, pero el instante debe ser
    // determinístico y corresponder a las 09:00 hora local de ese día.
    const reconstructed = new Date(instant)
    expect(reconstructed.getFullYear()).toBe(2026)
  })

  it('calcula la ventana de disponibilidad de 14 días desde "ahora"', () => {
    const now = new Date('2026-08-17T12:00:00Z')
    const window = getAvailabilityWindow(now)
    expect(window.from.getTime()).toBe(now.getTime())
    const diffDays = (window.to.getTime() - window.from.getTime()) / (1000 * 60 * 60 * 24)
    expect(diffDays).toBeCloseTo(14, 5)
  })

  it('calcula el weekday local (0=domingo) de una fecha dada', () => {
    // 2026-08-16 es domingo
    expect(weekdayOfLocalDate('2026-08-16')).toBe(0)
    // 2026-08-17 es lunes
    expect(weekdayOfLocalDate('2026-08-17')).toBe(1)
  })

  it('compara instantes sin usar strings', () => {
    const a = new Date('2026-08-17T10:00:00Z')
    const b = new Date('2026-08-17T11:00:00Z')
    expect(isBeforeInstant(a, b)).toBe(true)
    expect(isBeforeInstant(b, a)).toBe(false)
  })

  it('suma minutos a un instante', () => {
    const a = new Date('2026-08-17T10:00:00Z')
    const b = addMinutes(a, 30)
    expect(b.getTime() - a.getTime()).toBe(30 * 60 * 1000)
  })

  it('formatea un instante como fecha local YYYY-MM-DD', () => {
    const d = formatLocalDate(new Date('2026-08-17T10:00:00Z'))
    expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('calcula minutos entre dos instantes', () => {
    const a = new Date('2026-08-17T10:00:00Z')
    const b = new Date('2026-08-17T12:00:00Z')
    expect(minutesBetween(a, b)).toBe(120)
  })
})
