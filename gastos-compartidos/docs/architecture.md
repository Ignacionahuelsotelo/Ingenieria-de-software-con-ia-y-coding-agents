# Arquitectura — Gastos Compartidos

**Autor:** @architect · **Fecha:** 2026-08-20 · **Base:** `docs/prd.md`

> Este documento fija el CÓMO. Lo que está acá no se rediscute en
> implementación. Si algo no se puede construir así, se anota en `.team/log.md`
> con `→ @architect` y se para.

---

## 1. Qué existe y no se toca

| Archivo | Qué da | Regla |
|---|---|---|
| `backend/src/domain/balances.js` | `splitCents`, `computeBalances`, `simplifyDebts` | **No se modifica.** Se importa. |
| `backend/src/store.js` | estado en memoria + semilla | Se **extiende** (H-002, H-004). No se reescribe ni se cambian las semillas. |
| `backend/src/tools/*` | asistente con tool use | **No se modifica.** Ninguna historia lo toca. |
| `backend/src/routes/ask.js` | `POST /api/ask` | **No se modifica.** |
| `backend/src/routes/health.js` | `GET /api/health` | **No se modifica.** |
| `backend/src/app.js` | app Express | Se **extiende** (se montan routers nuevos). |

`cd backend && npm test` está en 24 tests verdes. **Ninguna historia puede bajar
ese número.** Cada historia suma tests, no reemplaza.

---

## 2. Módulos

| Módulo | Responsabilidad (una línea) | Historia que lo crea |
|---|---|---|
| `backend/src/app.js` | Arma la app Express, monta `express.json()`, los routers y los estáticos del frontend. | existe (se extiende) |
| `backend/src/store.js` | Único dueño del estado en memoria: personas, gastos y generación de ids. | existe (se extiende) |
| `backend/src/domain/balances.js` | Matemática pura del dinero: reparto, balances, simplificación. | existe |
| `backend/src/domain/validation.js` | Validadores puros de entrada (nombre, gasto); devuelven ok/código/mensaje, no lanzan. | H-002 |
| `backend/src/routes/group.js` | `GET /api/group`: nombre del grupo y sus personas. | H-001 |
| `backend/src/routes/expenses.js` | CRUD parcial de gastos: listar, crear, borrar. | H-001 |
| `backend/src/routes/people.js` | Alta y baja de personas. | H-002 |
| `backend/src/routes/balances.js` | `GET /api/balances`: balances + transferencias + flag de "están a mano". | H-005 |
| `frontend/index.html` | Estructura de la pantalla única. | H-006 |
| `frontend/app.js` | Fetch a la API, render y manejo de formularios. | H-006 |
| `frontend/styles.css` | Estilos mobile-first. | H-006 |

**No hay más módulos.** No se agregan carpetas `services/`, `controllers/`,
`middlewares/` ni `utils/`.

---

## 3. Modelo de datos (en memoria)

Todo vive dentro de `backend/src/store.js`. Nada se persiste.

```js
// Map<string, Person>
Person = {
  id: string,    // "ana" | "p4" — único, estable, nunca se reutiliza
  name: string,  // nombre visible, puede repetirse entre personas
}

// Map<string, Expense>
Expense = {
  id: string,            // "e1" | "e7"
  description: string,   // no vacío, ya trimmeado
  amountCents: number,   // ENTERO > 0, en centavos
  paidBy: string,        // Person.id existente
  splitBetween: string[],// array no vacío de Person.id existentes
}

// objeto plano, no Map
Group = { id: "g1", name: "Viaje a Bariloche" }
```

Estructuras derivadas (las produce `domain/balances.js`, no se guardan):

```js
Balance  = { personId: string, name: string, balanceCents: number } // + = le deben
Transfer = { fromPersonId, from, toPersonId, to, amountCents }
```

