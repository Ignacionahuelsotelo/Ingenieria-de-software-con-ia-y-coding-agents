import { Router } from 'express'
import { ownerAuth } from '../../middleware/ownerAuth.js'
import { validateBlockRange } from '../../domain/blocks.js'
import { createBlock, deleteBlock } from '../../db/blocksRepository.js'
import { blockNotFound, invalidBlock } from '../../errors.js'

export const blocksRouter = Router()

blocksRouter.post('/blocks', ownerAuth, async (req, res, next) => {
  try {
    const { startsAt, endsAt, reason } = req.body ?? {}
    if (!startsAt || !endsAt) {
      throw invalidBlock('Faltan startsAt/endsAt para crear el bloqueo.')
    }
    const startsAtDate = new Date(startsAt)
    const endsAtDate = new Date(endsAt)
    validateBlockRange(startsAtDate, endsAtDate)

    const { block, cancelledBookings } = await createBlock(startsAtDate, endsAtDate, reason)
    res.status(201).json({ ...block, cancelledBookings })
  } catch (err) {
    next(err)
  }
})

blocksRouter.delete('/blocks/:id', ownerAuth, async (req, res, next) => {
  try {
    const id = Number(req.params.id)
    const deleted = await deleteBlock(id)
    if (!deleted) {
      throw blockNotFound()
    }
    res.json({ id, deleted: true })
  } catch (err) {
    next(err)
  }
})
