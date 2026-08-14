import { getSchedule, listBookings, saveBooking, generateBookingId, getBooking } from "../store/memoryStore.js";
import { isGeneratedSlotStart } from "./slots.js";
import { rangesOverlap, isBefore } from "./time.js";

class BookingError extends Error {
  constructor(message, code, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

function createBooking(input, { now = new Date() } = {}) {
  const customerName = typeof input.customerName === "string" ? input.customerName.trim() : "";
  const customerContact = typeof input.customerContact === "string" ? input.customerContact.trim() : "";

  if (!customerName || !customerContact) {
    throw new BookingError("Se requiere nombre y dato de contacto del cliente.", "INVALID_BOOKING", 400);
  }

  const startUtc = new Date(input.startLocal);
  if (Number.isNaN(startUtc.getTime())) {
    throw new BookingError("startLocal inválido.", "INVALID_BOOKING", 400);
  }

  const schedule = getSchedule();
  if (!schedule || !isGeneratedSlotStart(schedule, startUtc)) {
    throw new BookingError(
      "El turno solicitado está fuera del horario de atención configurado.",
      "INVALID_BOOKING",
      400
    );
  }

  if (!isBefore(now, startUtc)) {
    throw new BookingError("No se pueden reservar turnos en el pasado.", "INVALID_BOOKING", 400);
  }

  const endUtc = new Date(startUtc.getTime() + schedule.slotDurationMinutes * 60000);

  const activeBookings = listBookings().filter((b) => b.status === "active");
  const conflict = activeBookings.some((b) => rangesOverlap(startUtc, endUtc, b.startUtc, b.endUtc));
  if (conflict) {
    throw new BookingError("Este turno ya no está disponible.", "SLOT_ALREADY_BOOKED", 409);
  }

  const booking = {
    id: generateBookingId(),
    startUtc,
    endUtc,
    customerName,
    customerContact,
    status: "active",
    createdAt: now,
    cancelledAt: null,
  };

  return saveBooking(booking);
}

function normalizeContact(contact) {
  return contact.trim().toLowerCase();
}

function listBookingsByContact(customerContact) {
  const normalized = normalizeContact(customerContact);
  return listBookings().filter((b) => normalizeContact(b.customerContact) === normalized);
}

function cancelBooking(id, customerContact, { now = new Date() } = {}) {
  const booking = getBooking(id);
  if (!booking) {
    throw new BookingError("La reserva no existe.", "BOOKING_NOT_FOUND", 404);
  }

  if (normalizeContact(booking.customerContact) !== normalizeContact(customerContact || "")) {
    throw new BookingError("Esta reserva no te pertenece.", "NOT_YOUR_BOOKING", 403);
  }

  if (booking.status !== "active" || !isBefore(now, booking.startUtc)) {
    throw new BookingError(
      "No se puede cancelar un turno que ya comenzó, ya pasó, o ya estaba cancelado.",
      "BOOKING_ALREADY_STARTED",
      409
    );
  }

  booking.status = "cancelled";
  booking.cancelledAt = now;
  return saveBooking(booking);
}

function listAllBookings() {
  return listBookings();
}

export { createBooking, listBookingsByContact, cancelBooking, listAllBookings, BookingError };
