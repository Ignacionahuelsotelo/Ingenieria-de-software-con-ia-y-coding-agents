# Tablero del equipo

> Estado vivo del proyecto. Todos los agentes leen esto antes de empezar y
> actualizan SU fila al terminar. No toques filas que no son tuyas.

## Base existente (no la rehagas)

| Qué | Dónde | Estado |
|-----|-------|--------|
| Dominio: balances y simplificación de deudas | `backend/src/domain/balances.js` | funcionando, con tests |
| Store en memoria con datos sembrados | `backend/src/store.js` | funcionando |
| Asistente en lenguaje natural (tool use) | `backend/src/tools/`, `backend/src/routes/ask.js` | funcionando, con tests |

`cd backend && npm test` → 24 tests en verde.

## Historias

| ID | Historia | Estado | Dueño | Entregable |
|----|----------|--------|-------|------------|
| H-001 | Ver el estado del grupo (personas y gastos) | done | — | `specs/H-001.md` · revisada: sin 🔴, `docs/reviews/H-001.md`. 65 tests verdes. Deuda abierta (A1–A6, incluye B-1/B-1b/B-2/B-3/B-4) → **@architect**, decidir antes de H-003/H-004 |
| H-002 | Agregar una persona al grupo | todo | — | `specs/H-002.md` |
| H-003 | Cargar un gasto | todo | — | `specs/H-003.md` |
| H-004 | Borrar gastos y sacar personas | todo | — | `specs/H-004.md` |
| H-005 | Ver balances y cómo saldar | todo | — | `specs/H-005.md` |
| H-006 | Pantalla única para usar todo esto | todo | — | `specs/H-006.md` |

Detalle y criterios de aceptación: `docs/prd.md`. Alcance: **un solo grupo
activo** (multi-grupo es no-objetivo, ver PRD §3).
Diseño y contratos: `docs/architecture.md`. Un spec ejecutable por historia en
`specs/`.

**Orden de construcción:** H-001 → H-002 → H-003 → H-004. H-005 depende solo de
H-001 (se puede hacer en paralelo). H-006 va último: necesita los 6 endpoints.

## Estados

`todo` · `in-progress` · `review` · `blocked` · `done`

## Archivos compartidos

_(el architect lista acá los archivos que varias historias tocan. Se editan
de a una historia por vez — es el punto donde dos devs en paralelo chocan.)_

| Archivo | Lo tocan | Cómo se edita |
|---|---|---|
| `backend/src/app.js` | H-001, H-002, H-005, H-006 | Solo se **agregan** líneas `app.use(...)`. Nunca se reordenan ni se borran las de `health` y `ask`. |
| `backend/src/store.js` | H-002 (alta de persona), H-004 (borrados + `_reset` completo) | H-004 reescribe la inicialización con constantes semilla. No hacerlo antes ni en paralelo con H-002. |
| `backend/src/domain/validation.js` | H-002 (crea, `validateName`), H-003 (agrega `validateExpense`) | Se agregan funciones exportadas. No se modifican las existentes. |
| `backend/src/routes/expenses.js` | H-001 (`GET`), H-003 (`POST`), H-004 (`DELETE`) | Cada historia agrega su verbo. No adelantar verbos de otra historia. |
| `backend/src/routes/people.js` | H-002 (`POST`), H-004 (`DELETE`) | Igual: un verbo por historia. |

## Decisiones tomadas

_(el architect anota acá lo que el resto no puede rediscutir)_

Detalle completo con el porqué de cada una: `docs/architecture.md` §5.

| # | Decisión | Qué se descartó |
|---|---|---|
| D-1 | Un solo grupo, hardcodeado en `store.group`. `GET /api/group` no recibe id. | `/api/groups/:id` |
| D-2 | Dinero en enteros de centavos de punta a punta del backend. Ninguna respuesta expone decimales. | mandar/recibir pesos en la API |
| D-3 | La conversión pesos↔centavos vive **solo** en `frontend/app.js`, en `pesosToCents` y `formatCents`. | endpoints "amigables" en pesos |
| D-4 | `store.js` es el único que muta el estado. No hay `Map` fuera del store. | capa `services/` o repositorio |
| D-5 | Validación en `domain/validation.js`: funciones puras que devuelven `{ok, code, message}`, no lanzan. | `throw` + middleware de errores; `zod`/`express-validator` |
| D-6 | `tools/handlers.js` **no** se refactoriza para compartir validación. Funciona y tiene tests. | unificar validación tools/routes |
| D-7 | Ids: personas nuevas `p1, p2, …`; gastos nuevos `e4, e5, …`. Monótonos, sin reutilización. Semillas (`ana`,`beto`,`caro`) intactas. | UUIDs; slug del nombre |
| D-8 | Los `DELETE` responden `204 No Content`, sin body. | devolver el recurso borrado o el estado completo |
| D-9 | `GET /api/balances` devuelve `{balances, transfers, settled}` en una sola respuesta. | `/api/balances` + `/api/settlement` separados |
| D-10 | No se puede borrar a una persona que aparece en algún gasto: `409 PERSON_IN_USE`. | borrado en cascada; soft delete |
| D-11 | Express sirve el frontend como estático desde la misma app. Un solo origen, sin CORS. | segundo servidor + `cors`; abrir con `file://` |
| D-12 | Frontend sin framework ni build; después de cada mutación se hace `loadAll()` y se repinta todo. | estado local espejado; updates incrementales del DOM |
| D-13 | Dependencias congeladas: `express`, `@anthropic-ai/sdk`, `vitest`, `supertest`. Ninguna historia agrega una. | todo lo demás |
| D-14 | Un archivo de test por historia, con el nombre que fija cada spec. El dev lo entrega, @qa lo amplía. | un test gigante por módulo |

**Forma única del error** en todas las rutas nuevas:
`{ "error": "mensaje en castellano", "code": "CODIGO_ESTABLE" }`.
Códigos: `INVALID_NAME`, `INVALID_DESCRIPTION`, `INVALID_AMOUNT`,
`INVALID_SPLIT`, `UNKNOWN_PERSON` (400) · `EXPENSE_NOT_FOUND`,
`PERSON_NOT_FOUND` (404) · `PERSON_IN_USE` (409).
`ask.js` y `health.js` conservan su forma actual y no se tocan.

**Piso irrenunciable:** `cd backend && npm test` está en 24 tests verdes.
Ninguna historia puede bajar ese número.
