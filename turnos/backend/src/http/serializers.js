import { utcToLocalIso } from "../domain/time.js";

function serializeSlot(slot) {
  return {
    startLocal: utcToLocalIso(slot.startUtc),
    endLocal: utcToLocalIso(slot.endUtc),
  };
}

function serializeBooking(booking, { includeCustomer = false } = {}) {
  const base = {
    id: booking.id,
    startLocal: utcToLocalIso(booking.startUtc),
    endLocal: utcToLocalIso(booking.endUtc),
    status: booking.status,
  };
  if (includeCustomer) {
    base.customerName = booking.customerName;
    base.customerContact = booking.customerContact;
  }
  return base;
}

export { serializeSlot, serializeBooking };
