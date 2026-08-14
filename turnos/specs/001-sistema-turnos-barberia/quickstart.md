# Quickstart: Sistema de Turnos para Barbería

**Feature**: [spec.md](./spec.md) | **Contract**: [contracts/api.md](./contracts/api.md)

## Prerrequisitos

- Node.js instalado (con soporte ESM).
- Repositorio clonado; no requiere Docker, base de datos, ni servicios externos
  (Principio III).

## Setup

```bash
npm install
```

## Levantar el servidor

```bash
npm start
```

El servidor sirve la API en `http://localhost:3000/api/*` y el frontend estático
(`frontend/index.html`, `frontend/admin.html`) en la raíz.

## Correr los tests

```bash
npm test
```

Corre los tests de dominio (`tests/unit/`) y de la API HTTP (`tests/integration/`) con Vitest.

## Escenario de validación end-to-end (manual o vía tests de integración)

1. **Configurar horario** (dueño) — `PUT /api/schedule` con un horario de lunes a viernes,
   09:00–18:00, turnos de 30 minutos. Verificar `200 OK`.
2. **Ver disponibilidad** (cliente) — `GET /api/slots?from=<próximo lunes>&to=<próximo
   viernes>`. Verificar que aparecen slots de 30 minutos dentro de esa franja.
3. **Reservar un turno** (cliente) — `POST /api/bookings` con `startLocal` igual al primer slot
   devuelto en el paso 2, más `customerName`/`customerContact`. Verificar `201 Created`.
4. **Verificar que el slot desaparece de disponibilidad** — repetir `GET /api/slots` del paso 2
   y confirmar que el turno reservado ya no aparece.
5. **Reservar el mismo turno dos veces (concurrencia)** — disparar dos `POST /api/bookings` con
   el mismo `startLocal` casi simultáneamente. Verificar que exactamente uno devuelve `201` y el
   otro `409 SLOT_ALREADY_BOOKED` (valida FR-007 / SC-002).
6. **Ver mis turnos** (cliente) — `GET /api/bookings?customerContact=<mismo contacto del paso
   3>`. Verificar que aparece la reserva creada.
7. **Cancelar el turno** (cliente) — `DELETE /api/bookings/:id` con el `id` del paso 3 y el
   mismo `customerContact`. Verificar `200 OK` y `status: "cancelled"`.
8. **Verificar que el slot vuelve a estar disponible** — repetir `GET /api/slots` del paso 2 y
   confirmar que el turno cancelado vuelve a aparecer (valida SC-005).
9. **Ver todas las reservas** (dueño) — `GET /api/admin/bookings`. Verificar que aparece la
   reserva del paso 3 con `status: "cancelled"` (valida FR-014 / SC-006).

## Resultado esperado

Todos los pasos anteriores completan sin errores inesperados, y los pasos 5 y 8 en particular
demuestran las garantías de exclusión mutua y liberación de turnos descritas en el spec
(SC-002, SC-005).
