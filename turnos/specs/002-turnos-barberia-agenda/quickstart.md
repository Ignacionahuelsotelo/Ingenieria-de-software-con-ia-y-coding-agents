# Quickstart: Turnos de Barbería

Guía para levantar el stack de cero y validar el flujo completo. Ver
[data-model.md](./data-model.md) para el esquema y [contracts/api.md](./contracts/api.md)
para los endpoints.

## Prerrequisitos

- Docker + Docker Compose
- Node 22
- Copiar `.env.example` a `.env` (raíz del repo) y completar `OWNER_PASSWORD` con una
  clave propia.

## Levantar de cero

```bash
docker compose up -d              # Postgres (puerto 5433) + Adminer (puerto 8081)
./db/migrate.sh                   # aplica migraciones 0001..000N contra el Postgres de Docker

cd backend && npm install
npm run dev                       # backend Express en http://localhost:3000 (o el PORT configurado)

cd ../frontend && npm install
npm run dev                       # frontend Vite en http://localhost:5173
```

## Validación manual del flujo (User Stories 1–4)

1. **Dueño configura horario** (US1): en `/agenda`, ingresar `OWNER_PASSWORD`,
   configurar horario semanal (ej. lunes a viernes 9–18, duración 30 min) y guardar.
   Esperado: `GET /api/admin/schedule` devuelve la configuración guardada.
2. **Dueño bloquea una franja** (US1): crear un bloqueo puntual (ej. mañana de
   14:00–16:00). Esperado: esos slots dejan de aparecer en `GET /api/availability`.
3. **Cliente reserva** (US2): en `/`, elegir un día/horario disponible, completar
   nombre y teléfono, confirmar. Esperado: se recibe un `bookingCode` de 8
   caracteres; ese slot deja de listarse como disponible.
4. **Reserva concurrente rechazada** (US2, SC-002): repetir el paso 3 apuntando al
   mismo `slotStart` con dos requests simultáneos (`curl` en paralelo o dos pestañas
   rápidas). Esperado: solo uno recibe `201`, el otro recibe `409
   SLOT_ALREADY_BOOKED`.
5. **Cliente consulta y cancela** (US3): en `/mi-turno`, ingresar el `bookingCode`
   del paso 3. Esperado: ver día/hora/estado. Si el turno está a más de 2h, cancelar
   y verificar que el slot vuelve a aparecer en `GET /api/availability`.
6. **Cancelación fuera de ventana rechazada** (US3, SC-007): reservar un slot que
   arranca en menos de 2h y luego intentar cancelarlo con el código. Esperado: `403
   CANCELLATION_WINDOW_CLOSED`.
7. **Dueño gestiona agenda** (US4): en `/agenda`, ver los turnos del día, marcar uno
   como cumplido, otro como ausente, cancelar un tercero. Esperado: cada cambio se
   refleja en `GET /api/admin/agenda?date=...` y, para la cancelación, el slot vuelve
   a estar disponible.
8. **Bloqueo cancela reservas existentes** (US1, FR-024, SC-006): con una reserva
   activa dentro de una franja, crear un bloqueo que la superponga. Esperado: la
   respuesta de `POST /api/admin/blocks` lista el código cancelado en
   `cancelledBookings`, y `GET /api/bookings/:code` muestra `status: "cancelled"`.

## Tests automatizados

```bash
# Backend: unitarios (dominio, sin DB) + integración (rutas, requiere Postgres de Docker corriendo)
cd backend && npm test

# End-to-end: flujo completo (dueño configura → cliente reserva → consulta → cancela → slot libre)
# requiere Postgres, backend y frontend corriendo (o levantados por el propio test runner)
cd ../e2e && npm test
```
