// Reglas puras de bloqueos puntuales (Principio II).

import { invalidBlock } from '../errors.js'

/** Valida que un rango de bloqueo tenga fin > inicio. */
export function validateBlockRange(startsAt, endsAt) {
  if (!(endsAt.getTime() > startsAt.getTime())) {
    throw invalidBlock('El fin del bloqueo debe ser posterior al inicio.')
  }
}

/**
 * ¿Un slot [start, end) se solapa (total o parcialmente) con un bloqueo
 * [startsAt, endsAt)? Dos intervalos semiabiertos se solapan si
 * slot.start < block.endsAt && slot.end > block.startsAt.
 */
export function slotOverlapsBlock(slot, block) {
  return slot.start.getTime() < block.endsAt.getTime() && slot.end.getTime() > block.startsAt.getTime()
}
