# Implementation Plan: Sistema de Turnos para Barbería

**Branch**: `001-sistema-turnos-barberia` | **Date**: 2026-08-13 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-sistema-turnos-barberia/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command; its definition describes the execution workflow.

## Summary

Sistema de turnos para una barbería de un solo prestador: el dueño configura horario de
atención y duración de turno; el sistema deriva la grilla de turnos disponibles; los clientes
reservan, consultan y cancelan turnos identificándose por email/teléfono (sin cuenta); el dueño
tiene una vista de solo lectura de todas las reservas. Enfoque técnico: API HTTP con Node +
Express (ESM), estado en memoria (`Map`), dominio puro separado de Express, tests con Vitest, y
un frontend mínimo en HTML + JS vanilla que consume esa API.

## Technical Context

**Language/Version**: Node.js (ESM, `"type": "module"`), JavaScript (sin TypeScript)

**Primary Dependencies**: Express (capa HTTP); sin ORM ni cliente de base de datos

**Storage**: Ninguna base de datos externa — estado en memoria del proceso usando `Map`
(Principio III de la constitución)

**Testing**: Vitest, para tests de dominio (unit) y tests de la API HTTP (integration vía
supertest-like fetch a la app Express)

**Target Platform**: Servidor Node.js local (sin requerimiento de despliegue en esta iteración)

**Project Type**: Web (backend Express + frontend estático mínimo)

**Performance Goals**: Sin metas de throughput específicas; alcanza con respuesta interactiva
para uso de una sola barbería (decenas de turnos/día, no miles de usuarios concurrentes)

**Constraints**: Todo tiempo se maneja en UTC dentro del dominio (Principio II); el dominio de
negocio no debe importar Express (Principio IV); sin dependencias nuevas fuera de
Express + Vitest sin justificación escrita (Principio V)

**Scale/Scope**: Un único barbero/prestador, una sola grilla de turnos compartida; volumen
esperado bajo (una barbería individual, no una cadena)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Chequeo | Estado |
|---|---|---|
| I. Test-First | Toda lógica de negocio (dominio: generación de grilla, reservas, cancelaciones, solapamientos) se desarrolla test-first con Vitest | PASS (planificado: tests de dominio antes que implementación) |
| II. UTC Internamente | El dominio y el `Map` en memoria almacenan y comparan horarios en UTC; la conversión a timezone local ocurre solo en la capa de presentación (API responses / frontend) | PASS (ver `data-model.md` y `research.md`) |
| III. Sin Base de Datos | Estado en memoria vía `Map`, sin PostgreSQL/SQLite/ORM, sin Docker | PASS |
| IV. Dominio Puro | Módulo `domain/` sin imports de Express; Express solo invoca funciones del dominio desde `routes/`/`controllers/` | PASS (ver Project Structure) |
| V. Sin Dependencias Nuevas sin Justificación | Dependencias propuestas: `express` (servidor HTTP, requerido explícitamente por el usuario) y `vitest` (testing, requerido explícitamente); ninguna otra dependencia de producción | PASS — justificación: ambas fueron pedidas explícitamente por el usuario en el input de `/speckit-plan`; no se agrega ORM, framework de frontend, ni librería de fechas externa (se usa `Date`/`Intl` nativos de Node) |

No hay violaciones que requieran `Complexity Tracking`.

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── domain/            # Lógica de negocio pura (Principio IV) — sin imports de Express
│   │   ├── schedule.js        # Configuración de horario de atención + duración de turno
│   │   ├── slots.js           # Generación de grilla de turnos disponibles a partir del schedule
│   │   ├── bookings.js        # Reservar / cancelar / listar por cliente / listar todas (dueño)
│   │   └── time.js            # Helpers de tiempo en UTC (comparación, solapamiento)
│   ├── store/
│   │   └── memoryStore.js     # Estado en memoria (Map) para schedule, slots y bookings
│   ├── http/
│   │   ├── app.js             # App Express (wiring de rutas y middlewares)
│   │   ├── routes/
│   │   │   ├── schedule.routes.js
│   │   │   ├── slots.routes.js
│   │   │   └── bookings.routes.js
│   │   └── serializers.js     # Conversión UTC → timezone local para las respuestas (Principio II)
│   └── server.js              # Entry point (levanta el servidor Express)
└── tests/
    ├── unit/                  # Tests de dominio puro (Vitest), test-first (Principio I)
    │   ├── slots.test.js
    │   ├── bookings.test.js
    │   └── time.test.js
    └── integration/           # Tests de la API HTTP (Vitest + fetch contra la app Express)
        ├── schedule.api.test.js
        ├── slots.api.test.js
        └── bookings.api.test.js

frontend/
├── index.html              # Vista de cliente: ver turnos disponibles, reservar, ver/cancelar los propios
├── admin.html               # Vista del dueño: configurar horario/duración, ver todas las reservas
├── css/
│   └── styles.css
└── js/
    ├── api.js                # Cliente fetch hacia la API del backend
    ├── client.js              # Lógica de la vista de cliente (index.html)
    └── admin.js               # Lógica de la vista del dueño (admin.html)
```

**Structure Decision**: Aplicación web con separación `backend/` (Express + dominio puro en
memoria) y `frontend/` (HTML + JS vanilla estático, sin build step ni framework), servida por
Express como archivos estáticos. Dentro de `backend/src/`, `domain/` no importa nada de
`http/` ni de `express` (Principio IV); `http/` es la única capa que conoce Express y traduce
entre HTTP y las funciones del dominio, incluida la conversión UTC → timezone local
(Principio II) al serializar respuestas.

## Complexity Tracking

No aplica — el Constitution Check no registró violaciones que requieran justificación.

## Constitution Check (post-diseño)

*Re-chequeo tras Phase 1 (data-model.md, contracts/, quickstart.md).*

| Principio | Chequeo post-diseño | Estado |
|---|---|---|
| I. Test-First | `Project Structure` separa `tests/unit/` (dominio) de `tests/integration/` (API), permitiendo Red-Green-Refactor sobre `domain/*.js` antes de tocar Express | PASS |
| II. UTC Internamente | `data-model.md` fija `startUtc`/`endUtc` en `Booking` y `Slot`; `contracts/api.md` documenta que la conversión a timezone local ocurre solo en las respuestas HTTP (`startLocal`/`endLocal`), nunca en el dominio | PASS |
| III. Sin Base de Datos | `data-model.md` solo define `Schedule` (singleton) y `Booking` como estructuras en memoria; `Slot` es derivado, no persistido — no se introdujo ninguna dependencia de almacenamiento externo | PASS |
| IV. Dominio Puro | `contracts/api.md` mapea 1:1 endpoints Express → funciones de `domain/` (`schedule.js`, `slots.js`, `bookings.js`); ningún contrato expone detalles de Express hacia el dominio | PASS |
| V. Sin Dependencias Nuevas | `research.md` (Decisión 3) justifica explícitamente el rechazo de librerías de fechas externas (date-fns/luxon/dayjs) en favor de `Date`/`Intl` nativos; no se introdujeron dependencias nuevas durante el diseño | PASS |

Sin violaciones nuevas introducidas en Phase 1. Listo para `/speckit-tasks`.
