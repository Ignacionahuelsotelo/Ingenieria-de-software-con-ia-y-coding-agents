# Research: Sistema de Turnos para Barbería

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

Todos los campos de Technical Context fueron provistos explícitamente por el usuario
(Node + Express ESM, sin base de datos / `Map` en memoria, Vitest, frontend HTML + JS
vanilla). No quedan marcadores `NEEDS CLARIFICATION`. Este documento registra las decisiones
de diseño derivadas de esos requisitos y de la constitución del proyecto.

## Decisión 1: Representación y generación de la grilla de turnos

- **Decision**: Los turnos ("slots") no se generan ni persisten anticipadamente como filas en
  el `Map`. En su lugar, el dominio calcula la grilla de turnos disponibles **on-demand** a
  partir de: (a) la configuración de `schedule` (franjas horarias por día + duración), y (b) el
  `Map` de `bookings` (reservas activas), restando los slots ya reservados y los que ya
  pasaron. Solo las `bookings` (reservas) se persisten como registros individuales en el `Map`.
- **Rationale**: Evita el problema de "regenerar/parchar" miles de filas de slots cada vez que
  el dueño cambia el horario, y respeta directamente la Acceptance Scenario 2 de User Story 1
  (los turnos ya reservados conservan su horario/duración originales aunque cambie la
  configuración, porque la reserva guarda su propio `start`/`end` en UTC, independiente del
  `schedule` vigente). Es también la opción más simple dado el Principio III (sin base de
  datos): no hay necesidad de un job de generación ni de sincronización de estado derivado.
- **Alternatives considered**: Pre-generar y almacenar cada slot como entidad persistente en el
  `Map` al configurar el horario. Rechazada: requiere invalidar/regenerar slots futuros en cada
  cambio de configuración, duplica información que ya es derivable, y complica la garantía de
  "los turnos ya reservados no cambian" (habría que distinguir slots-reservados de
  slots-libres con reglas de regeneración distintas).

## Decisión 2: Exclusión mutua en reservas concurrentes (FR-007)

- **Decision**: Dado que Node.js ejecuta el código JavaScript en un único hilo (single-threaded
  event loop), la operación de "reservar" se implementa como una función síncrona que: (1)
  vuelve a verificar que el slot solicitado sigue disponible, y (2) si lo está, escribe la
  reserva en el `Map` — todo dentro del mismo tick de ejecución, sin `await` entre la
  verificación y la escritura. Esto garantiza exclusión mutua sin locks explícitos.
- **Rationale**: Cumple FR-007 (no dos reservas activas sobre el mismo slot) sin agregar
  dependencias de locking ni infraestructura externa, alineado con el Principio III y V.
- **Alternatives considered**: Locks/mutex explícitos (librería externa) — rechazado por
  innecesario dado el modelo de concurrencia de Node y por el Principio V (sin dependencias
  nuevas sin justificación). Operación optimista con reintentos — rechazada por complejidad
  innecesaria para el volumen esperado (una sola barbería).

## Decisión 3: Manejo de tiempo (UTC interno, timezone en presentación)

- **Decision**: `schedule` almacena horarios como (día de la semana, hora:minuto local de la
  barbería) más un **timezone de la barbería** configurado una vez (asumido fijo, por ejemplo
  vía variable de entorno o constante de configuración, no editable por el dueño en esta
  versión). Al generar slots concretos (fecha + hora), el dominio los calcula y almacena/compara
  siempre en UTC (`Date` en UTC epoch). La capa `http/serializers.js` convierte a la timezone de
  la barbería únicamente al momento de responder al cliente HTTP.
- **Rationale**: Cumple el Principio II explícitamente. Fijar la timezone de la barbería como
  configuración simple (no por-request) evita ambigüedad: los clientes reservan turnos de
  *esa* barbería física, en el horario local de *esa* barbería, no en la timezone del
  dispositivo del cliente.
- **Alternatives considered**: Almacenar y comparar en hora local directamente — rechazada,
  viola el Principio II y es fuente clásica de bugs en horarios de verano / cambios de
  offset. Usar una librería de fechas (date-fns, luxon, dayjs) — rechazada por el Principio V;
  `Intl.DateTimeFormat` y `Date` nativos de Node son suficientes para el alcance (una sola
  timezone fija, sin recurrencias complejas).

## Decisión 4: Identificación de cliente sin cuenta de usuario

- **Decision**: El `booking` guarda `customerName` y `customerContact` (string: email o
  teléfono, sin validación de formato estricta más allá de "no vacío"). Las consultas de "mis
  turnos" y las cancelaciones reciben `customerContact` como parámetro y filtran/verifican
  contra ese campo exacto (comparación case-insensitive y trim para email).
- **Rationale**: Confirmado explícitamente en `/speckit-clarify` (Sesión 2026-08-13, Q1): sin
  cuenta de usuario ni token de confirmación adicional.
- **Alternatives considered**: N/A — decisión ya cerrada en clarificación previa.

## Decisión 5: Testing strategy con Vitest

- **Decision**: Tests de dominio (`tests/unit/`) prueban `domain/*.js` de forma aislada, sin
  levantar Express ni HTTP, cubriendo generación de slots, reservas, solapamientos,
  cancelaciones y sus validaciones — desarrollados test-first (Principio I, NON-NEGOTIABLE).
  Tests de integración (`tests/integration/`) levantan la app Express (`http/app.js`) en
  memoria y hacen requests HTTP reales (usando `fetch` contra un servidor de test o el adapter
  de request de Vitest/Node) para verificar los contratos de la API definidos en
  `contracts/`.
- **Rationale**: Separar unit/integration refleja directamente la separación dominio/Express
  del Principio IV, y permite que los tests de dominio sean rápidos y no dependan de red.
- **Alternatives considered**: Un único nivel de tests solo-integración (todo vía HTTP) —
  rechazado porque diluye el Principio I al no poder testear reglas de negocio de forma
  aislada y rápida, y dificulta el ciclo Red-Green-Refactor por acoplar cada test a la capa
  HTTP.
