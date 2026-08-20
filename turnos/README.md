# Turnos — Barbería

Sistema de turnos sin login para una barbería de un solo prestador. El dueño configura
su horario semanal + duración de turno y puede bloquear franjas puntuales; el cliente
ve disponibilidad de los próximos 14 días, reserva dejando nombre/teléfono y recibe un
código de reserva de 8 caracteres para consultar/cancelar su turno. El dueño gestiona
la agenda del día autenticado con una clave por variable de entorno.

Ver la especificación completa en
[`specs/002-turnos-barberia-agenda/`](specs/002-turnos-barberia-agenda/).

## Stack

- **Backend**: Node.js 22 (ESM) + Express 4 + `pg` (sin ORM), dominio puro separado de
  HTTP y SQL.
- **Base de datos**: PostgreSQL 16 en Docker, migraciones `.sql` numeradas aplicadas
  por `db/migrate.sh`.
- **Frontend**: React 19 + Vite 6 + TypeScript + Tailwind CSS 4.
- **Tests**: Vitest (unitarios de dominio + integración contra Postgres real),
  Playwright (E2E).

## Requisitos

- Docker + Docker Compose
- Node.js 22

## Levantar de cero

```bash
# 1. Variables de entorno
cp .env.example .env
# completar OWNER_PASSWORD con una clave propia

# 2. Base de datos
docker compose up -d              # Postgres (puerto 5433) + Adminer (puerto 8081)
./db/migrate.sh                   # aplica migraciones 0001..0004

# 3. Backend
cd backend
npm install
npm run dev                       # http://localhost:3000 (o el PORT configurado)

# 4. Frontend (en otra terminal)
cd ../frontend
npm install
npm run dev                       # http://localhost:5173
```

## Tests automatizados

```bash
# Backend: unitarios (dominio, sin DB) + integración (rutas, requiere Postgres de Docker corriendo)
cd backend
npm test

# End-to-end: flujo completo (dueño configura → cliente reserva → consulta → cancela → slot libre)
# requiere Postgres, backend y frontend corriendo
cd ../e2e
npm install
npx playwright install chromium   # una sola vez
OWNER_PASSWORD=<tu-clave> npm test
```

## Estructura

```text
docker-compose.yml        # Postgres (5433) + Adminer (8081)
db/migrations/            # esquema SQL numerado
db/migrate.sh              # aplica migraciones pendientes

backend/src/
├── domain/                # reglas puras: schedule, blocks, availability,
│                             bookingCode, cancellation, bookingStatus, time
├── db/                    # pool + repositorios SQL parametrizado
├── routes/                 # routers Express (públicos + /admin)
├── middleware/              # ownerAuth, rateLimit
├── config/                   # lectura/validación de variables de entorno
├── errors.js                  # contrato de error uniforme
├── app.js                      # wiring de Express
└── server.js                    # arranque del proceso

frontend/src/
├── pages/Reservar/          # cliente: ver disponibilidad + reservar
├── pages/MiTurno/            # cliente: consultar/cancelar por código
├── pages/Agenda/              # dueño: horario, bloqueos, agenda del día
├── lib/api.ts                  # cliente HTTP hacia /api
└── styles/tokens.css            # dirección visual "libreta de turnos"

e2e/tests/flujo-completo.spec.ts  # Playwright: flujo de punta a punta
```

## Endpoints principales

Ver el contrato completo en
[`specs/002-turnos-barberia-agenda/contracts/api.md`](specs/002-turnos-barberia-agenda/contracts/api.md).

- `GET /api/availability?from=&to=` — turnos disponibles (próximos 14 días).
- `POST /api/bookings` — reservar un turno.
- `GET /api/bookings/:code` / `POST /api/bookings/:code/cancel` — consultar/cancelar
  por código (rate limited por IP).
- `GET|PUT /api/admin/schedule`, `POST /api/admin/blocks`,
  `DELETE /api/admin/blocks/:id`, `GET /api/admin/agenda?date=`,
  `POST /api/admin/bookings/:code/{complete,no-show,cancel}` — requieren
  `Authorization: Bearer <OWNER_PASSWORD>`.