**Contadores de id:** `nextExpenseId` (arranca en 4 → `e4`) y `nextPersonId`
(arranca en 1 → `p1`). Monótonos. `_reset()` (solo tests) los devuelve a su
valor inicial y restaura las semillas exactas.

**Semilla (no cambia nunca):** 3 personas (`ana`, `beto`, `caro`) y 3 gastos
(`e1` Cabaña 120000, `e2` Nafta 45000, `e3` Asado 33000).

---

## 4. Endpoints

Prefijo `/api`. Todos responden JSON salvo los `204`.

| Método | Ruta | Qué hace | Historia |
|---|---|---|---|
| `GET` | `/api/health` | Ping + si el asistente está configurado. | existe |
| `POST` | `/api/ask` | Pregunta en lenguaje natural al asistente. | existe |
| `GET` | `/api/group` | Devuelve el grupo activo con su lista de personas. | H-001 |
| `GET` | `/api/expenses` | Lista todos los gastos del grupo. | H-001 |
| `POST` | `/api/people` | Agrega una persona y devuelve su id. | H-002 |
| `DELETE` | `/api/people/:id` | Saca a una persona si no participa de ningún gasto. | H-004 |
| `POST` | `/api/expenses` | Carga un gasto. | H-003 |
| `DELETE` | `/api/expenses/:id` | Borra un gasto. | H-004 |
| `GET` | `/api/balances` | Balances de todos + transferencias mínimas + `settled`. | H-005 |
| `GET` | `/` | Sirve `frontend/index.html` (estático). | H-006 |

**No hay más endpoints.** No hay `PUT`, no hay `PATCH`, no hay
`GET /api/people` (las personas vienen dentro de `GET /api/group`), no hay
`GET /api/expenses/:id`, no hay `POST /api/groups`.

### Forma del error (única, para todas las rutas nuevas)

```json
{ "error": "mensaje en castellano, explicativo", "code": "CODIGO_ESTABLE" }
```

Tabla de códigos cerrada:

| `code` | HTTP | Cuándo |
|---|---|---|
| `INVALID_NAME` | 400 | nombre ausente, no string, o vacío al trimmear |
| `INVALID_DESCRIPTION` | 400 | descripción ausente, no string, o vacía al trimmear |
| `INVALID_AMOUNT` | 400 | monto no entero, ≤ 0, o ausente |
| `INVALID_SPLIT` | 400 | `splitBetween` no es array, está vacío, o tiene elementos no string |
| `UNKNOWN_PERSON` | 400 | `paidBy` o algún id de `splitBetween` no existe |
| `EXPENSE_NOT_FOUND` | 404 | se borra un gasto que no existe |
| `PERSON_NOT_FOUND` | 404 | se borra una persona que no existe |
| `PERSON_IN_USE` | 409 | se borra una persona que participa de algún gasto |

`ask.js` y `health.js` mantienen su forma actual (`{ error }` sin `code`). No se
tocan por consistencia estética.

---

## 5. Decisiones

Cada una con su porqué y qué se descartó. **Nadie las rediscute.**

**D-1 · Un solo grupo, hardcodeado en `store.group`.**
El PRD lo fija como no-objetivo. `GET /api/group` no recibe id.
*Descartado:* `/api/groups/:id` "por si acaso" — obliga a parametrizar cada ruta
y a inventar un 404 de grupo que nunca puede pasar.

**D-2 · Dinero: enteros en centavos, de punta a punta del backend.**
Ninguna respuesta de la API expone decimales. La conversión a pesos ocurre
**solo** en `frontend/app.js`.
*Descartado:* mandar `amount` en pesos y convertir en el server — cada conversión
es una oportunidad de perder un centavo.

**D-3 · El frontend manda y recibe centavos; convierte en el borde.**
`frontend/app.js` tiene exactamente dos funciones de conversión:
`pesosToCents(str)` y `formatCents(n)`. Nada más convierte.
*Descartado:* un endpoint "amigable" que acepte pesos — duplica validación.

