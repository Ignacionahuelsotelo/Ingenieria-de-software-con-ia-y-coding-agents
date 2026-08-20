// Contrato de error uniforme (Principio VII, contracts/api.md).

export class AppError extends Error {
  constructor({ code, message, field = null, status }) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.field = field
    this.status = status
  }

  toJSON() {
    return { error: { code: this.code, message: this.message, field: this.field } }
  }
}

export function missingField(field) {
  return new AppError({
    code: 'MISSING_FIELD',
    message: `Falta el campo "${field}". Completalo para continuar.`,
    field,
    status: 400,
  })
}

export function invalidSchedule(field, message) {
  return new AppError({ code: 'INVALID_SCHEDULE', message, field, status: 400 })
}

export function invalidBlock(message) {
  return new AppError({ code: 'INVALID_BLOCK', message, field: null, status: 400 })
}

export function invalidSlot(message) {
  return new AppError({ code: 'INVALID_SLOT', message, field: null, status: 400 })
}

export function slotAlreadyBooked() {
  return new AppError({
    code: 'SLOT_ALREADY_BOOKED',
    message: 'Ese turno ya no está disponible. Elegí otro horario.',
    field: null,
    status: 409,
  })
}

export function slotBlocked() {
  return new AppError({
    code: 'SLOT_BLOCKED',
    message: 'Ese horario está bloqueado por el dueño. Elegí otro horario.',
    field: null,
    status: 409,
  })
}

export function bookingNotFound() {
  return new AppError({
    code: 'BOOKING_NOT_FOUND',
    message: 'No encontramos ningún turno con ese código.',
    field: null,
    status: 404,
  })
}

export function bookingNotActive(currentStatus) {
  return new AppError({
    code: 'BOOKING_NOT_ACTIVE',
    message: `Este turno ya está en estado "${currentStatus}" y no admite esta acción.`,
    field: null,
    status: 409,
  })
}

export function cancellationWindowClosed() {
  return new AppError({
    code: 'CANCELLATION_WINDOW_CLOSED',
    message:
      'Faltan menos de 2 horas para el turno, así que no se puede cancelar online. Contactá al dueño directamente.',
    field: null,
    status: 403,
  })
}

export function blockNotFound() {
  return new AppError({
    code: 'BLOCK_NOT_FOUND',
    message: 'No encontramos ningún bloqueo con ese id.',
    field: null,
    status: 404,
  })
}

export function unauthorized() {
  return new AppError({
    code: 'UNAUTHORIZED',
    message: 'Clave de dueño ausente o incorrecta.',
    field: null,
    status: 401,
  })
}

export function tooManyRequests() {
  return new AppError({
    code: 'TOO_MANY_REQUESTS',
    message: 'Demasiados intentos. Esperá un momento antes de volver a intentar.',
    field: null,
    status: 429,
  })
}
