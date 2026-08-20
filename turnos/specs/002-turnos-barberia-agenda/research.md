# Research: Turnos de Barbería con Código de Reserva y Agenda del Dueño

## Contexto de partida

El repo ya contiene una implementación previa (`backend/src/store/memoryStore.js`,
frontend en HTML/JS plano) construida bajo la constitución v1.0.0 ("sin base de datos,
todo en memoria"). La constitución fue enmendada a v2.0.0 (Principio IV: "La Base de
Datos es la Verdad", Principio V: "SQL Plano"), lo cual vuelve esa implementación
incompatible: no hay Postgres, no hay migraciones, y las invariantes de negocio solo
viven en JS. Este feature (002) reemplaza esa base: nueva estructura de backend
(`src/domain`, `src/db`, `src/routes`, `src/config`), Postgres real, y un frontend
React/Vite/TS nuevo. El HTML/JS plano y el memoryStore quedan obsoletos y se eliminan
como parte de la migración (no se mantienen en paralelo, para no tener dos fuentes de
verdad de disponibilidad).

## Decisiones

### Base de datos: PostgreSQL 16 en Docker, puerto 5433

- **Decision**: `docker-compose.yml` en la raíz del repo con servicio `postgres`
  (imagen `postgres:16-alpine`, puerto host `5433:5432`, healthcheck `pg_isready`,
  volumen nombrado `turnos_postgres_data`) y `adminer` (puerto host `8081:8080`).
  Credenciales vía variables de entorno: `POSTGRES_USER=turnos`,
  `POSTGRES_PASSWORD=turnos`, `POSTGRES_DB=turnos`.
- **Rationale**: reutiliza el patrón ya validado en el proyecto hermano
  `futbol-vibecoding` (mismo healthcheck, misma forma de volumen). El remapeo de
  puerto (5433 en vez de 5432) es obligatorio porque el host ya tiene otro Postgres
  ocupando 5432; Adminer se remapea a 8081 porque futbol-vibecoding ya usa 8080 para
  el suyo y ambos proyectos pueden correr en simultáneo en la misma máquina de
  desarrollo.
- **Alternatives considered**: Postgres nativo del host (rechazado: menos
  reproducible, no aislado de otros proyectos); SQLite (rechazado: la constitución
  exige Postgres como única base soportada, Principio "Postgres es la única base de
  datos" en Additional Constraints).

### Migraciones: SQL plano numerado + script bash idempotente

- **Decision**: `db/migrations/0001_*.sql`, `0002_*.sql`, ... aplicadas en orden por
  `db/migrate.sh`, que crea (si no existe) una tabla `schema_migrations(version text
  primary key, applied_at timestamptz default now())` y aplica cada archivo dentro de
  una transacción, solo si su nombre de archivo no está ya registrado.
- **Rationale**: exigido por el Principio V (SQL Plano) de la constitución: sin ORM,
  migraciones `.sql` numeradas, append-only. El patrón (incluyendo el nombre de la
  tabla de control) replica el de `futbol-vibecoding/db/migrate.sh`, que ya está
  probado en un proyecto hermano del mismo autor.
- **Alternatives considered**: `node-pg-migrate` u otra herramienta de migraciones
  (rechazado por el Principio VI: dependencia nueva sin justificación — un script bash
  de ~30 líneas ya resuelve el problema sin dependencia adicional); Prisma/Knex como
  ORM/query builder (rechazado explícitamente por el Principio V).

### Invariante "un turno, una reserva activa" garantizada en Postgres

- **Decision**: `UNIQUE INDEX` parcial sobre `bookings (slot_start)` (o sobre una
  columna que identifique el turno, ver data-model) con condición `WHERE status =
  'active'`. Cualquier intento de insertar una segunda reserva activa sobre el mismo
  slot falla a nivel de base de datos con una violación de constraint, que la capa de
  rutas traduce a un 409 con mensaje accionable (Principio VII).
- **Rationale**: exigido explícitamente por el Principio IV de la constitución y por
  el requerimiento del usuario ("no solo por validación en JS"). Un `UNIQUE INDEX`
  parcial es la forma estándar en Postgres de expresar "unicidad condicional a un
  estado", y evita condiciones de carrera entre dos reservas simultáneas sobre el
  mismo slot (FR-009, SC-002).
- **Alternatives considered**: `SELECT ... FOR UPDATE` + validación en aplicación
  antes de insertar (rechazado como única defensa: sigue siendo vulnerable a
  condiciones de carrera entre procesos/conexiones distintas, que es exactamente lo
  que el Principio IV prohíbe delegar solo a JS); constraint `EXCLUDE` con rango de
  tiempo (evaluado pero innecesario: los turnos son slots discretos y no solapados por
  construcción una vez fijada la duración de turno, así que la igualdad de
  `slot_start` alcanza para identificar el mismo turno).

### Backend: Node 22 + Express ESM, capas domain/db/routes/config

- **Decision**: Estructura de directorios:
  - `backend/src/domain/` — reglas puras (disponibilidad, solapamiento con bloqueos,
    validación de horario, ventana de cancelación de 2h, generación/validación de
    formato de código de reserva). Sin `import` de Express ni del driver `pg`.
  - `backend/src/db/` — pool de conexión (`pg.Pool`) y funciones de acceso a datos
    (una función por consulta/mutación relevante), usando SQL plano parametrizado.
  - `backend/src/routes/` — routers Express que reciben el request, llaman a
    domain + db, y traducen resultados/errores a respuestas HTTP.
  - `backend/src/config/` — lectura y validación de variables de entorno
    (`DATABASE_URL`/`PGHOST`/etc., `OWNER_PASSWORD`, `PORT`, timezone del servidor
    implícita vía `process.env.TZ` si se necesita fijarla).
  - Tests con Vitest: unitarios en `backend/tests/unit/` (dominio, sin DB), de
    integración en `backend/tests/integration/` (rutas, contra el Postgres real de
    Docker). Toda ruta en `routes/` tiene su test de integración correspondiente.
- **Rationale**: exigido literalmente por el usuario y alineado con el Principio II
  (Dominio Puro) — el dominio no puede depender de Express ni de SQL directo, lo cual
  mapea 1:1 a la separación `domain/` vs `db/` vs `routes/`.
- **Alternatives considered**: estructura por feature (`features/bookings/`,
  `features/schedule/`) en vez de por capa técnica (rechazada: el usuario pidió
  explícitamente la estructura por capa `domain/db/routes/config`, y es la que mejor
  refuerza el Principio II al hacer imposible que una ruta importe SQL directamente
  sin pasar por `db/`).

### Frontend: React 19 + Vite + TypeScript + Tailwind CSS 4, sin librería de componentes

- **Decision**: `frontend/` como proyecto Vite standalone (mismo patrón de versiones
  que `futbol-vibecoding/frontend`: `react@^19`, `vite@^6`, `tailwindcss@^4` vía
  `@tailwindcss/vite`, `typescript@^5.7`). Tres vistas/rutas: Reservar (`/`), Mi turno
  (`/mi-turno`), Agenda (`/agenda`, protegida por la clave del dueño). Sin MUI, sin
  shadcn, sin ninguna librería de componentes visuales; solo utilidades sin UI propia
  si hacen falta (p. ej. `clsx` para condicionales de clases, ya usado en el hermano).
- **Rationale**: pedido explícito del usuario. Reutilizar las mismas versiones que
  `futbol-vibecoding` reduce fricción de mantenimiento entre proyectos hermanos del
  mismo autor y ya están validadas en ese repo.
- **Alternatives considered**: Next.js (rechazado: no hay necesidad de SSR/routing de
  servidor, agrega complejidad no pedida — el usuario especificó Vite); librerías de
  componentes como shadcn/ui o MUI (rechazadas explícitamente por el usuario, además
  la dirección visual pedida —agenda de papel, grilla temporal continua— no encaja
  con componentes de card genéricos con radius grande y sombra difusa).

### Dirección visual: agenda de papel del peluquero

- **Decision**: Se usa la skill `frontend-design` durante la fase de implementación
  del frontend para producir un lenguaje visual propio: tipografía con carácter
  (posible mezcla serif/mono para sensación de "escrito a mano"/máquina de escribir
  sin caer en cursiva decorativa), paleta tinta-sobre-papel (negros/grises cálidos
  sobre fondo crema o blanco hueso, sin acentos violeta/índigo), y la grilla de
  horarios como tabla/lista temporal continua (filas de hora, no tarjetas flotantes
  con gap grande). Bloqueos y turnos no disponibles se muestran como anotaciones al
  margen (tachado, nota lateral) en vez de iconografía en círculos de color.
- **Rationale**: restricción explícita del usuario, con lista negativa concreta
  (no gradientes, no glassmorphism, no acento violeta/índigo, no cards con radius
  grande y sombra difusa, no íconos en círculos de color) y una restricción dura de
  layout (grilla temporal continua). Esto se resuelve en la fase de implementación
  (no en este plan) apoyándose en la skill `frontend-design`; este research.md deja
  registrada la restricción para que la fase de tasks/implementación no la pierda.
- **Alternatives considered**: N/A — es una restricción de producto dada por el
  usuario, no una decisión técnica abierta.

### Autenticación del dueño

- **Decision**: Clave simple configurada por variable de entorno (`OWNER_PASSWORD`).
  El dueño la envía en cada request protegida (header, p. ej. `Authorization: Bearer
  <clave>` o un header custom simple); el backend la compara contra la variable de
  entorno. No hay tabla de usuarios ni JWT con expiración compleja — es un shared
  secret, sin sesiones persistidas en base de datos.
- **Rationale**: el spec es explícito ("no hay login ni usuarios registrados... el
  dueño con una clave simple configurada por variable de entorno", FR-015/FR-016).
  Introducir JWT, sesiones en DB, o un sistema de usuarios sería una dependencia y
  complejidad no justificada (Principio VI).
- **Alternatives considered**: sesión de servidor con cookie firmada (evaluado;
  descartado por simplicidad — con un único secreto compartido y sin necesidad de
  "recordar sesión" entre requests más allá de lo que el propio cliente HTTP haga
  reenviando el header, agregar manejo de cookies/sesión es complejidad no pedida por
  el spec); JWT con expiración (mismo motivo).

### Rate limiting de consulta/cancelación por código

- **Decision**: Middleware Express simple de rate limiting en memoria por IP,
  aplicado únicamente a los endpoints de consulta/cancelación por código de reserva
  (no a todo el sistema). Implementación propia minimalista (ventana deslizante o
  fixed-window por IP en un `Map`), sin dependencia externa.
- **Rationale**: FR-028 lo exige explícitamente. Una implementación propia de ~20
  líneas evita agregar una dependencia (`express-rate-limit`) sin justificación
  fuerte (Principio VI); el volumen esperado (un negocio de barrio) no requiere un
  store distribuido (Redis).
- **Alternatives considered**: `express-rate-limit` (evaluado; se prefiere
  implementación propia minimalista para no sumar dependencia, dado que el
  requerimiento es "básico" y no necesita configurabilidad avanzada ni store
  distribuido — si en el futuro se necesita multi-proceso, ahí sí se justificaría).

### Timezone

- **Decision**: Todo instante se persiste y se calcula en UTC (Principio III). La
  timezone local del servidor (`Intl`/`Date` del proceso Node, sin override
  explícito) se usa exclusivamente en el borde: (a) al calcular qué es "hoy" y la
  ventana de 14 días para exponer disponibilidad, y (b) al formatear fecha/hora en
  las respuestas de la API / UI. Ninguna comparación de disponibilidad, solapamiento
  o corte de 2h se hace comparando strings; todas se hacen sobre instantes
  (`timestamptz` en Postgres, `Date`/epoch en JS).
- **Rationale**: FR-026 pide explícitamente timezone del servidor sin configuración
  adicional; el Principio III de la constitución prohíbe comparar por string y exige
  UTC como fuente de verdad interna.
- **Alternatives considered**: guardar timezone configurable por variable de entorno
  (rechazado: el spec fue clarificado explícitamente a "timezone local del servidor,
  sin configuración explícita adicional").

### Testing end-to-end

- **Decision**: Playwright, un solo spec de flujo completo: dueño configura horario
  semanal → cliente ve disponibilidad y reserva → cliente consulta con código →
  cliente cancela → el slot vuelve a aparecer disponible. Corre contra el stack real
  (Postgres de Docker + backend Express + frontend Vite dev/preview).
- **Rationale**: pedido explícito del usuario, y es el único flujo que cruza las tres
  vistas y valida la garantía de negocio central (SC-002/SC-006) de punta a punta.
- **Alternatives considered**: Cypress (rechazado: el usuario pidió Playwright
  explícitamente).

## Unknowns resueltos

No quedan `NEEDS CLARIFICATION` pendientes: el spec ya fue clarificado en su sesión
2026-08-17 (ventana de 14 días, cancelación automática de reservas al bloquear,
corte de cancelación 2h, timezone de servidor, formato de código, rate limiting), y
las decisiones técnicas de esta sección cubren el resto del Technical Context.
