import { Router } from "express";
import { getSchedule } from "../../domain/schedule.js";
import { listAvailableSlots } from "../../domain/slots.js";
import { listBookings } from "../../store/memoryStore.js";
import { serializeSlot } from "../serializers.js";

const router = Router();

router.get("/api/slots", (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to || new Date(to) < new Date(from)) {
      const err = new Error("Los parámetros from/to son requeridos y to no puede ser anterior a from.");
      err.code = "INVALID_RANGE";
      err.statusCode = 400;
      throw err;
    }

    const schedule = getSchedule();
    if (!schedule) {
      const err = new Error("El dueño todavía no configuró un horario de atención.");
      err.code = "NO_SCHEDULE_CONFIGURED";
      err.statusCode = 404;
      throw err;
    }

    const slots = listAvailableSlots({ schedule, bookings: listBookings(), from, to });
    res.status(200).json({ slots: slots.map(serializeSlot) });
  } catch (err) {
    next(err);
  }
});

export { router as slotsRouter };
