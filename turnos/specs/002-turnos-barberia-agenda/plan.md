# Implementation Plan: Turnos de Barbería con Código de Reserva y Agenda del Dueño

**Branch**: `002-turnos-barberia-agenda` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-turnos-barberia-agenda/spec.md`

## Summary

Sistema de turnos sin login para una barbería: el dueño configura horario semanal +
duración de turno y puede bloquear franjas puntuales; el cliente ve disponibilidad de
los próximos 14 días, reserva dejando nombre/teléfono y recibe un código de reserva
de 8 caracteres para consultar/cancelar; el dueño gestiona la agenda del día
(cumplido/ausente/cancelar) autenticado con una clave por variable de entorno. La
invariante central — un turno solo puede tener una reserva activa — se garantiza con
un `UNIQUE INDEX` parcial en Postgres, no solo con validación en JS. Reemplaza la
implementación previa en memoria (incompatible con la constitución v2.0.0) por:
Postgres 16 en Docker + migraciones SQL numeradas, backend Node/Express con dominio
puro separado de HTTP y de SQL, y un frontend React/Vite/TS/Tailwind nuevo con
dirección visual de "agenda de papel".

## Technical Context

**Language/Version**: Node.js 22 (backend, ESM), TypeScript 5.7 (frontend)

**Primary Dependencies**: Express 4 (HTTP), `pg` (driver Postgres, sin ORM), React
19 + Vite 6 + Tailwind CSS 4 (frontend), Vitest (unit/integration tests backend),
Playwright (E2E)

**Storage**: PostgreSQL 16 (Docker, puerto host 5433), migraciones `.sql` numeradas
aplicadas por `db/migrate.sh`

**Testing**: Vitest (`backend/tests/unit`, `backend/tests/integration`), Playwright
(`e2e/`)

**Target Platform**: Servidor Linux/macOS (Docker + Node), navegador moderno (SPA)

**Project Type**: Web application (backend + frontend separados)

**Performance Goals**: Sin metas de throughput explícitas (negocio de barrio, tráfico
bajo); las metas relevantes son de latencia percibida por el usuario, ya cubiertas
por Success Criteria (SC-001 <2min reserva, SC-003 <30s consulta/cancelación, SC-004
<15s por acción de agenda) — no requieren optimización especial más allá de queries
indexadas.

**Constraints**: Puerto 5432 del host ocupado por otro Postgres → este proyecto usa
5433:5432 (Postgres) y 8081:8080 (Adminer, para no chocar con el 8080 usado por
`futbol-vibecoding`); todo instante en UTC internamente (Principio III); invariante
de no-doble-reserva garantizada en Postgres, no solo en JS (Principio IV); sin ORM
(Principio V); sin librería de componentes UI en el frontend (restricción de
producto); grilla de horarios como tabla temporal continua, no cards flotantes
(restricción de producto).

**Scale/Scope**: Un solo dueño/barbería, sin multi-tenant; volumen esperado bajo
(decenas de turnos por día); 3 vistas de frontend, ~9 endpoints de API.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cumplimiento en este plan |
|---|---|
| I. Test-First | Vitest unitario para todo el dominio (`domain/`) antes de implementar; toda ruta en `routes/` tiene su test de integración (exigido explícitamente en el input del usuario). |
| II. Dominio Puro | `backend/src/domain/` no importa Express ni `pg`; recibe datos ya leídos y devuelve decisiones/errores puros, testeado sin servidor ni DB real. |
| III. Tiempo en UTC | Todas las columnas de tiempo son `timestamptz`; conversión a timezone local del servidor solo en el borde (cálculo de "hoy"/ventana de 14 días, formateo de presentación); ninguna comparación por string (ver research.md § Timezone). |
| IV. La Base de Datos es la Verdad | `UNIQUE INDEX` parcial (`bookings_one_active_per_slot`, `WHERE status='active'`) garantiza la no-doble-reserva en Postgres (ver data-model.md); el dominio valida primero para dar buen mensaje, pero no es la única defensa. |
| V. SQL Plano | Sin ORM; `pg` con SQL parametrizado en `backend/src/db/`; migraciones `.sql` numeradas en `db/migrations/`, aplicadas por `db/migrate.sh` con tabla `schema_migrations` (ver research.md). |
| VI. Sin Dependencias Nuevas sin Justificación | Cada dependencia nueva (`pg`, Playwright, `@tailwindcss/vite`, etc.) está justificada en research.md; rate limiting se implementa propio en vez de sumar `express-rate-limit` (justificado en research.md). |
| VII. Errores Útiles | Contrato de error uniforme con `code`/`message`/`field` accionable (ver contracts/api.md); cada error de negocio (slot ocupado, ventana de cancelación cerrada, transición de estado inválida) nombra la regla concreta, nunca un mensaje genérico. |

Sin violaciones. No aplica Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/002-turnos-barberia-agenda/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/
│   └── api.md            # Phase 1 output (/speckit-plan command)
└── tasks.md              # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
docker-compose.yml        # postgres:16-alpine (5433:5432) + adminer (8081:8080)
.env.example               # todas las variables (DB, OWNER_PASSWORD, PORT, etc.)

db/
├── migrations/
│   ├── 0001_create_weekly_schedule.sql
│   ├── 0002_create_schedule_settings.sql
│   ├── 0003_create_blocks.sql
│   └── 0004_create_bookings.sql
└── migrate.sh

backend/
├── src/
│   ├── domain/          # reglas puras: availability, schedule, blocks, bookings,
│   │                     # booking-code, cancellation-window — sin Express ni pg
│   ├── db/               # pool de conexión + queries SQL parametrizadas
│   ├── routes/            # routers Express: availability, bookings, admin
│   ├── middleware/         # ownerAuth.js, rateLimit.js
│   ├── config/              # lectura/validación de env vars
│   ├── errors.js            # contrato de error compartido (AppError, códigos)
│   ├── app.js                # wiring de Express (routers + middleware)
│   └── server.js              # arranque del proceso (config + pool + app + listen)
├── tests/
│   ├── unit/               # domain, sin DB
│   └── integration/         # routes, contra Postgres real de Docker
└── package.json

frontend/
├── src/
│   ├── pages/               # Reservar, MiTurno, Agenda
│   ├── components/           # piezas de UI propias (sin librería de componentes)
│   ├── lib/                    # cliente API, formateo de fecha/hora
│   └── main.tsx
├── vite.config.ts
├── tailwind.config / vite plugin de Tailwind 4
└── package.json

e2e/
├── tests/
│   └── flujo-completo.spec.ts  # dueño configura → cliente reserva → consulta → cancela → slot libre
└── playwright.config.ts
```

**Structure Decision**: Web application con `backend/` y `frontend/` como proyectos
Node independientes en la raíz del repo (cada uno con su propio `package.json`),
manteniendo el layout ya existente en el repo (`backend/`, `frontend/`) pero
reestructurando su interior según lo pedido: el backend pasa de
`src/http`+`src/store` (memoria) a `src/domain`+`src/db`+`src/routes`+
`src/middleware`+`src/config`+`src/errors.js`+`src/app.js` (Postgres) — sin recrear
`src/http/` —, y el frontend pasa de HTML/JS plano a un proyecto Vite/React/TS. Se suma
`db/` (migraciones) y `e2e/` (Playwright) en la raíz, y `docker-compose.yml` +
`.env.example` en la raíz del repo. La implementación previa en memoria
(`backend/src/store/memoryStore.js`, `backend/src/http/*`, `frontend/*.html`,
`frontend/js/*.js`) se elimina como parte de la migración: convivir con dos fuentes
de verdad de disponibilidad (memoria vs Postgres) violaría el Principio IV.

## Complexity Tracking

*No violations — sección no aplica.*
