# Data Model: Sistema de Turnos para Barbería

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)

Todo horario (`start`, `end`, timestamps) se almacena internamente en UTC (Principio II). Las
franjas horarias configuradas por el dueño se expresan en hora local de la barbería (ver
`research.md`, Decisión 3) pero los slots concretos derivados de ellas se calculan y comparan
en UTC.

## Entidad: Schedule (Horario de Atención)

Configuración única (singleton) para el barbero/prestador (FR-013: un solo prestador por
barbería).

| Campo | Tipo | Descripción |
|---|---|---|
| `slotDurationMinutes` | integer > 0 | Duración estándar de cada turno, en minutos (FR-002) |
| `weeklyHours` | array de `DayHours` | Franjas horarias de atención por día de la semana (FR-001) |
| `updatedAt` | Date (UTC) | Última vez que se modificó la configuración |

### Sub-tipo: DayHours

| Campo | Tipo | Descripción |
|---|---|---|
| `dayOfWeek` | integer 0-6 (0 = domingo) | Día de la semana |
| `ranges` | array de `{ startLocal: "HH:mm", endLocal: "HH:mm" }` | Uno o más rangos horarios de atención ese día (FR-001 permite "uno o más rangos") |

**Validation rules** (FR-003):
- `slotDurationMinutes` debe ser un entero mayor a 0.
- Para cada rango: `endLocal` debe ser posterior a `startLocal`.
- Los rangos de un mismo día no deben solaparse entre sí.

**State transitions**: No tiene estados propios; se sobrescribe con cada actualización válida.
Cambiarla no afecta las `Booking` ya existentes (Edge Case: "los turnos ya reservados
conservan su horario/duración original").

## Entidad: Slot (Turno) — derivada, no persistida

Un `Slot` es un bloque de tiempo concreto, calculado dinámicamente a partir del `Schedule`
vigente (ver `research.md`, Decisión 1). No es una fila en el `Map`; se computa al listar
disponibilidad y se materializa como `Booking` solo cuando se reserva.

| Campo | Tipo | Descripción |
|---|---|---|
| `startUtc` | Date (UTC) | Inicio del turno |
| `endUtc` | Date (UTC) | Fin del turno (`startUtc` + `slotDurationMinutes` vigente al momento de generarlo) |
| `status` | enum: `available` \| `booked` \| `past` | Derivado: `booked` si existe una `Booking` activa que lo cubre; `past` si `startUtc` ya pasó; si no, `available` |

## Entidad: Booking (Reserva)

Única entidad persistida en el `Map` además de `Schedule`.

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | string (UUID) | Identificador único de la reserva |
| `startUtc` | Date (UTC) | Inicio del turno reservado (copiado del `Slot` al momento de reservar; no cambia si el `Schedule` cambia luego) |
| `endUtc` | Date (UTC) | Fin del turno reservado |
| `customerName` | string, no vacío | Nombre del cliente (FR-006) |
| `customerContact` | string, no vacío | Email o teléfono del cliente; usado para identificarlo en "mis turnos" y cancelación (FR-006, FR-012) |
| `status` | enum: `active` \| `cancelled` | Estado de la reserva (FR-010) |
| `createdAt` | Date (UTC) | Momento en que se creó la reserva |
| `cancelledAt` | Date (UTC) \| null | Momento en que se canceló, si aplica |

**Validation rules**:
- No puede crearse una `Booking` activa cuyo rango `[startUtc, endUtc)` se solape con el de
  otra `Booking` activa existente (FR-007).
- No puede crearse si `startUtc` está fuera de las franjas del `Schedule` vigente o en el
  pasado (FR-008).
- No puede cancelarse una `Booking` cuyo `startUtc` ya pasó (FR-011).
- No puede cancelarse una `Booking` cuyo `customerContact` no coincide (comparación
  case-insensitive, trim) con el solicitante (FR-011, FR-012).

**State transitions**:

```
active --(cliente cancela, antes de startUtc)--> cancelled
```

No existen otras transiciones (no hay "completado" ni "no-show" en esta versión — ver
Assumptions del spec).

## Entidad: Customer (Cliente) — no persistida como entidad propia

No existe una tabla/colección de clientes independiente. Un "cliente" es simplemente el par
`(customerName, customerContact)` embebido en cada `Booking`; se agrupan lógicamente al
consultar "mis turnos" filtrando `Booking` por `customerContact` (FR-009). No hay cuenta de
usuario ni contraseña (Assumptions del spec, Clarification Q1).

## Relaciones

- `Booking.startUtc`/`endUtc` se deriva de un `Slot`, que a su vez se deriva del `Schedule`
  vigente al momento de la reserva — pero una vez creada, `Booking` es independiente del
  `Schedule` (no hay foreign key ni referencia viva).
- Un `Customer` (identificado por `customerContact`) puede tener 0..N `Booking` (sin límite,
  ver Assumptions del spec).
- Existe como máximo un `Schedule` activo en todo momento (singleton).
