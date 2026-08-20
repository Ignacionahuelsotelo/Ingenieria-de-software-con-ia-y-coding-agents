import { Router } from 'express'
import { computeAvailableSlots } from '../domain/availability.js'
import { addMinutes } from '../domain/time.js'
import { canCancel } from '../domain/cancellation.js'
import { loadAvailabilityInputs } from '../db/availabilityRepository.js'
import { createBooking, findByCode, cancelByCode } from '../db/bookingsRepository.js'
import { createRateLimit } from '../middleware/rateLimit.js'
import {
  missingField,
  invalidSlot,
  slotBlocked,
  bookingNotFound,
  bookingNotActive,
  cancellationWindowClosed,
} from '../errors.js'
import { isValidBookingCodeFormat } from '../domain/bookingCode.js'

export const bookingsRouter = Router()

const codeLookupRateLimit = createRateLimit({ windowMs: 60_000, max: 20 })

bookingsRouter.post('/bookings', async (req, res, next) => {
  try {
    const { slotStart, customerName, customerPhone } = req.body ?? {}

    if (!customerName || !String(customerName).trim()) {
      throw missingField('customerName')
    }
    if (!customerPhone || !String(customerPhone).trim()) {
      throw missingField('customerPhone')
    }
    if (!slotStart) {
      throw missingField('slotStart')
    }

    const slotStartDate = new Date(slotStart)
    if (Number.isNaN(slotStartDate.getTime())) {
      throw invalidSlot('El horario elegido no es una fecha válida.')
    }

    const now = new Date()
    if (slotStartDate.getTime() < now.getTime()) {
      throw invalidSlot('Ese horario ya pasó. Elegí un horario futuro.')
    }

    const inputs = await loadAvailabilityInputs(slotStartDate, addMinutes(slotStartDate, 1))
    const slotEndDate = addMinutes(slotStartDate, inputs.slotDurationMinutes)

    const days = computeAvailableSlots({
      ...inputs,
      activeBookings: [], // el doble-booking real lo garantiza el índice único en Postgres
      from: slotStartDate,
      to: slotEndDate,
      now,
    })
    const matchesGrid = days.some((d) => d.slots.some((s) => s.start === slotStartDate.toISOString()))

    if (!matchesGrid) {
      const isBlocked = inputs.blocks.some(
        (block) =>
          slotStartDate.getTime() < block.endsAt.getTime() && slotEndDate.getTime() > block.startsAt.getTime()
      )
      if (isBlocked) {
        throw slotBlocked()
      }
      throw invalidSlot('Ese horario no corresponde a la grilla de turnos disponibles.')
    }

    const booking = await createBooking({
      slotStart: slotStartDate,
      slotEnd: slotEndDate,
      customerName: String(customerName).trim(),
      customerPhone: String(customerPhone).trim(),
    })

    res.status(201).json(booking)
  } catch (err) {
    next(err)
  }
})

bookingsRouter.get('/bookings/:code', codeLookupRateLimit, async (req, res, next) => {
  try {
    const { code } = req.params
    if (!isValidBookingCodeFormat(code)) {
      throw bookingNotFound()
    }

    const booking = await findByCode(code)
    if (!booking) {
      throw bookingNotFound()
    }

    res.json({
      bookingCode: booking.bookingCode,
      slotStart: booking.slotStart,
      slotEnd: booking.slotEnd,
      status: booking.status,
      canCancel: canCancel({ status: booking.status, slotStart: new Date(booking.slotStart) }),
    })
  } catch (err) {
    next(err)
  }
})

bookingsRouter.post('/bookings/:code/cancel', codeLookupRateLimit, async (req, res, next) => {
  try {
    const { code } = req.params
    if (!isValidBookingCodeFormat(code)) {
      throw bookingNotFound()
    }

    const existing = await findByCode(code)
    if (!existing) {
      throw bookingNotFound()
    }

    if (existing.status !== 'active') {
      throw bookingNotActive(existing.status)
    }

    if (!canCancel({ status: existing.status, slotStart: new Date(existing.slotStart) })) {
      throw cancellationWindowClosed()
    }

    const { updated, booking } = await cancelByCode(code, 'customer')
    if (!updated) {
      throw bookingNotActive(booking.status)
    }

    res.json({ bookingCode: booking.bookingCode, status: booking.status })
  } catch (err) {
    next(err)
  }
})