**D-4 · `store.js` es el único que muta el estado.** Los routers leen el body,
validan y llaman al store. No hay `Map` fuera del store, no hay estado en los
routers.
*Descartado:* un repositorio/servicio intermedio — capa vacía para un `Map`.

**D-5 · Validación en `domain/validation.js`, funciones puras que devuelven
`{ ok, code, message }` en vez de lanzar.** Los routers traducen eso a HTTP con
una sola línea.
*Descartado:* validar con `throw` + middleware de errores (más indirección para
el mismo resultado) y agregar `zod`/`express-validator` (dependencia nueva, no
autorizada).

**D-6 · `tools/handlers.js` NO se refactoriza para usar `validation.js`.**
Funciona, tiene tests, y sus mensajes de error los consume el modelo. Duplicar
cuatro `if` es más barato que romper el asistente.
*Descartado:* unificar validación entre tools y routes.

**D-7 · Ids: personas nuevas `p1, p2, …`; gastos nuevos `e4, e5, …`.**
Contadores monótonos, sin reutilización. Los ids semilla (`ana`, `beto`, `caro`)
se respetan tal cual.
*Descartado:* `crypto.randomUUID()` (ilegible en tests y en curl) y slug del
nombre (colisiona con dos Juanes, que el PRD exige permitir).

**D-8 · Borrar responde `204 No Content`, sin body.**
El cliente vuelve a pedir el estado. Simple y sin ambigüedad.
*Descartado:* devolver el recurso borrado o el estado completo — acopla el
borrado a la forma de la lectura.

**D-9 · `GET /api/balances` devuelve balances, transferencias y `settled` en una
sola respuesta.** El frontend pinta las tres cosas juntas; separarlo son dos
round-trips que pueden ver estados distintos.
*Descartado:* `GET /api/balances` + `GET /api/settlement` separados.

**D-10 · No se puede borrar a una persona que aparece en cualquier gasto (como
`paidBy` o dentro de `splitBetween`): `409 PERSON_IN_USE`.**
Es el caso borde 4 del PRD. La app nunca borra plata en silencio.
*Descartado:* borrado en cascada de sus gastos, y "soft delete" con flag
`active` — ambos hacen que los balances dejen de sumar cero o mienten.

**D-11 · Express sirve el frontend como estático desde la misma app.**
Un solo origen, sin CORS, sin segundo servidor: `node src/server.js` levanta
todo. El frontend llama a rutas relativas (`fetch("/api/group")`).
*Descartado:* `Live Server` aparte + `cors` (dependencia nueva) y `file://`
(fetch bloqueado por el navegador).

**D-12 · Frontend sin framework, sin build, sin bundler; render por reemplazo
completo.** Después de cada mutación se hace un `loadAll()` que re-pide
`/api/group`, `/api/expenses` y `/api/balances` y repinta todo.
*Descartado:* actualización incremental del DOM y estado local espejado — el
estado vive en el server, duplicarlo es la fuente clásica de bugs.

**D-13 · Dependencias congeladas: `express` y `@anthropic-ai/sdk` en prod,
`vitest` y `supertest` en dev.** Ninguna historia agrega una dependencia.
*Descartado:* todo lo demás.

**D-14 · Un archivo de test por historia**, en `backend/tests/`, con el nombre
que fija cada spec. El dev entrega el archivo con los casos listados; @qa lo
amplía después.
*Descartado:* un test gigante por módulo.

---

## 6. Orden de construcción

```
H-001  (GET /api/group, GET /api/expenses)      ← sin dependencias, arranca acá
  └→ H-002  (POST /api/people, validation.js)
      └→ H-003  (POST /api/expenses)
          └→ H-004  (DELETE gasto y persona)
H-005  (GET /api/balances)                       ← solo depende de H-001
  └→ H-006  (frontend)                           ← depende de H-001..H-005
```

H-005 puede hacerse en paralelo con H-002/H-003/H-004: no comparte archivos con
ellas salvo `app.js`.
