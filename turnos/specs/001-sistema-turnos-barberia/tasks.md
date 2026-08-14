---

description: "Task list template for feature implementation"
---

# Tasks: Sistema de Turnos para Barbería

**Input**: Design documents from `/specs/001-sistema-turnos-barberia/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Incluidos y obligatorios — la constitución del proyecto (Principio I, NON-NEGOTIABLE)
exige test-first para toda lógica de negocio. Cada tarea de test debe escribirse y verse fallar
antes de la implementación correspondiente.

**Organization**: Las tareas están agrupadas por user story (spec.md) para permitir
implementación y testing independientes de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: User story a la que pertenece la tarea (US1..US5)
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Aplicación web (ver `plan.md` → Project Structure): `backend/src/`, `backend/tests/`,
`frontend/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto Node/Express (ESM) y Vitest.

- [x] T001 Crear el árbol de directorios `backend/src/{domain,store,http/routes}`,
  `backend/tests/{unit,integration}`, `frontend/{css,js}` per `plan.md` → Project Structure
- [x] T002 Crear `package.json` en la raíz con `"type": "module"`, dependencia `express`,
  devDependency `vitest`, y scripts `"start": "node backend/src/server.js"` y
  `"test": "vitest run"`
- [x] T003 [P] Crear `.gitignore` en la raíz (`node_modules/`, etc.)
- [x] T004 [P] Crear `vitest.config.js` en la raíz apuntando a `backend/tests/**/*.test.js`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura compartida que TODAS las user stories necesitan.

**⚠️ CRITICAL**: Ninguna user story puede empezar hasta que esta fase esté completa.

- [x] T005 Implementar `backend/src/domain/time.js`: helpers puros de tiempo en UTC (parseo de
  `startLocal` ISO a `Date` UTC, comparación, detección de solapamiento de rangos
  `[start,end)`), y la constante de timezone fija de la barbería (Principio II, `research.md`
  Decisión 3) — sin imports de Express
- [x] T006 [P] Implementar `backend/src/store/memoryStore.js`: estado en memoria vía `Map`
  (singleton `schedule`, colección `bookings` indexada por `id`), sin dependencias externas
  (Principio III)
- [x] T007 [P] Implementar `backend/src/http/app.js`: app Express con `express.json()`,
  servido de estáticos desde `frontend/`, y middleware central de manejo de errores que
  produce el formato `{ "error": { "code", "message" } }` de `contracts/api.md`
- [x] T008 [P] Implementar `backend/src/server.js`: entry point que levanta `app.js` en
  `process.env.PORT || 3000`
- [x] T009 [P] Implementar `frontend/js/api.js`: wrapper `fetch` base (JSON request/response,
  parseo del formato de error de `contracts/api.md`) reutilizado por `client.js` y `admin.js`
- [x] T010 [P] Implementar `frontend/css/styles.css`: estilos mínimos compartidos por
  `index.html` y `admin.html`

**Checkpoint**: Fundación lista — las user stories pueden empezar (en paralelo si hay
capacidad).

---

## Phase 3: User Story 1 - El dueño configura horarios y duración de turnos (Priority: P1) 🎯 MVP (parte 1/2)

**Goal**: El dueño puede definir el horario de atención semanal y la duración de turno; el
sistema valida la configuración (FR-001, FR-002, FR-003).

**Independent Test**: Configurar un horario de atención y una duración de turno vía
`PUT /api/schedule`, y verificar con `GET /api/schedule` que se guardó correctamente; verificar
que una configuración inválida (hora de fin antes que la de inicio, duración ≤ 0) es rechazada.

### Tests for User Story 1 ⚠️

> Escribir estos tests PRIMERO y verlos fallar antes de implementar.

- [x] T011 [P] [US1] Unit tests de validación de `Schedule` (FR-003: duración ≤ 0, rango
  inválido, rangos solapados en un mismo día) en `backend/tests/unit/schedule.test.js`
- [x] T012 [P] [US1] Integration test de `PUT /api/schedule` y `GET /api/schedule` (caso válido
  200, casos inválidos 400 `INVALID_SCHEDULE`, `GET` antes de configurar → 404
  `NO_SCHEDULE_CONFIGURED`) en `backend/tests/integration/schedule.api.test.js`

