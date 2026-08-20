# Data Model: Turnos de Barbería con Código de Reserva y Agenda del Dueño

Todas las columnas de tiempo son `timestamptz` (UTC internamente, Principio III). No
existe una tabla `slots`/`turnos` materializada para la disponibilidad futura: los
turnos disponibles se **calculan** en el dominio a partir de `weekly_schedule` +
`blocks` + `bookings` activas (ver FR-006). La única entidad de turno que se
persiste como fila propia es la `booking` (reserva), que sí fija un slot concreto en
el tiempo.

## Entidades

### `weekly_schedule` (Horario Semanal)

Configuración de atención por día de la semana. Fila única por día (0=domingo..6=
sábado); la duración de turno es global y vive en una tabla separada de un solo
registro (`schedule_settings`) para no repetirla en las 7 filas.

| Columna       | Tipo                     | Notas                                             |
|---------------|--------------------------|----------------------------------------------------|
| `weekday`     | `smallint` PK            | `0..6`, `CHECK (weekday BETWEEN 0 AND 6)`          |
| `is_open`     | `boolean` NOT NULL       | si el dueño atiende ese día                        |
| `start_time`  | `time`                   | hora local de inicio; NULL si `is_open = false`    |
| `end_time`    | `time`                   | hora local de fin; NULL si `is_open = false`       |
| `updated_at`  | `timestamptz` NOT NULL   | default `now()`                                    |

Constraints:
- `CHECK ((is_open AND start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time) OR (NOT is_open AND start_time IS NULL AND end_time IS NULL))`
  — garantiza FR-003 (fin > inicio) a nivel de base de datos, además de la
  validación de dominio que da el mensaje de error accionable (Principio VII).
- Las 7 filas (una por `weekday`) se insertan por la migración inicial con
  `is_open = false`; el dueño las actualiza vía `UPDATE`, nunca `INSERT`/`DELETE`.

`start_time`/`end_time` se guardan como hora local del servidor (no UTC): representan
un patrón recurrente ("todos los lunes de 9 a 18"), no un instante. La conversión a
instantes UTC concretos ocurre en el dominio al generar los slots de un día
calendario específico (Principio III: la conversión UTC↔local es explícita, nunca
implícita).

### `schedule_settings` (Duración de Turno)

Tabla de una sola fila (`id = 1`) para la duración estándar de turno, global.

| Columna          | Tipo                   | Notas                                  |
|------------------|-------------------------|------------------------------------------|
| `id`             | `smallint` PK           | `CHECK (id = 1)` — fuerza fila única     |
| `slot_duration_minutes` | `integer` NOT NULL | `CHECK (slot_duration_minutes > 0)`, FR-003 |
| `updated_at`     | `timestamptz` NOT NULL  | default `now()`                          |

### `blocks` (Bloqueo Puntual)

| Columna       | Tipo                   | Notas                                       |
|---------------|--------------------------|--------------------------------------------|
| `id`          | `bigint` PK generated always as identity | |
| `starts_at`   | `timestamptz` NOT NULL  | instante UTC de inicio del bloqueo          |
| `ends_at`     | `timestamptz` NOT NULL  | instante UTC de fin del bloqueo             |
| `reason`      | `text`                  | opcional, nota libre del dueño (ej. "vacaciones") |
| `created_at`  | `timestamptz` NOT NULL  | default `now()`                             |

Constraints:
- `CHECK (ends_at > starts_at)` — FR-003 análogo aplicado a bloqueos.

Comportamiento asociado (dominio, no constraint SQL): al crear un bloqueo que se
superpone con `bookings` activas, esas reservas se cancelan automáticamente en la
misma transacción (FR-024) y su `status` pasa a `cancelled` con
`cancelled_reason = 'blocked'`.

### `bookings` (Reserva / Turno)

Cada fila fija un turno concreto en el tiempo (slot) junto con los datos de contacto
del cliente y su código. `slot_start`/`slot_end` se derivan de `weekly_schedule` +
`schedule_settings` en el momento de reservar, y quedan congelados en la fila (si el
dueño cambia el horario semanal después, las reservas ya hechas no se recalculan —
ver spec, Edge Cases / Assumptions).

