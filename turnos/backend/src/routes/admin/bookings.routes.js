import { Router } from 'express'
import { ownerAuth } from '../../middleware/ownerAuth.js'
import { validateStatusTransition } from '../../domain/bookingStatus.js'
import { findByCode, updateStatus, cancelByCode } from '../../db/bookingsRepository.js'
import { bookingNotFound, bookingNotActive } from '../../errors.js'

export const adminBookingsRouter = Router()

async function transitionTo(req, res, next, newStatus) {
  try {
    const { code } = req.params
    const existing = await findByCode(code)
    if (!existing) {
      throw bookingNotFound()
    }

    validateStatusTransition(existing.status, newStatus)

    const result =
      newStatus === 'cancelled'
        ? await cancelByCode(code, 'owner')
        : await updateStatus(code, newStatus)

    if (!result.updated) {
      throw bookingNotActive(result.booking.status)
    }

    res.json({ bookingCode: result.booking.bookingCode, status: result.booking.status })
  } catch (err) {
    next(err)
  }
}

adminBookingsRouter.post('/bookings/:code/complete', ownerAuth, (req, res, next) =>
  transitionTo(req, res, next, 'completed')
)
adminBookingsRouter.post('/bookings/:code/no-show', ownerAuth, (req, res, next) =>
  transitionTo(req, res, next, 'no_show')
)
adminBookingsRouter.post('/bookings/:code/cancel', ownerAuth, (req, res, next) =>
  transitionTo(req, res, next, 'cancelled')
)