### Implementation for User Story 1

- [x] T013 [US1] Implementar `backend/src/domain/schedule.js`: `setSchedule(input)` (valida
  con las reglas de `data-model.md` usando `time.js`, persiste en `memoryStore`) y
  `getSchedule()` — sin imports de Express (Principio IV)
- [x] T014 [US1] Implementar `backend/src/http/routes/schedule.routes.js`: `PUT /api/schedule`
  y `GET /api/schedule` según `contracts/api.md`, delegando toda regla de negocio a
  `domain/schedule.js`
- [x] T015 [US1] Registrar `schedule.routes.js` en `backend/src/http/app.js`
- [x] T016 [P] [US1] Crear `frontend/admin.html`: formulario para configurar
  `slotDurationMinutes` y `weeklyHours` (franjas por día)
- [x] T017 [US1] Implementar la sección de configuración de horario en `frontend/js/admin.js`
  (cargar configuración vigente vía `GET /api/schedule`, guardar vía `PUT /api/schedule`
  usando `api.js`)

**Checkpoint**: User Story 1 funcional y testeable de forma independiente.

---

## Phase 4: User Story 2 - El cliente reserva un turno disponible (Priority: P1) 🎯 MVP (parte 2/2)

**Goal**: Un cliente puede ver los turnos disponibles derivados del horario configurado y
reservar uno, con exclusión mutua ante reservas concurrentes (FR-004 a FR-008).

**Independent Test**: Con un horario ya configurado (US1), listar turnos vía `GET /api/slots`,
reservar uno vía `POST /api/bookings`, y verificar que deja de aparecer como disponible; dos
reservas casi simultáneas sobre el mismo turno deben resultar en un único `201`.

### Tests for User Story 2 ⚠️

- [x] T018 [P] [US2] Unit tests de generación de grilla de turnos disponibles a partir de
  `Schedule` + `bookings` activas (incluye exclusión de turnos pasados y ya reservados) en
  `backend/tests/unit/slots.test.js`
- [x] T019 [P] [US2] Unit tests de creación de reserva: solapamiento (FR-007), fuera de horario
  o en el pasado (FR-008), datos de contacto/nombre requeridos (FR-006) en
  `backend/tests/unit/bookings.test.js`
- [x] T020 [P] [US2] Integration test de `GET /api/slots?from&to` (200 con slots, 400
  `INVALID_RANGE`, 404 `NO_SCHEDULE_CONFIGURED`) en
  `backend/tests/integration/slots.api.test.js`
- [x] T021 [P] [US2] Integration test de `POST /api/bookings`, incluyendo el caso de dos
  requests casi simultáneas sobre el mismo `startLocal` (una `201`, la otra `409
  SLOT_ALREADY_BOOKED`) en `backend/tests/integration/bookings.api.test.js`

### Implementation for User Story 2

- [x] T022 [US2] Implementar `backend/src/domain/slots.js`: `listAvailableSlots(schedule,
  bookings, from, to)` (deriva la grilla on-demand, `research.md` Decisión 1), usando
  `time.js` (depende de T013)
- [x] T023 [US2] Implementar `createBooking` en `backend/src/domain/bookings.js` (verifica y
  reserva de forma síncrona sin `await` entre check y write — exclusión mutua vía event loop
  single-threaded, `research.md` Decisión 2)
- [x] T024 [US2] Implementar `backend/src/http/serializers.js`: conversión de `startUtc`/
  `endUtc` a `startLocal`/`endLocal` en la timezone fija de la barbería para las respuestas
  (Principio II)
- [x] T025 [US2] Implementar `backend/src/http/routes/slots.routes.js`: `GET /api/slots` según
  `contracts/api.md`
- [x] T026 [US2] Implementar `POST /api/bookings` en
  `backend/src/http/routes/bookings.routes.js` según `contracts/api.md`
- [x] T027 [US2] Registrar `slots.routes.js` y `bookings.routes.js` en
  `backend/src/http/app.js`
- [x] T028 [P] [US2] Crear `frontend/index.html`: listado de turnos disponibles y formulario de
  reserva (nombre, contacto)
- [x] T029 [US2] Implementar en `frontend/js/client.js` la carga de turnos disponibles
  (`GET /api/slots`) y el envío de la reserva (`POST /api/bookings`) usando `api.js`

