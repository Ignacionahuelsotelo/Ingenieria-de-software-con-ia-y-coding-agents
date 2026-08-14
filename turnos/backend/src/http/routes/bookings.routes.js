import { Router } from "express";
import { createBooking, listBookingsByContact, cancelBooking } from "../../domain/bookings.js";
import { serializeBooking } from "../serializers.js";

const router = Router();

router.post("/api/bookings", (req, res, next) => {
  try {
    const booking = createBooking(req.body || {});
    res.status(201).json(serializeBooking(booking, { includeCustomer: true }));
  } catch (err) {
    next(err);
  }
});

router.get("/api/bookings", (req, res, next) => {
  try {
    const { customerContact } = req.query;
    if (!customerContact) {
      const err = new Error("Se requiere el parámetro customerContact.");
      err.code = "MISSING_CONTACT";
      err.statusCode = 400;
      throw err;
    }
    const bookings = listBookingsByContact(customerContact);
    res.status(200).json({ bookings: bookings.map((b) => serializeBooking(b)) });
  } catch (err) {
    next(err);
  }
});

router.delete("/api/bookings/:id", (req, res, next) => {
  try {
    const booking = cancelBooking(req.params.id, req.body?.customerContact);
    res.status(200).json(serializeBooking(booking, { includeCustomer: true }));
  } catch (err) {
    next(err);
  }
});

export { router as bookingsRouter };
