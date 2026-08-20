import { Router } from 'express'
import { ownerAuth } from '../../middleware/ownerAuth.js'
import { validateWeeklySchedule, validateSlotDuration } from '../../domain/schedule.js'
import {
  getWeeklySchedule,
  updateWeeklySchedule,
  getScheduleSettings,
  updateScheduleSettings,
} from '../../db/scheduleRepository.js'

export const scheduleRouter = Router()

scheduleRouter.get('/schedule', ownerAuth, async (_req, res, next) => {
  try {
    const [weeklySchedule, slotDurationMinutes] = await Promise.all([
      getWeeklySchedule(),
      getScheduleSettings(),
    ])
    res.json({ weeklySchedule, slotDurationMinutes })
  } catch (err) {
    next(err)
  }
})

scheduleRouter.put('/schedule', ownerAuth, async (req, res, next) => {
  try {
    const { weeklySchedule, slotDurationMinutes } = req.body ?? {}
    validateWeeklySchedule(weeklySchedule ?? [])
    validateSlotDuration(slotDurationMinutes)

    const [savedSchedule, savedDuration] = await Promise.all([
      updateWeeklySchedule(weeklySchedule),
      updateScheduleSettings(slotDurationMinutes),
    ])

    res.json({ weeklySchedule: savedSchedule, slotDurationMinutes: savedDuration })
  } catch (err) {
    next(err)
  }
})
