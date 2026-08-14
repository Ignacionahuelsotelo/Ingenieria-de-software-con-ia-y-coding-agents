import { Router } from "express";
import { setSchedule, getSchedule } from "../../domain/schedule.js";

const router = Router();

router.put("/api/schedule", (req, res, next) => {
  try {
    const schedule = setSchedule(req.body || {});
    res.status(200).json(schedule);
  } catch (err) {
    next(err);
  }
});

router.get("/api/schedule", (req, res, next) => {
  try {
    const schedule = getSchedule();
    if (!schedule) {
      const err = new Error("El dueño todavía no configuró un horario de atención.");
      err.code = "NO_SCHEDULE_CONFIGURED";
      err.statusCode = 404;
      throw err;
    }
    res.status(200).json(schedule);
  } catch (err) {
    next(err);
  }
});

export { router as scheduleRouter };
