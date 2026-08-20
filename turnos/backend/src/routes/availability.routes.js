import { Router } from 'express'
import { computeAvailableSlots } from '../domain/availability.js'
import { getAvailabilityWindow } from '../domain/time.js'
import { loadAvailabilityInputs } from '../db/availabilityRepository.js'

export const availabilityRouter = Router()

availabilityRouter.get('/availability', async (req, res, next) => {
  try {
    const now = new Date()
    const defaultWindow = getAvailabilityWindow(now)
    const from = req.query.from ? new Date(req.query.from) : defaultWindow.from
    const to = req.query.to ? new Date(req.query.to) : defaultWindow.to

    const inputs = await loadAvailabilityInputs(from, to)
    const days = computeAvailableSlots({ ...inputs, from, to, now })

    res.json({ days })
  } catch (err) {
    next(err)
  }
})
