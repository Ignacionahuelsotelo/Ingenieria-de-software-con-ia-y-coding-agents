import { Router } from 'express'
import { ownerAuth } from '../../middleware/ownerAuth.js'
import { findByDate } from '../../db/bookingsRepository.js'
import { localDateToUtcInstant, addMinutes } from '../../domain/time.js'
import { invalidSlot } from '../../errors.js'

export const agendaRouter = Router()

agendaRouter.get('/agenda', ownerAuth, async (req, res, next) => {
  try {
    const { date } = req.query
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw invalidSlot('Falta el parámetro "date" (YYYY-MM-DD) para consultar la agenda.')
    }

    const dayStart = localDateToUtcInstant(date, '00:00')
    const dayEnd = addMinutes(dayStart, 24 * 60)

    const bookings = await findByDate(dayStart, dayEnd)
    res.json({ date, bookings })
  } catch (err) {
    next(err)
  }
})
