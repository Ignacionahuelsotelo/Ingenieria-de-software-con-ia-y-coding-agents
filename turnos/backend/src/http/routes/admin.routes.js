import { Router } from "express";
import { listAllBookings } from "../../domain/bookings.js";
import { serializeBooking } from "../serializers.js";

const router = Router();

router.get("/api/admin/bookings", (req, res, next) => {
  try {
    const bookings = listAllBookings();
    res.status(200).json({ bookings: bookings.map((b) => serializeBooking(b, { includeCustomer: true })) });
  } catch (err) {
    next(err);
  }
});

export { router as adminRouter };
