import { describe, it, expect } from 'vitest'
import { generateBookingCode, isValidBookingCodeFormat } from '../../../src/domain/bookingCode.js'

describe('domain/bookingCode', () => {
  it('genera un código de 8 caracteres del alfabeto sin ambiguos', () => {
    const code = generateBookingCode()
    expect(code).toHaveLength(8)
    expect(code).toMatch(/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/)
  })

  it('genera códigos distintos en llamadas sucesivas (alta probabilidad)', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateBookingCode()))
    expect(codes.size).toBeGreaterThan(45)
  })

  it('valida el formato de un código', () => {
    expect(isValidBookingCodeFormat('3F7K9RTQ')).toBe(true)
    expect(isValidBookingCodeFormat('short')).toBe(false)
    expect(isValidBookingCodeFormat('OOOO0000')).toBe(false) // caracteres ambiguos
  })
})
