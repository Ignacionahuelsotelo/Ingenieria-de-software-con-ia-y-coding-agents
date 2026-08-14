# Turnos — Barbería

Sistema de turnos para una barbería de un solo prestador. El dueño configura su horario de
atención y la duración de los turnos; los clientes reservan un turno disponible, ven los suyos,
y pueden cancelarlos.

Ver la especificación completa en [`specs/001-sistema-turnos-barberia/`](specs/001-sistema-turnos-barberia/).

## Requisitos

- Node.js (con soporte ESM). No requiere base de datos ni Docker: el estado vive en memoria del
  proceso.

## Setup

```bash
npm install
```

## Levantar el servidor

```bash
npm start
```

Sirve la API en `http://localhost:3000/api/*` y el frontend estático
(`frontend/index.html` para clientes, `frontend/admin.html` para el dueño) en la raíz.

Se puede cambiar el puerto con la variable de entorno `PORT`.

## Correr los tests

```bash
npm test
```

Corre los tests de dominio (`backend/tests/unit/`) y de la API HTTP
(`backend/tests/integration/`) con Vitest.