**Checkpoint**: User Stories 1 y 2 funcionan de forma independiente y en conjunto — MVP
demostrable (dueño configura, cliente reserva).

---

## Phase 5: User Story 3 - El cliente ve sus turnos reservados (Priority: P2)

**Goal**: Un cliente consulta la lista de turnos asociados a su dato de contacto (FR-009).

**Independent Test**: Reservar turnos con un contacto dado y verificar que
`GET /api/bookings?customerContact=...` devuelve exactamente esos turnos (y ninguno de otro
contacto); un contacto sin turnos recibe lista vacía, no error.

### Tests for User Story 3 ⚠️

- [x] T030 [P] [US3] Unit test de `listBookingsByContact` (incluye caso de contacto sin
  reservas → lista vacía) en `backend/tests/unit/bookings.test.js`
- [x] T031 [P] [US3] Integration test de `GET /api/bookings?customerContact=` (200 con lista,
  200 con lista vacía, 400 `MISSING_CONTACT`) en `backend/tests/integration/bookings.api.test.js`

### Implementation for User Story 3

- [x] T032 [US3] Agregar `listBookingsByContact(contact)` a `backend/src/domain/bookings.js`
  (comparación case-insensitive y trim, FR-012)
- [x] T033 [US3] Agregar el handler `GET /api/bookings` a
  `backend/src/http/routes/bookings.routes.js` según `contracts/api.md`
- [x] T034 [US3] Agregar la sección "Mis turnos" a `frontend/index.html` y su lógica (consultar
  por contacto) en `frontend/js/client.js`

**Checkpoint**: User Stories 1-3 funcionan de forma independiente.

---

## Phase 6: User Story 4 - El cliente cancela un turno (Priority: P2)

**Goal**: Un cliente cancela un turno propio futuro, liberándolo (FR-010, FR-011).

**Independent Test**: Reservar un turno y cancelarlo; verificar que pasa a `cancelled` y vuelve
a aparecer en `GET /api/slots`; verificar que cancelar un turno pasado o ajeno es rechazado.

### Tests for User Story 4 ⚠️

- [x] T035 [P] [US4] Unit tests de `cancelBooking` (turno pasado → rechazado, contacto no
  coincide → rechazado, ya cancelado → rechazado, caso feliz → `status: "cancelled"`) en
  `backend/tests/unit/bookings.test.js`
- [x] T036 [P] [US4] Integration test de `DELETE /api/bookings/:id` (200, 404
  `BOOKING_NOT_FOUND`, 403 `NOT_YOUR_BOOKING`, 409 `BOOKING_ALREADY_STARTED`) en
  `backend/tests/integration/bookings.api.test.js`

### Implementation for User Story 4

- [x] T037 [US4] Agregar `cancelBooking(id, customerContact)` a
  `backend/src/domain/bookings.js`
- [x] T038 [US4] Agregar el handler `DELETE /api/bookings/:id` a
  `backend/src/http/routes/bookings.routes.js` según `contracts/api.md`
- [x] T039 [US4] Agregar el botón/acción "Cancelar" en la sección "Mis turnos" de
  `frontend/index.html` y `frontend/js/client.js`

**Checkpoint**: User Stories 1-4 (ciclo completo de reserva del cliente) funcionan de forma
independiente.

---

## Phase 7: User Story 5 - El dueño ve todos los turnos reservados (Priority: P3)

**Goal**: El dueño consulta, en modo solo lectura, todas las reservas de todos los clientes
(FR-014).

**Independent Test**: Reservar turnos con distintos clientes y verificar que
`GET /api/admin/bookings` devuelve todas las reservas (activas y canceladas) de todos ellos;
sin reservas, devuelve lista vacía, no error.

### Tests for User Story 5 ⚠️

- [x] T040 [P] [US5] Unit test de `listAllBookings` (incluye reservas de múltiples clientes y
  estados) en `backend/tests/unit/bookings.test.js`
- [x] T041 [P] [US5] Integration test de `GET /api/admin/bookings` (200 con todas las reservas,
  200 con lista vacía) en `backend/tests/integration/admin.api.test.js`

### Implementation for User Story 5

