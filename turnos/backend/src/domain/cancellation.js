// Regla pura de ventana de cancelación por parte del cliente (Principio II).

const CANCELLATION_WINDOW_MINUTES = 120

/** ¿Puede cancelarse este turno online? Activo + al menos 2h de antelación. */
export function canCancel(booking, now = new Date()) {
  if (booking.status !== 'active') return false
  const minutesUntilSlot = (booking.slotStart.getTime() - now.getTime()) / (1000 * 60)
  return minutesUntilSlot >= CANCELLATION_WINDOW_MINUTES
}

export { CANCELLATION_WINDOW_MINUTES }
