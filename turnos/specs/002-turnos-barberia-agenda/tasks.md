---

description: "Task list for Turnos de Barbería con Código de Reserva y Agenda del Dueño"
---

# Tasks: Turnos de Barbería con Código de Reserva y Agenda del Dueño

**Input**: Design documents from `/specs/002-turnos-barberia-agenda/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Incluidos. La constitución del proyecto exige Test-First (Principio I,
NON-NEGOTIABLE) para toda regla de negocio, y el usuario pidió explícitamente que
"toda ruta en routes/ necesita su test" y un flujo E2E con Playwright.

**Organization**: Tareas agrupadas por user story (spec.md) para permitir
implementación y prueba independientes de cada una.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Puede ejecutarse en paralelo (archivos distintos, sin dependencias)
- **[Story]**: US1, US2, US3, US4 — mapea a las user stories de spec.md
- Cada tarea incluye la ruta de archivo exacta

## Path Conventions

Web app (backend + frontend separados en la raíz, ver plan.md § Project Structure):
`backend/src/`, `backend/tests/`, `frontend/src/`, `db/migrations/`, `e2e/tests/`.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: eliminar la implementación previa incompatible y dejar los tres
proyectos (`backend/`, `frontend/`, `e2e/`) inicializados.

- [X] T001 Eliminar la implementación previa en memoria: borrar
  `backend/src/store/`, `backend/src/http/`, `backend/tests/unit/*.test.js` y
  `backend/tests/integration/*.test.js` existentes, `frontend/index.html`,
  `frontend/admin.html`, `frontend/css/`, `frontend/js/`. Conservar
  `backend/tests/`, `backend/src/` y `frontend/` como directorios vacíos para
  reconstruir en las fases siguientes.
- [X] T002 Crear `docker-compose.yml` en la raíz del repo: servicio `postgres`
  (imagen `postgres:16-alpine`, puerto `5433:5432`, env `POSTGRES_USER=turnos`,
  `POSTGRES_PASSWORD=turnos`, `POSTGRES_DB=turnos`, healthcheck `pg_isready`,
  volumen nombrado `turnos_postgres_data`) y servicio `adminer` (imagen
  `adminer:latest`, puerto `8081:8080`).
- [X] T003 [P] Crear `.env.example` en la raíz del repo con todas las variables:
  `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, `POSTGRES_PORT=5433`,
  `DATABASE_URL`, `OWNER_PASSWORD`, `PORT` (backend), `VITE_API_URL` (frontend).
- [X] T004 [P] Inicializar `backend/package.json` (ESM, `type: module`) con
  dependencias `express`, `pg`, `dotenv` y devDependency `vitest`; scripts `dev`,
  `start`, `test`.
- [X] T005 [P] Inicializar proyecto Vite en `frontend/` con React 19 + TypeScript +
  Tailwind CSS 4 (`@tailwindcss/vite`), replicando versiones de
  `../futbol-vibecoding/frontend/package.json`: `package.json`, `vite.config.ts`,
  `tsconfig.json`, `index.html` de entrada Vite (distinto del `index.html` estático
  eliminado en T001).
- [X] T006 [P] Inicializar `e2e/package.json` con Playwright (`@playwright/test`) y
  `e2e/playwright.config.ts` apuntando a `http://localhost:5173` (frontend) con
  `webServer` opcional para levantar backend/frontend en CI.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: esquema de base de datos, config, dominio de tiempo, esqueleto HTTP y
scaffolding de frontend que TODAS las user stories necesitan.

**⚠️ CRITICAL**: ninguna user story puede implementarse hasta completar esta fase.

- [X] T007 [P] `db/migrations/0001_create_weekly_schedule.sql`: tabla
  `weekly_schedule` (ver data-model.md) + seed de 7 filas (`weekday` 0..6,
  `is_open=false`) + `CHECK` de horario válido.
- [X] T008 [P] `db/migrations/0002_create_schedule_settings.sql`: tabla
  `schedule_settings` (fila única `id=1`, `slot_duration_minutes` con
  `CHECK (> 0)`) + seed con valor por defecto (30 minutos).
- [X] T009 [P] `db/migrations/0003_create_blocks.sql`: tabla `blocks`
  (`starts_at`, `ends_at`, `reason`, `CHECK (ends_at > starts_at)`).
- [X] T010 [P] `db/migrations/0004_create_bookings.sql`: tabla `bookings` (todas
  las columnas de data-model.md, `CHECK` de `status` y de campos no vacíos) +
  `create unique index bookings_one_active_per_slot on bookings (slot_start) where
  status = 'active'` + índice sobre `slot_start` para consultas por rango/día.
- [X] T011 `db/migrate.sh`: script bash idempotente que crea `schema_migrations`
  si no existe y aplica cada archivo de `db/migrations/*.sql` en orden dentro de
  una transacción, registrándolo una sola vez (mismo patrón que
  `../futbol-vibecoding/db/migrate.sh`). Depende de T007-T010 (orden de archivos).
- [X] T012 [P] `backend/src/config/env.js`: lee y valida `DATABASE_URL` (o
  piezas `PGHOST`/`PGPORT`/`PGUSER`/`PGPASSWORD`/`PGDATABASE`), `OWNER_PASSWORD`
  (falla al arrancar si falta) y `PORT`; exporta un objeto de config tipado.
- [X] T013 [P] `backend/src/db/pool.js`: instancia única de `pg.Pool` construida
  a partir de `config/env.js`; exporta `query(text, params)` y `withTransaction(fn)`.
- [X] T014 [P] `backend/tests/unit/domain/time.test.js`: tests (Red primero) para
  las utilidades de tiempo — cálculo de "hoy" y ventana de 14 días en timezone
  local del servidor, comparación de instantes sin usar strings.
- [X] T015 `backend/src/domain/time.js`: implementa las utilidades cubiertas por
  T014 (Green). Sin `import` de Express ni de `pg` (Principio II). Depende de T014.
- [X] T016 `backend/src/errors.js`: clases/helpers de error de dominio
  (`AppError` con `code`, `message`, `field`, `status`) que mapean 1:1 a los
  códigos de contracts/api.md (`MISSING_FIELD`, `SLOT_ALREADY_BOOKED`,
  `BOOKING_NOT_FOUND`, `UNAUTHORIZED`, etc.).
- [X] T017 `backend/src/app.js`: esqueleto Express (JSON body parsing,
  montaje de routers vacío por ahora, middleware final de manejo de errores que
  serializa `AppError` al formato uniforme de contracts/api.md). Depende de T016.
- [X] T018 `backend/src/server.js`: bootstrap que arma `config` (T012) + `pool`
  (T013) + `app` (T017) y levanta el servidor en `PORT`. Depende de T012, T013, T017.
- [X] T019 [P] `backend/src/middleware/ownerAuth.js`: valida header
  `Authorization: Bearer <OWNER_PASSWORD>` contra `config/env.js`; responde `401
  UNAUTHORIZED` sin exponer datos si falta o no coincide (FR-016). Depende de T012.
- [X] T020 [P] `frontend/src/main.tsx` + `frontend/src/App.tsx`: enrutamiento base
  (rutas `/`, `/mi-turno`, `/agenda`) y layout/tokens visuales fundacionales
  (tipografía, paleta tinta-sobre-papel) siguiendo la dirección de la skill
  `frontend-design` — sin contenido de página todavía, solo el esqueleto y los
  tokens compartidos que las páginas de cada story van a usar.
- [X] T021 [P] `frontend/src/lib/api.ts`: wrapper `fetch` base (URL desde
  `VITE_API_URL`, parseo del formato de error uniforme de contracts/api.md,
  helper para agregar el header `Authorization` cuando corresponda).

**Checkpoint**: base lista — las user stories pueden implementarse (en el orden
que sigue, o en paralelo si hay más de una persona trabajando).

---

## Phase 3: User Story 1 - El dueño configura horarios y bloquea franjas (Priority: P1) 🎯 MVP (parte 1/2)

**Goal**: el dueño puede definir horario semanal + duración de turno, y crear/
eliminar bloqueos puntuales que anulan disponibilidad (y cancelan reservas
superpuestas).

**Independent Test**: configurar un horario semanal + duración vía
`PUT /api/admin/schedule`, verificar con `GET /api/admin/schedule`; crear un
bloqueo vía `POST /api/admin/blocks` y verificar que se registra (aún sin
`GET /api/availability`, que llega en US2).

### Tests for User Story 1 ⚠️

> Escribir estos tests primero, verlos fallar (Red), luego implementar (Green).

- [X] T022 [P] [US1] `backend/tests/unit/domain/schedule.test.js`: valida
  horario por día (fin > inicio si `isOpen`) y duración de turno (> 0); rechazo
  con mensaje accionable indicando el campo (FR-003).
- [X] T023 [P] [US1] `backend/tests/unit/domain/blocks.test.js`: valida rango de
  bloqueo (fin > inicio) y la función de solapamiento total/parcial contra un
  slot dado (FR-021, Edge Cases: solapamiento parcial cuenta como bloqueado).
- [X] T024 [P] [US1] `backend/tests/integration/admin.schedule.test.js`: contra
  Postgres real de Docker — `GET`/`PUT /api/admin/schedule` con clave correcta e
  incorrecta (401), y rechazo 400 `INVALID_SCHEDULE` con horario inválido.
- [X] T025 [P] [US1] `backend/tests/integration/admin.blocks.test.js`: contra
  Postgres real — `POST /api/admin/blocks` (incluye caso con reservas activas
  superpuestas que deben cancelarse automáticamente, FR-024) y
  `DELETE /api/admin/blocks/:id` (incluye 404).

### Implementation for User Story 1

- [X] T026 [US1] `backend/src/domain/schedule.js`: implementa las reglas
  cubiertas por T022 (Green). Puro, sin Express ni `pg`.
- [X] T027 [US1] `backend/src/domain/blocks.js`: implementa las reglas cubiertas
  por T023 (Green). Puro.
- [X] T028 [US1] `backend/src/db/scheduleRepository.js`: `getWeeklySchedule()`,
  `updateWeeklySchedule(rows)`, `getScheduleSettings()`,
  `updateScheduleSettings(minutes)` — SQL parametrizado sobre `weekly_schedule` y
  `schedule_settings` (T007, T008). Depende de T013.
- [X] T029 [US1] `backend/src/db/blocksRepository.js`: `createBlock(range,
  reason)` (dentro de una transacción: inserta el bloqueo y cancela en la misma
  transacción las `bookings` activas superpuestas, devolviendo sus códigos —
  FR-024), `deleteBlock(id)`, `listActiveBlocks(range)`. Depende de T013, T009,
  T010.
- [X] T030 [US1] `backend/src/routes/admin/schedule.routes.js`: `GET`/`PUT
  /api/admin/schedule` protegidos por `ownerAuth` (T019), usan `domain/schedule.js`
  (T026) + `db/scheduleRepository.js` (T028), errores vía `http/errors.js` (T016).
- [X] T031 [US1] `backend/src/routes/admin/blocks.routes.js`: `POST`/`DELETE
  /api/admin/blocks/:id` protegidos por `ownerAuth`, usan `domain/blocks.js`
  (T027) + `db/blocksRepository.js` (T029).
- [X] T032 [US1] Montar `admin/schedule.routes.js` y `admin/blocks.routes.js` en
  `backend/src/app.js` bajo `/api/admin`. Depende de T030, T031, T017.
- [X] T033 [P] [US1] `frontend/src/pages/Agenda/ScheduleForm.tsx`: formulario de
  horario semanal (7 días × abierto/cerrado + inicio/fin) y duración de turno,
  como tabla/grilla temporal (no cards), siguiendo la dirección visual de
  `frontend-design`.
- [X] T034 [P] [US1] `frontend/src/pages/Agenda/BlocksPanel.tsx`: alta/baja de
  bloqueos puntuales, mostrados como anotación al margen sobre la grilla (no
  íconos en círculos de color).
- [X] T035 [US1] `frontend/src/lib/api.ts`: agregar `getSchedule`,
  `putSchedule`, `createBlock`, `deleteBlock` (usan el wrapper de T021 con
  `Authorization`). Depende de T021, T033, T034.

**Checkpoint**: el dueño puede configurar horario y bloqueos de punta a punta
(quickstart.md pasos 1-2, salvo la verificación de disponibilidad que llega en US2).

---

## Phase 4: User Story 2 - El cliente reserva un turno y recibe un código (Priority: P1) 🎯 MVP (parte 2/2)

**Goal**: el cliente ve disponibilidad de los próximos 14 días (a partir del
horario + bloqueos de US1) y reserva un turno, recibiendo un código único; dos
reservas simultáneas sobre el mismo slot no pueden ganar ambas.

**Independent Test**: con horario ya configurado (US1), listar disponibilidad
(`GET /api/availability`), reservar un slot (`POST /api/bookings`), recibir
`bookingCode`; repetir la reserva sobre el mismo slot en paralelo y verificar que
solo una gana (409 en la otra).

### Tests for User Story 2 ⚠️

- [X] T036 [P] [US2] `backend/tests/unit/domain/availability.test.js`: calcula
  slots candidatos a partir de horario semanal + duración + bloqueos + reservas
  activas, para un rango de días dado (FR-006); casos límite de solapamiento
  parcial con bloqueo (Edge Cases).
- [X] T037 [P] [US2] `backend/tests/unit/domain/bookingCode.test.js`: genera
  códigos de 8 caracteres con el alfabeto sin ambiguos (FR-027); valida formato.
- [X] T038 [P] [US2] `backend/tests/integration/availability.test.js`: contra
  Postgres real — `GET /api/availability` refleja horario + bloqueos + reservas
  existentes, limitado a la ventana de 14 días (FR-023).
- [X] T039 [P] [US2] `backend/tests/integration/bookings.create.test.js`: contra
  Postgres real — `POST /api/bookings` exitoso (201 + código), rechazo por campo
  faltante (400 `MISSING_FIELD`), rechazo por slot bloqueado/pasado (400/409), y
  **dos inserciones concurrentes sobre el mismo `slotStart`** donde solo una
  recibe 201 y la otra 409 `SLOT_ALREADY_BOOKED` (SC-002, valida el índice único
  parcial de T010).

### Implementation for User Story 2

- [X] T040 [US2] `backend/src/domain/availability.js`: implementa T036 (Green).
  Recibe horario/bloqueos/reservas ya leídos (inyectados), sin `pg` ni Express.
- [X] T041 [US2] `backend/src/domain/bookingCode.js`: implementa T037 (Green).
- [X] T042 [US2] `backend/src/db/availabilityRepository.js`: lee horario
  (reusa T028), bloqueos activos en rango (reusa T029) y reservas activas en
  rango, para alimentar `domain/availability.js`.
- [X] T043 [US2] `backend/src/db/bookingsRepository.js`: `createBooking(slot,
  customer)` — genera código con `domain/bookingCode.js` (reintenta en colisión
  de `UNIQUE`), inserta y traduce la violación del índice parcial
  `bookings_one_active_per_slot` a un error `SLOT_ALREADY_BOOKED` (T016).
  Depende de T013, T010, T041.
- [X] T044 [US2] `backend/src/routes/availability.routes.js`: `GET
  /api/availability?from=&to=` usa `domain/availability.js` + T042.
- [X] T045 [US2] `backend/src/routes/bookings.routes.js`: `POST /api/bookings`
  usa `domain/schedule.js`/`blocks.js` (validar slot dentro de grilla y no
  bloqueado) + `db/bookingsRepository.js` (T043).
- [X] T046 [US2] Montar `availability.routes.js` y `bookings.routes.js` en
  `backend/src/app.js` bajo `/api`. Depende de T044, T045, T017.
- [X] T047 [P] [US2] `frontend/src/pages/Reservar/Reservar.tsx`: grilla temporal
  continua de horarios disponibles por día (franjas regladas, no tarjetas
  flotantes) + formulario de nombre/teléfono + pantalla de código recibido.
- [X] T048 [US2] `frontend/src/lib/api.ts`: agregar `getAvailability`,
  `createBooking`. Depende de T021, T047.

**Checkpoint**: MVP completo — US1 + US2 cubren el flujo central del negocio
(quickstart.md pasos 1-4).

---

## Phase 5: User Story 3 - El cliente consulta y cancela su turno con el código (Priority: P2)

**Goal**: con el código de reserva, cualquiera puede ver el estado del turno y
cancelarlo si está activo y a más de 2h del inicio; con rate limiting básico por
IP sobre estos endpoints.

**Independent Test**: con una reserva ya creada (US2), consultarla por código
(`GET /api/bookings/:code`), cancelarla si falta más de 2h
(`POST /api/bookings/:code/cancel`), y verificar que el slot vuelve a aparecer en
`GET /api/availability`; verificar rechazo (403) si faltan menos de 2h.

### Tests for User Story 3 ⚠️

- [X] T049 [P] [US3] `backend/tests/unit/domain/cancellation.test.js`: calcula
  `canCancel` (activo + ≥2h de antelación) a partir de estado + hora actual +
  `slotStart` (FR-025); casos límite exactamente en 2h.
- [X] T050 [P] [US3] `backend/tests/integration/bookings.lookup.test.js`: contra
  Postgres real — `GET /api/bookings/:code` con código válido, inexistente (404
  genérico, FR-012) y mal formado.
- [X] T051 [P] [US3] `backend/tests/integration/bookings.cancel.test.js`: contra
  Postgres real — cancelación exitosa (>2h), rechazo 403
  `CANCELLATION_WINDOW_CLOSED` (<2h), rechazo 409 `BOOKING_NOT_ACTIVE` sobre un
  turno ya cumplido/ausente/cancelado, y verificación de que el rate limiting
  responde 429 tras exceder el umbral configurado.

### Implementation for User Story 3

- [X] T052 [P] [US3] `backend/src/middleware/rateLimit.js`: limitador simple por
  IP (ventana fija en memoria, sin dependencia externa) aplicable como
  middleware a rutas específicas (FR-028).
- [X] T053 [US3] `backend/src/domain/cancellation.js`: implementa T049 (Green).
- [X] T054 [US3] `backend/src/db/bookingsRepository.js`: agregar `findByCode(code)`
  y `cancelByCode(code)` (actualiza `status='cancelled'`,
  `cancelled_reason='customer'` solo si `status='active'`, devuelve el estado
  previo para distinguir 404/409/403 en la ruta). Depende de T043.
- [X] T055 [US3] `backend/src/routes/bookings.routes.js`: agregar `GET
  /api/bookings/:code` y `POST /api/bookings/:code/cancel`, ambas con
  `rateLimit` (T052) y usando `domain/cancellation.js` (T053) +
  `db/bookingsRepository.js` (T054).
- [X] T056 [P] [US3] `frontend/src/pages/MiTurno/MiTurno.tsx`: búsqueda por
  código, detalle del turno (día/hora/estado) y botón de cancelar (deshabilitado
  con mensaje claro si `canCancel` es falso).
- [X] T057 [US3] `frontend/src/lib/api.ts`: agregar `getBookingByCode`,
  `cancelBooking`. Depende de T021, T056.

**Checkpoint**: US1+US2+US3 cubren quickstart.md pasos 1-6.

---

## Phase 6: User Story 4 - El dueño gestiona la agenda del día (Priority: P2)

**Goal**: el dueño autenticado ve todos los turnos de un día (incluyendo días
pasados) y puede marcarlos como cumplido/ausente o cancelarlos, respetando las
transiciones de estado válidas.

**Independent Test**: con turnos ya reservados (US2), el dueño se autentica, ve
la agenda de ese día (`GET /api/admin/agenda?date=`), marca uno cumplido, otro
ausente, cancela un tercero, y verifica que un cuarto intento de cambiar un turno
ya terminal es rechazado con el estado actual.

### Tests for User Story 4 ⚠️

- [X] T058 [P] [US4] `backend/tests/unit/domain/bookingStatus.test.js`: valida
  transiciones permitidas (`active → completed|no_show|cancelled`) y rechazo
  desde estados terminales, con mensaje indicando el estado actual (FR-020).
- [X] T059 [P] [US4] `backend/tests/integration/admin.agenda.test.js`: contra
  Postgres real — `GET /api/admin/agenda?date=` con clave correcta (incluye
  turnos de un día pasado, Edge Cases) e incorrecta (401 sin datos).
- [X] T060 [P] [US4] `backend/tests/integration/admin.bookings.test.js`: contra
  Postgres real — `POST .../complete`, `.../no-show`, `.../cancel` exitosos
  sobre un turno activo, y 409 `BOOKING_NOT_ACTIVE` al repetir sobre uno ya
  terminal.

### Implementation for User Story 4

- [X] T061 [US4] `backend/src/domain/bookingStatus.js`: implementa T058 (Green).
- [X] T062 [US4] `backend/src/db/bookingsRepository.js`: agregar
  `findByDate(date)` y `updateStatus(code, newStatus, reason?)` (aplica la
  transición solo si el estado actual es `active`, devuelve el estado previo
  para el 409). Depende de T054.
- [X] T063 [US4] `backend/src/routes/admin/agenda.routes.js`: `GET
  /api/admin/agenda?date=` protegido por `ownerAuth` (T019).
- [X] T064 [US4] `backend/src/routes/admin/bookings.routes.js`: `POST
  /api/admin/bookings/:code/complete`, `.../no-show`, `.../cancel` protegidos
  por `ownerAuth`, usan `domain/bookingStatus.js` (T061) + T062.
- [X] T065 [US4] Montar `admin/agenda.routes.js` y `admin/bookings.routes.js` en
  `backend/src/app.js`. Depende de T063, T064, T032.
- [X] T066 [P] [US4] `frontend/src/pages/Agenda/AgendaView.tsx`: puerta de
  autenticación (clave del dueño), selector de día, lista de turnos con acciones
  cumplido/ausente/cancelar; compone `ScheduleForm.tsx` (T033) y
  `BlocksPanel.tsx` (T034) en la misma vista `/agenda`.
- [X] T067 [US4] `frontend/src/lib/api.ts`: agregar `getAgenda`,
  `completeBooking`, `markNoShow`, `cancelBookingAsOwner`. Depende de T021, T066.

**Checkpoint**: las 4 user stories funcionan de punta a punta (quickstart.md
pasos 1-8).

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: coherencia visual final, cobertura E2E, y documentación de arranque.

- [X] T068 [P] Revisión de coherencia visual "agenda de papel" en
  `frontend/src/styles/`: tokens de tipografía/color compartidos entre
  `Reservar`, `MiTurno` y `Agenda` (T047, T056, T066), confirmando que no se
  usan gradientes, glassmorphism, acento violeta/índigo, cards de radius grande
  con sombra difusa, ni íconos en círculos de color (restricciones del usuario).
- [X] T069 [P] `e2e/tests/flujo-completo.spec.ts`: flujo Playwright completo —
  dueño configura horario (US1) → cliente reserva (US2) → cliente consulta con
  su código (US3) → cliente cancela (US3) → el slot vuelve a estar disponible
  (`GET /api/availability` lo vuelve a listar).
- [X] T070 `README.md` en la raíz del repo: comandos para levantar todo de cero
  (docker compose, `db/migrate.sh`, `npm install`/`npm run dev` en backend y
  frontend, `npm test` en backend y `e2e`), siguiendo quickstart.md.
- [X] T071 Ejecutar manualmente la checklist de validación de quickstart.md
  (pasos 1-8) contra el stack completo levantado con T070, y corregir cualquier
  desvío encontrado antes de dar la feature por terminada. Cronometrar los
  criterios SC-001 (<2min reservar), SC-003 (<30s consultar/cancelar) y SC-004
  (<15s por acción de agenda) durante el recorrido manual.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — arranca de inmediato.
- **Foundational (Phase 2)**: depende de Setup — bloquea todas las user stories.
- **User Stories (Phase 3-6)**: todas dependen de Foundational.
  - US1 (Phase 3) y US2 (Phase 4) son ambas P1: US2 depende de que existan
    `weekly_schedule`/`blocks` en base (migraciones de Foundational) pero su
    lógica de disponibilidad puede desarrollarse en paralelo a US1 si se mockean
    los datos de horario/bloqueos en los tests unitarios; la integración
    end-to-end de "disponibilidad real" requiere que US1 ya haya guardado un
    horario. Se recomienda orden secuencial US1 → US2 para evitar bloqueos.
  - US3 (Phase 5) depende de que exista `db/bookingsRepository.js` (creado en
    US2, T043) — no puede empezar antes de US2.
  - US4 (Phase 6) depende de `db/bookingsRepository.js` (US2, T043) y de
    `cancelByCode`/estructura de estados (US3, T054) para extenderlos con
    `findByDate`/`updateStatus` sin conflicto de archivo.
- **Polish (Phase 7)**: depende de que las 4 user stories estén completas.

### User Story Dependencies

- **US1 (P1)**: depende solo de Foundational.
- **US2 (P1)**: depende de Foundational; para probarse con datos reales de
  disponibilidad depende de que US1 haya guardado un horario (o de fixtures de
  test que simulen uno).
- **US3 (P2)**: depende de Foundational + US2 (reutiliza y extiende
  `bookingsRepository.js` y las rutas de `bookings.routes.js`).
- **US4 (P2)**: depende de Foundational + US2 + US3 (extiende
  `bookingsRepository.js` sobre el mismo archivo que ambas tocan).

### Parallel Opportunities

- Todas las tareas [P] de Setup (T003-T006) en paralelo tras T001-T002.
- Todas las tareas [P] de Foundational (T007-T010, T012-T014, T019-T021) en
  paralelo entre sí (T011 espera a T007-T010; T015 espera a T014; T016-T018 son
  secuenciales entre sí).
- Dentro de cada user story, los tests marcados [P] corren en paralelo entre sí
  (archivos distintos); los tests unitarios de dominio no dependen de Postgres y
  pueden correr aún antes de que `db/migrate.sh` se haya ejecutado en el entorno
  de CI.
- Las tareas de frontend marcadas [P] (T033/T034, T047, T056, T066) pueden
  desarrollarse en paralelo al backend de la misma story una vez que el contrato
  de API (contracts/api.md) está fijado, mockeando `lib/api.ts` hasta que el
  backend esté listo.

---

## Parallel Example: User Story 1

```bash
# Tests de US1 en paralelo:
Task: "Unit test schedule validation en backend/tests/unit/domain/schedule.test.js"
Task: "Unit test blocks overlap en backend/tests/unit/domain/blocks.test.js"
Task: "Integration test admin schedule en backend/tests/integration/admin.schedule.test.js"
Task: "Integration test admin blocks en backend/tests/integration/admin.blocks.test.js"

# Frontend de US1 en paralelo (una vez fijado el contrato de API):
Task: "ScheduleForm.tsx en frontend/src/pages/Agenda/ScheduleForm.tsx"
Task: "BlocksPanel.tsx en frontend/src/pages/Agenda/BlocksPanel.tsx"
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Completar Phase 1: Setup.
2. Completar Phase 2: Foundational (crítico — bloquea todo lo demás).
3. Completar Phase 3: User Story 1 (dueño configura horario/bloqueos).
4. Completar Phase 4: User Story 2 (cliente reserva y recibe código).
5. **DETENER y VALIDAR**: correr quickstart.md pasos 1-4 de punta a punta.
6. Este es el MVP: sin US1+US2 el sistema no cumple su propósito central; con
   ambas, ya hay negocio funcionando (aunque sin autocancelación ni agenda del
   dueño).

### Incremental Delivery

1. Setup + Foundational → base lista.
2. US1 → US2 → validar MVP (quickstart pasos 1-4) → demo.
3. US3 → validar (quickstart pasos 5-6) → demo (autocancelación por código).
4. US4 → validar (quickstart pasos 7-8) → demo (agenda operativa del dueño).
5. Polish (E2E, README, validación final).

---

## Notes

- [P] = archivos distintos, sin dependencias entre sí.
- [Story] mapea cada tarea a su user story para trazabilidad.
- Verificar que los tests fallan (Red) antes de implementar (Green) — Principio I
  de la constitución, no negociable para lógica de negocio.
- La invariante "un turno, una reserva activa" está garantizada por el índice
  único parcial de T010 (Postgres), no solo por la validación de dominio de
  T040/T045 — T039 debe probar explícitamente el caso de concurrencia real.
- Commitear después de cada tarea o grupo lógico.
- Detenerse en cada checkpoint para validar la story de forma independiente
  antes de continuar con la siguiente.
