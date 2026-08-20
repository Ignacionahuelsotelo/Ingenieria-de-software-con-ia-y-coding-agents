import { describe, it, expect } from 'vitest'
import { validateBlockRange, slotOverlapsBlock } from '../../../src/domain/blocks.js'
import { AppError } from '../../../src/errors.js'

describe('domain/blocks', () => {
  it('acepta un rango de bloqueo válido (ends > starts)', () => {
    const startsAt = new Date('2026-08-18T14:00:00Z')
    const endsAt = new Date('2026-08-18T16:00:00Z')
    expect(() => validateBlockRange(startsAt, endsAt)).not.toThrow()
  })

  it('rechaza un rango de bloqueo con fin <= inicio', () => {
    const startsAt = new Date('2026-08-18T16:00:00Z')
    const endsAt = new Date('2026-08-18T14:00:00Z')
    try {
      validateBlockRange(startsAt, endsAt)
      expect.fail('debía lanzar')
    } catch (err) {
      expect(err).toBeInstanceOf(AppError)
      expect(err.code).toBe('INVALID_BLOCK')
    }
  })

  it('detecta solapamiento total de un slot con un bloqueo', () => {
    const block = { startsAt: new Date('2026-08-18T14:00:00Z'), endsAt: new Date('2026-08-18T16:00:00Z') }
    const slot = { start: new Date('2026-08-18T14:30:00Z'), end: new Date('2026-08-18T15:00:00Z') }
    expect(slotOverlapsBlock(slot, block)).toBe(true)
  })

  it('detecta solapamiento parcial (el slot empieza antes y termina dentro del bloqueo) como bloqueado', () => {
    const block = { startsAt: new Date('2026-08-18T14:00:00Z'), endsAt: new Date('2026-08-18T16:00:00Z') }
    const slot = { start: new Date('2026-08-18T13:45:00Z'), end: new Date('2026-08-18T14:15:00Z') }
    expect(slotOverlapsBlock(slot, block)).toBe(true)
  })

  it('no detecta solapamiento si el slot termina exactamente cuando empieza el bloqueo', () => {
    const block = { startsAt: new Date('2026-08-18T14:00:00Z'), endsAt: new Date('2026-08-18T16:00:00Z') }
    const slot = { start: new Date('2026-08-18T13:30:00Z'), end: new Date('2026-08-18T14:00:00Z') }
    expect(slotOverlapsBlock(slot, block)).toBe(false)
  })
})
