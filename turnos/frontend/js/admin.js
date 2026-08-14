import { api } from "./api.js";

const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

const daysContainer = document.getElementById("days-container");
const scheduleForm = document.getElementById("schedule-form");
const slotDurationInput = document.getElementById("slot-duration");
const scheduleError = document.getElementById("schedule-error");
const scheduleSuccess = document.getElementById("schedule-success");

function renderDayRows(existingByDay = {}) {
  daysContainer.innerHTML = "";
  DAY_NAMES.forEach((name, dayOfWeek) => {
    const existing = existingByDay[dayOfWeek];
    const row = document.createElement("div");
    row.className = "day-hours";
    row.dataset.day = String(dayOfWeek);
    row.innerHTML = `
      <label style="flex-direction: row; align-items: center; gap: 0.5rem;">
        <input type="checkbox" class="day-enabled" ${existing ? "checked" : ""} />
        ${name}
      </label>
      <label>
        Desde
        <input type="time" class="day-start" value="${existing?.ranges[0]?.startLocal || "09:00"}" />
      </label>
      <label>
        Hasta
        <input type="time" class="day-end" value="${existing?.ranges[0]?.endLocal || "18:00"}" />
      </label>
    `;
    daysContainer.appendChild(row);
  });
}

function collectWeeklyHours() {
  const weeklyHours = [];
  daysContainer.querySelectorAll(".day-hours").forEach((row) => {
    const enabled = row.querySelector(".day-enabled").checked;
    if (!enabled) return;
    const dayOfWeek = Number(row.dataset.day);
    const startLocal = row.querySelector(".day-start").value;
    const endLocal = row.querySelector(".day-end").value;
    weeklyHours.push({ dayOfWeek, ranges: [{ startLocal, endLocal }] });
  });
  return weeklyHours;
}

async function loadSchedule() {
  renderDayRows();
  try {
    const schedule = await api.getSchedule();
    slotDurationInput.value = schedule.slotDurationMinutes;
    const byDay = {};
    schedule.weeklyHours.forEach((day) => {
      byDay[day.dayOfWeek] = day;
    });
    renderDayRows(byDay);
  } catch (err) {
    if (err.code !== "NO_SCHEDULE_CONFIGURED") {
      scheduleError.textContent = err.message;
      scheduleError.hidden = false;
    }
  }
}

scheduleForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  scheduleError.hidden = true;
  scheduleSuccess.hidden = true;
  try {
    await api.putSchedule({
      slotDurationMinutes: Number(slotDurationInput.value),
      weeklyHours: collectWeeklyHours(),
    });
    scheduleSuccess.hidden = false;
  } catch (err) {
    scheduleError.textContent = err.message;
    scheduleError.hidden = false;
  }
});

loadSchedule();

const allBookingsList = document.getElementById("all-bookings-list");
const allBookingsEmpty = document.getElementById("all-bookings-empty");
const refreshBookingsButton = document.getElementById("refresh-bookings");

async function loadAllBookings() {
  allBookingsList.innerHTML = "";
  try {
    const { bookings } = await api.getAllBookings();
    allBookingsEmpty.hidden = bookings.length > 0;
    bookings.forEach((booking) => {
      const li = document.createElement("li");
      li.className = "booking-item";
      li.innerHTML = `
        <span>${new Date(booking.startLocal).toLocaleString("es-AR")} — ${booking.customerName} (${booking.customerContact})</span>
        <span class="status-${booking.status}">${booking.status === "active" ? "Activa" : "Cancelada"}</span>
      `;
      allBookingsList.appendChild(li);
    });
  } catch (err) {
    allBookingsEmpty.hidden = false;
    allBookingsEmpty.textContent = err.message;
  }
}

refreshBookingsButton.addEventListener("click", loadAllBookings);
loadAllBookings();
