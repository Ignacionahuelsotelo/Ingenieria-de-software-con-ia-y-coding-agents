async function request(method, path, body) {
  const response = await fetch(path, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    const error = new Error(data?.error?.message || "Ocurrió un error inesperado.");
    error.code = data?.error?.code || "UNKNOWN_ERROR";
    error.status = response.status;
    throw error;
  }

  return data;
}

const api = {
  getSchedule: () => request("GET", "/api/schedule"),
  putSchedule: (schedule) => request("PUT", "/api/schedule", schedule),
  getSlots: (from, to) => request("GET", `/api/slots?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  createBooking: (booking) => request("POST", "/api/bookings", booking),
  getBookingsByContact: (customerContact) =>
    request("GET", `/api/bookings?customerContact=${encodeURIComponent(customerContact)}`),
  cancelBooking: (id, customerContact) => request("DELETE", `/api/bookings/${id}`, { customerContact }),
  getAllBookings: () => request("GET", "/api/admin/bookings"),
};

export { api };
