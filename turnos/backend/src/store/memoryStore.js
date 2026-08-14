let schedule = null;

const bookings = new Map();
let nextBookingSeq = 1;

function getSchedule() {
  return schedule;
}

function setSchedule(newSchedule) {
  schedule = newSchedule;
  return schedule;
}

function generateBookingId() {
  return `b_${nextBookingSeq++}`;
}

function saveBooking(booking) {
  bookings.set(booking.id, booking);
  return booking;
}

function getBooking(id) {
  return bookings.get(id) || null;
}

function listBookings() {
  return Array.from(bookings.values());
}

function reset() {
  schedule = null;
  bookings.clear();
  nextBookingSeq = 1;
}

export { getSchedule, setSchedule, generateBookingId, saveBooking, getBooking, listBookings, reset };
