# API Contract: Sistema de Turnos para Barbería

**Feature**: [spec.md](../spec.md) | **Data model**: [data-model.md](../data-model.md)

API HTTP REST servida por Express. Todos los timestamps en el body de request/response son
strings ISO 8601. Las respuestas expresan horarios en la timezone local de la barbería
(Principio II); internamente el servidor trabaja en UTC.

Formato de error común (para todos los 4xx):

```json
{ "error": { "code": "SLOT_ALREADY_BOOKED", "message": "Este turno ya no está disponible." } }
```

---

## Dueño: configurar horario de atención

### `PUT /api/schedule`

Reemplaza la configuración de horario de atención y duración de turno (FR-001, FR-002, US1).

**Request body**:

```json
{
  "slotDurationMinutes": 30,
  "weeklyHours": [
    { "dayOfWeek": 1, "ranges": [{ "startLocal": "09:00", "endLocal": "13:00" }, { "startLocal": "14:00", "endLocal": "18:00" }] },
    { "dayOfWeek": 2, "ranges": [{ "startLocal": "09:00", "endLocal": "18:00" }] }
  ]
}
```

**Responses**:
- `200 OK` → devuelve la configuración guardada (mismo shape que el request, más `updatedAt`).
- `400 Bad Request` → `INVALID_SCHEDULE` si `slotDurationMinutes <= 0`, algún `endLocal <=
  startLocal`, rangos solapados dentro de un día, o `dayOfWeek` fuera de 0-6 (FR-003, AS3 de US1).

### `GET /api/schedule`

Devuelve la configuración vigente. `404 Not Found` (`NO_SCHEDULE_CONFIGURED`) si el dueño
todavía no configuró nada.

---

## Cliente: consultar y reservar turnos

### `GET /api/slots?from=2026-08-17&to=2026-08-23`

Lista los turnos disponibles (`status: "available"`) dentro del rango de fechas dado, derivados
del `Schedule` vigente (FR-004, FR-005, US2). Excluye automáticamente turnos ya reservados y
turnos cuyo inicio ya pasó.

**Response** `200 OK`:

```json
{
  "slots": [
    { "startLocal": "2026-08-17T09:00:00-03:00", "endLocal": "2026-08-17T09:30:00-03:00" }
  ]
}
```

- `400 Bad Request` (`INVALID_RANGE`) si `from`/`to` faltan o `to` es anterior a `from`.
- `404 Not Found` (`NO_SCHEDULE_CONFIGURED`) si el dueño todavía no configuró horario.

### `POST /api/bookings`

Reserva un turno disponible (FR-006, FR-007, FR-008, US2).

**Request body**:

```json
{
  "startLocal": "2026-08-17T09:00:00-03:00",
  "customerName": "Juan Pérez",
  "customerContact": "juan@example.com"
}
```

**Responses**:
- `201 Created` → devuelve la `Booking` creada (`id`, `startLocal`, `endLocal`, `customerName`,
  `customerContact`, `status: "active"`).
- `400 Bad Request` (`INVALID_BOOKING`) si falta `customerName`/`customerContact`, o el
  `startLocal` no coincide con el inicio de ningún slot generable por el `Schedule` vigente, o
  el horario ya pasó, o está fuera de las franjas configuradas (FR-008, AS3 de US2).
- `409 Conflict` (`SLOT_ALREADY_BOOKED`) si el slot ya tiene una reserva activa — cubre el caso
  de dos solicitudes casi simultáneas (FR-007, AS2 de US2): solo la primera en procesarse recibe
  `201`, la otra recibe `409`.

---

## Cliente: ver y cancelar sus turnos

### `GET /api/bookings?customerContact=juan@example.com`

Lista todos los turnos (activos y cancelados) asociados a ese contacto (FR-009, US3).

**Response** `200 OK`:

```json
{
  "bookings": [
    { "id": "b_1", "startLocal": "2026-08-17T09:00:00-03:00", "endLocal": "2026-08-17T09:30:00-03:00", "status": "active" }
  ]
}
```

Lista vacía (`{ "bookings": [] }`) con `200 OK` si el cliente no tiene turnos (AS2 de US3) — no
es un error.

- `400 Bad Request` (`MISSING_CONTACT`) si no se envía `customerContact`.

### `DELETE /api/bookings/:id`

Cancela una reserva propia (FR-010, FR-011, US4).

**Request body**:

```json
{ "customerContact": "juan@example.com" }
```

**Responses**:
- `200 OK` → devuelve la `Booking` actualizada con `status: "cancelled"`.
- `404 Not Found` (`BOOKING_NOT_FOUND`) si el `id` no existe.
- `403 Forbidden` (`NOT_YOUR_BOOKING`) si `customerContact` no coincide con el dueño de la
  reserva (AS3 de US4).
- `409 Conflict` (`BOOKING_ALREADY_STARTED`) si el turno ya comenzó o ya pasó (AS2 de US4), o si
  ya estaba cancelada.

---

## Dueño: ver todas las reservas

### `GET /api/admin/bookings`

Lista todas las reservas de todos los clientes, activas y canceladas (FR-014, US5).

**Response** `200 OK`:

```json
{
  "bookings": [
    { "id": "b_1", "startLocal": "2026-08-17T09:00:00-03:00", "endLocal": "2026-08-17T09:30:00-03:00", "customerName": "Juan Pérez", "customerContact": "juan@example.com", "status": "active" }
  ]
}
```

Lista vacía con `200 OK` si no hay reservas (AS2 de US5) — no es un error. Esta ruta es de solo
lectura: no existe endpoint para que el dueño cancele en nombre de un cliente (Clarification
Q2 — fuera de alcance en esta versión).