- [x] T042 [US5] Agregar `listAllBookings()` a `backend/src/domain/bookings.js`
- [x] T043 [US5] Implementar `backend/src/http/routes/admin.routes.js`: `GET
  /api/admin/bookings` según `contracts/api.md` (solo lectura, sin endpoint de cancelación)
- [x] T044 [US5] Registrar `admin.routes.js` en `backend/src/http/app.js`
- [x] T045 [P] [US5] Agregar la sección "Todas las reservas" a `frontend/admin.html` y su
  lógica en `frontend/js/admin.js`

**Checkpoint**: Las 5 user stories funcionan de forma independiente y en conjunto.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validación final y documentación.

- [x] T046 Ejecutar manualmente el escenario end-to-end de `quickstart.md` (9 pasos, incluidos
  concurrencia y liberación de turno cancelado) contra el servidor levantado con `npm start`
- [x] T047 [P] Crear `README.md` en la raíz con instrucciones de `npm install`, `npm start`,
  `npm test`
- [x] T048 Revisar que todos los handlers de `backend/src/http/routes/*.js` devuelvan errores
  en el formato `{ "error": { "code", "message" } }` consistente con `contracts/api.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — puede empezar de inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las user stories
- **User Stories (Phase 3-7)**: todas dependen de Foundational
  - US1 (Phase 3) y US2 (Phase 4) son ambas P1; US2 depende funcionalmente de que exista
    `domain/schedule.js` (T013) para generar slots, así que en la práctica se implementan en
    orden (US1 → US2) aunque sus tests puedan escribirse en paralelo
  - US3 (Phase 5) y US4 (Phase 6) dependen de que exista `createBooking` (T023, de US2) para
    tener datos que consultar/cancelar
  - US5 (Phase 7) depende de que exista `Booking` (T023, de US2); es independiente de
    US3/US4
- **Polish (Phase 8)**: depende de que las user stories deseadas estén completas

### Within Each User Story

- Tests DEBEN escribirse y verse fallar antes de la implementación (Principio I,
  NON-NEGOTIABLE)
- Dominio antes que rutas HTTP (Principio IV)
- Backend antes que el frontend que lo consume

### Parallel Opportunities

- T003, T004 (Setup) en paralelo
- T006, T007, T008, T009, T010 (Foundational) en paralelo entre sí (T005 primero, ya que
  `time.js` es usado por varios)
- Los tests marcados [P] dentro de una misma user story pueden escribirse en paralelo
- US3, US4 y US5 pueden implementarse en paralelo entre sí una vez completada US2 (todas
  dependen de `bookings.js` pero tocan funciones/rutas distintas)

---

## Parallel Example: User Story 2

```bash
# Lanzar juntos los tests de User Story 2:
Task: "Unit tests de generación de slots en backend/tests/unit/slots.test.js"
Task: "Unit tests de creación de reserva en backend/tests/unit/bookings.test.js"
Task: "Integration test de GET /api/slots en backend/tests/integration/slots.api.test.js"
Task: "Integration test de POST /api/bookings en backend/tests/integration/bookings.api.test.js"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Completar Phase 1: Setup
2. Completar Phase 2: Foundational (crítico — bloquea todo lo demás)
3. Completar Phase 3: User Story 1 (dueño configura horario)
4. Completar Phase 4: User Story 2 (cliente reserva)
5. **STOP and VALIDATE**: correr `quickstart.md` pasos 1-5 — dueño configura, cliente reserva,
   concurrencia respetada
6. Demo del MVP

### Incremental Delivery

1. Setup + Foundational → base lista
2. US1 + US2 → MVP (configurar + reservar) → validar con `quickstart.md` pasos 1-5
3. US3 (ver mis turnos) → validar con `quickstart.md` paso 6
4. US4 (cancelar) → validar con `quickstart.md` pasos 7-8
5. US5 (vista del dueño) → validar con `quickstart.md` paso 9
6. Polish (Phase 8) → validación end-to-end completa

---

## Notes

- [P] = archivos distintos, sin dependencias pendientes entre sí
- [US#] mapea cada tarea a su user story en `spec.md` para trazabilidad
- Verificar que cada test falla antes de implementar (Principio I, NON-NEGOTIABLE)
- Commitear después de cada tarea o grupo lógico de tareas
- Detenerse en cada checkpoint para validar la user story de forma independiente
