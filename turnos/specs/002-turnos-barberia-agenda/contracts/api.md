# API Contract: Turnos de Barbería

Base URL: `/api`. Todas las respuestas son JSON. Fechas/horas en respuestas usan ISO
8601 con offset (UTC en el dominio, convertidas a lo que el cliente necesite mostrar
— la UI convierte a timezone local del navegador para mostrar, el servidor entrega
instantes inequívocos).

Formato de error uniforme (Principio VII — accionable, nunca genérico):

```json
{
  "error": {
    "code": "SLOT_ALREADY_BOOKED",
    "message": "Ese turno ya no está disponible. Elegí otro horario.",
    "field": null
  }
}
```

`field` está presente (no null) cuando el error es de validación de un campo
específico (ej. `"field": "phone"`).

## Endpoints públicos (cliente)

### `GET /api/availability?from=&to=`

Turnos disponibles en la ventana de próximos 14 días (FR-006, FR-023).
- Query params opcionales `from`/`to` (fecha ISO) para acotar dentro de la ventana;
  por defecto es "ahora" hasta "+14 días".
- **200**: `{ "days": [ { "date": "2026-08-18", "slots": [ { "start": "2026-08-18T12:00:00Z", "end": "2026-08-18T12:30:00Z" } ] } ] }`
  — agrupado por día calendario (timezone servidor) para que la UI arme la grilla.

### `POST /api/bookings`

Crea una reserva sobre un slot disponible (FR-007, FR-009, FR-010).
- Body: `{ "slotStart": "2026-08-18T12:00:00Z", "customerName": "...", "customerPhone": "..." }`
- **201**: `{ "bookingCode": "3F7K9RTQ", "slotStart": "...", "slotEnd": "...", "status": "active" }`
- **400** `MISSING_FIELD` (FR-008) — nombre o teléfono faltante, `field` indica cuál.
- **400** `INVALID_SLOT` — slot que ya pasó (US2 Acceptance Scenario 5) o no
  corresponde a la grilla calculada.
- **409** `SLOT_ALREADY_BOOKED` (FR-009, acceptance 3) — otra reserva activa ya ganó
  el slot; el cuerpo del error invita a elegir otro horario.
- **409** `SLOT_BLOCKED` — slot bloqueado por el dueño (FR-021).

### `GET /api/bookings/:code`

Consulta por código (FR-011, FR-012).
- **200**: `{ "bookingCode": "...", "slotStart": "...", "slotEnd": "...", "status": "active", "canCancel": true }`
  `canCancel` refleja la ventana de 2h + estado activo (FR-025), calculado en el
  dominio para que la UI no tenga que reimplementar la regla.
- **404** `BOOKING_NOT_FOUND` — mensaje genérico, sin distinguir "casi coincide" de
  "no existe" (FR-012). Sujeto a rate limiting por IP (FR-028).

### `POST /api/bookings/:code/cancel`

Cancelación por el cliente (FR-013, FR-025).
- **200**: `{ "bookingCode": "...", "status": "cancelled" }`
- **404** `BOOKING_NOT_FOUND`.
- **409** `BOOKING_NOT_ACTIVE` — ya cumplido/ausente/cancelado (FR-013, acceptance 4),
  `message` indica el estado actual.
- **403** `CANCELLATION_WINDOW_CLOSED` — menos de 2h para el inicio (FR-025,
  acceptance 5), `message` sugiere contactar al dueño.
- Sujeto a rate limiting por IP (FR-028).

## Endpoints del dueño (agenda)

Todos requieren header `Authorization: Bearer <OWNER_PASSWORD>`. Ausente o incorrecto
→ **401** `UNAUTHORIZED`, sin exponer datos de turnos (FR-016).

### `PUT /api/admin/schedule`

Configura el horario semanal + duración de turno (FR-001, FR-002, FR-003).
- Body: `{ "weeklySchedule": [ { "weekday": 1, "isOpen": true, "startTime": "09:00", "endTime": "18:00" }, ... 7 días ... ], "slotDurationMinutes": 30 }`
- **200**: configuración guardada, eco del estado resultante.
- **400** `INVALID_SCHEDULE` — fin ≤ inicio o duración ≤ 0 (FR-003), `field` indica
  `weekday` o `slotDurationMinutes` afectado.

### `GET /api/admin/schedule`

Lee la configuración actual (horario semanal + duración).
- **200**: mismo shape que el body de `PUT`.

### `POST /api/admin/blocks`

Crea un bloqueo puntual (FR-004).
- Body: `{ "startsAt": "...", "endsAt": "...", "reason": "vacaciones" }`
- **201**: `{ "id": 12, "startsAt": "...", "endsAt": "...", "reason": "...", "cancelledBookings": ["3F7K9RTQ"] }`
  `cancelledBookings` lista los códigos de reservas canceladas automáticamente por
  el bloqueo (FR-024).
- **400** `INVALID_BLOCK` — fin ≤ inicio (FR-003 análogo).

### `DELETE /api/admin/blocks/:id`

Elimina un bloqueo, restaura disponibilidad de los slots correspondientes (FR-005).
- **200**: `{ "id": 12, "deleted": true }`
- **404** `BLOCK_NOT_FOUND`.

### `GET /api/admin/agenda?date=`

Turnos de un día específico (FR-017), incluye días pasados (Edge Cases: historial no
se oculta).
- **200**: `{ "date": "2026-08-18", "bookings": [ { "bookingCode": "...", "customerName": "...", "customerPhone": "...", "slotStart": "...", "slotEnd": "...", "status": "active" } ] }`

### `POST /api/admin/bookings/:code/complete`

Marca un turno activo como cumplido (FR-018).
- **200**: `{ "bookingCode": "...", "status": "completed" }`
- **409** `BOOKING_NOT_ACTIVE` (FR-020) — indica estado actual y transiciones
  válidas.

### `POST /api/admin/bookings/:code/no-show`

Marca un turno activo como ausente (FR-018).
- Mismo shape/errores que `.../complete`, con `status: "no_show"`.

### `POST /api/admin/bookings/:code/cancel`

Cancelación por el dueño, sin ventana de 2h (FR-019, FR-025 — el dueño puede cancelar
siempre).
- **200**: `{ "bookingCode": "...", "status": "cancelled" }`
- **409** `BOOKING_NOT_ACTIVE` (FR-020).
