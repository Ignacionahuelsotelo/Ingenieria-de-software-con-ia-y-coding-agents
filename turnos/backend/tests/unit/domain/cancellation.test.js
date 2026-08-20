import { describe, it, expect } from 'vitest'
import { canCancel } from '../../../src/domain/cancellation.js'

describe('domain/cancellation', () => {
  it('permite cancelar un turno activo a más de 2h de antelación', () => {
    const now = new Date('2026-08-18T10:00:00Z')
    const slotStart = new Date('2026-08-18T13:00:00Z')
    expect(canCancel({ status: 'active', slotStart }, now)).toBe(true)
  })

  it('no permite cancelar un turno a menos de 2h de antelación', () => {
    const now = new Date('2026-08-18T10:00:00Z')
    const slotStart = new Date('2026-08-18T11:30:00Z')
    expect(canCancel({ status: 'active', slotStart }, now)).toBe(false)
  })

  it('caso límite: exactamente 2h de antelación permite cancelar', () => {
    const now = new Date('2026-08-18T10:00:00Z')
    const slotStart = new Date('2026-08-18T12:00:00Z')
    expect(canCancel({ status: 'active', slotStart }, now)).toBe(true)
  })

  it('no permite cancelar un turno que no está activo', () => {
    const now = new Date('2026-08-18T10:00:00Z')
    const slotStart = new Date('2026-08-18T15:00:00Z')
    expect(canCancel({ status: 'completed', slotStart }, now)).toBe(false)
    expect(canCancel({ status: 'cancelled', slotStart }, now)).toBe(false)
    expect(canCancel({ status: 'no_show', slotStart }, now)).toBe(false)
  })
})
