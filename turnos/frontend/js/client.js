import { api } from "./api.js";

const fromDateInput = document.getElementById("from-date");
const toDateInput = document.getElementById("to-date");
const loadSlotsButton = document.getElementById("load-slots");
const slotsList = document.getElementById("slots-list");
const slotsEmpty = document.getElementById("slots-empty");
const slotsError = document.getElementById("slots-error");

const bookingForm = document.getElementById("booking-form");
const selectedSlotLabel = document.getElementById("selected-slot-label");
const customerNameInput = document.getElementById("customer-name");
const customerContactInput = document.getElementById("customer-contact");
const bookingError = document.getElementById("booking-error");

let selectedSlot = null;

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function defaultDates() {
  const today = new Date();
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  fromDateInput.value = todayIso();
  toDateInput.value = in7Days.toISOString().slice(0, 10);
}

function formatLocal(isoString) {
  return new Date(isoString).toLocaleString("es-AR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function loadSlots() {
  slotsError.hidden = true;
  slotsList.innerHTML = "";
  bookingForm.hidden = true;
  try {
    const { slots } = await api.getSlots(fromDateInput.value, toDateInput.value);
    slotsEmpty.hidden = slots.length > 0;
    slots.forEach((slot) => {
      const li = document.createElement("li");
      li.className = "slot-item";
      const label = document.createElement("span");
      label.textContent = formatLocal(slot.startLocal);
      const button = document.createElement("button");
      button.textContent = "Reservar";
      button.addEventListener("click", () => selectSlot(slot));
      li.append(label, button);
      slotsList.appendChild(li);
    });
  } catch (err) {
    slotsError.textContent = err.message;
    slotsError.hidden = false;
  }
}

function selectSlot(slot) {
  selectedSlot = slot;
  selectedSlotLabel.textContent = formatLocal(slot.startLocal);
  bookingForm.hidden = false;
  bookingError.hidden = true;
}

bookingForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  bookingError.hidden = true;
  try {
    await api.createBooking({
      startLocal: selectedSlot.startLocal,
      customerName: customerNameInput.value,
      customerContact: customerContactInput.value,
    });
    bookingForm.hidden = true;
    customerNameInput.value = "";
    customerContactInput.value = "";
    await loadSlots();
  } catch (err) {
    bookingError.textContent = err.message;
    bookingError.hidden = false;
  }
});

loadSlotsButton.addEventListener("click", loadSlots);
defaultDates();
loadSlots();

const myContactInput = document.getElementById("my-contact");
const loadMyBookingsButton = document.getElementById("load-my-bookings");
const myBookingsList = document.getElementById("my-bookings-list");
const myBookingsEmpty = document.getElementById("my-bookings-empty");

async function loadMyBookings() {
  const contact = myContactInput.value.trim();
  if (!contact) return;
  myBookingsList.innerHTML = "";
  const { bookings } = await api.getBookingsByContact(contact);
  myBookingsEmpty.hidden = bookings.length > 0;
  bookings.forEach((booking) => {
    const li = document.createElement("li");
    li.className = "booking-item";
    const label = document.createElement("span");
    label.className = `status-${booking.status}`;
    label.textContent = `${formatLocal(booking.startLocal)} — ${booking.status === "active" ? "Activa" : "Cancelada"}`;
    li.appendChild(label);

    if (booking.status === "active") {
      const cancelButton = document.createElement("button");
      cancelButton.textContent = "Cancelar";
      cancelButton.addEventListener("click", async () => {
        try {
          await api.cancelBooking(booking.id, contact);
          await loadMyBookings();
          await loadSlots();
        } catch (err) {
          alert(err.message);
        }
      });
      li.appendChild(cancelButton);
    }

    myBookingsList.appendChild(li);
  });
}

loadMyBookingsButton.addEventListener("click", loadMyBookings);
