// Reglas puras de transición de estado de una reserva (Principio II, FR-020).

import { bookingNotActive } from '../errors.js'

const TERMINAL_STATES = new Set(['completed', 'no_show', 'cancelled'])

/**
 * Valida que una transición de estado sea permitida. Solo se puede salir de
 * `active`; los estados terminales no admiten ninguna transición.
 */
export function validateStatusTransition(currentStatus, _newStatus) {
  if (currentStatus !== 'active' || TERMINAL_STATES.has(currentStatus)) {
    throw bookingNotActive(currentStatus)
  }
}
