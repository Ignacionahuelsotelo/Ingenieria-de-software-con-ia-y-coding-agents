// Generación/validación de código de reserva (Principio II).
// Alfabeto sin ambiguos: excluye O, 0, I, 1 (FR-027).

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const CODE_LENGTH = 8

export function generateBookingCode() {
  let code = ''
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)]
  }
  return code
}

const FORMAT_RE = new RegExp(`^[${ALPHABET}]{${CODE_LENGTH}}$`)

export function isValidBookingCodeFormat(code) {
  return typeof code === 'string' && FORMAT_RE.test(code)
}
