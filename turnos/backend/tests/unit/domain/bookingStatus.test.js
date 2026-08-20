import { describe, it, expect } from 'vitest'
import { validateStatusTransition } from '../../../src/domain/bookingStatus.js'
import { AppError } from '../../../src/errors.js'

describe('domain/bookingStatus', () => {
  it('permite active -> completed, active -> no_show, active -> cancelled', () => {
    expect(() => validateStatusTransition('active', 'completed')).not.toThrow()
    expect(() => validateStatusTransition('active', 'no_show')).not.toThrow()
    expect(() => validateStatusTransition('active', 'cancelled')).not.toThrow()
  })

  it('rechaza transiciones desde un estado terminal, indicando el estado actual', () => {
    for (const current of ['completed', 'no_show', 'cancelled']) {
      try {
        validateStatusTransition(current, 'completed')
        expect.fail('debía lanzar')
      } catch (err) {
        expect(err).toBeInstanceOf(AppError)
        expect(err.code).toBe('BOOKING_NOT_ACTIVE')
        expect(err.message).toContain(current)
      }
    }
  })
})