| Columna            | Tipo                                   | Notas                                             |
|--------------------|------------------------------------------|-----------------------------------------------------|
| `id`               | `bigint` PK generated always as identity |                                                    |
| `booking_code`     | `char(8)` NOT NULL UNIQUE               | alfabeto sin ambiguos (FR-027), ver dominio        |
| `slot_start`        | `timestamptz` NOT NULL                  | instante UTC de inicio del turno                  |
| `slot_end`          | `timestamptz` NOT NULL                  | instante UTC de fin del turno                     |
| `customer_name`     | `text` NOT NULL                         | `CHECK (length(btrim(customer_name)) > 0)`, FR-008 |
| `customer_phone`    | `text` NOT NULL                         | `CHECK (length(btrim(customer_phone)) > 0)`, FR-008 |
| `status`            | `text` NOT NULL                         | `CHECK (status IN ('active','completed','no_show','cancelled'))` |
| `cancelled_reason`  | `text`                                   | NULL salvo `status = 'cancelled'`; `'customer' \| 'owner' \| 'blocked'` |
| `created_at`        | `timestamptz` NOT NULL                  | default `now()`                                   |
| `updated_at`        | `timestamptz` NOT NULL                  | default `now()`, actualizado en cada cambio de estado |

**Constraint de integridad central (Principio IV, FR-009, SC-002)**:

```sql
create unique index bookings_one_active_per_slot
  on bookings (slot_start)
  where status = 'active';
```

Un `UNIQUE INDEX` parcial: solo hay como máximo una fila con `status = 'active'` por
`slot_start`. Dos reservas concurrentes sobre el mismo slot generan una violación de
constraint en la segunda `INSERT`; la ruta la traduce a `409 Conflict` con mensaje
accionable ("ese turno ya no está disponible, elegí otro").

`booking_code` tiene su propio `UNIQUE` (ya cubierto por `NOT NULL UNIQUE` en la
columna) para garantizar FR-027 (unicidad del código) a nivel de base de datos además
de la generación con reintento en el dominio.

**Transiciones de estado válidas** (dominio, reforzado por `CHECK` de valores
permitidos):

```
active ──cancel (cliente, >2h antes)──▶ cancelled (reason='customer')
active ──cancel (dueño, cualquier momento)──▶ cancelled (reason='owner')
active ──bloqueo puntual superpuesto──▶ cancelled (reason='blocked')
active ──dueño marca cumplido──▶ completed
active ──dueño marca ausente──▶ no_show
```

`completed`, `no_show` y `cancelled` son estados terminales: ninguna transición sale
de ellos (FR-020). Esto se valida en el dominio (mensaje accionable indicando el
estado actual, Principio VII); no se modela como constraint SQL adicional porque
requeriría un trigger para comparar estado anterior vs nuevo, y la garantía crítica
de integridad (no-doble-reserva) ya está cubierta por el índice parcial — el resto de
transiciones no tiene riesgo de condición de carrera entre procesos distintos que
justifique un trigger (Principio VI: no sumar complejidad sin justificación).

### Código de Reserva (`booking_code`)

No es una tabla, es una regla de dominio aplicada a `bookings.booking_code`:
- 8 caracteres.
- Alfabeto: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (mayúsculas + dígitos, excluye
  `O`, `0`, `I`, `1` — FR-027).
- Generado en el dominio (función pura, testeable sin DB) y verificado único vía el
  `UNIQUE` de la columna; en caso de colisión (estadísticamente rara con ese
  alfabeto/longitud) la capa `db/` reintenta la generación.

### Dueño

No es una entidad persistida: es un secreto compartido (`OWNER_PASSWORD`) leído por
`src/config/` desde variables de entorno. No hay tabla de usuarios (spec: "no hay
login ni usuarios registrados").

## Relaciones

- `weekly_schedule` (7 filas) + `schedule_settings` (1 fila) → insumos para calcular,
  en el dominio, la grilla de slots candidatos de un día.
- `blocks` → filtra esa grilla candidata (FR-021: solapamiento total o parcial
  excluye el slot).
- `bookings.status = 'active'` sobre un `slot_start` → ese slot deja de estar
  disponible para nuevas reservas (el índice parcial es la fuente de verdad; el
  cálculo de disponibilidad en el dominio hace un `LEFT JOIN`/`NOT EXISTS` contra
  `bookings` activas en el rango de los próximos 14 días).
- No hay relación FK entre `bookings` y `blocks`/`weekly_schedule`: `bookings`
  congela `slot_start`/`slot_end` como valores concretos, desacoplados de la
  configuración que los originó (por diseño, ver Assumptions del spec).

## Migraciones previstas

1. `0001_create_weekly_schedule.sql` — tabla `weekly_schedule` + seed de 7 filas
   (`is_open = false`).
2. `0002_create_schedule_settings.sql` — tabla `schedule_settings` + seed fila `id=1`
   con un valor por defecto razonable (p. ej. 30 minutos), actualizable por el dueño.
3. `0003_create_blocks.sql` — tabla `blocks`.
4. `0004_create_bookings.sql` — tabla `bookings` + `bookings_one_active_per_slot`
   (índice único parcial) + índice adicional sobre `slot_start` para las consultas de
   agenda por día y de disponibilidad por rango.
