# Reporte de QA

## H-001 — Ver el estado del grupo (personas y gastos)

**Fecha:** 2026-08-20 · **Agente:** @qa
**Bajo prueba:** `backend/src/routes/group.js`, `backend/src/routes/expenses.js`,
`backend/src/app.js`
**Spec de referencia:** `specs/H-001.md`
**Tests agregados por @qa:** `backend/tests/group.qa.test.js` (32 casos)

### Estado de la suite

```
cd backend && npm test
Test Files  6 passed (6)
Tests      65 passed (65)
```

24 previos + 9 del dev + 32 de @qa. El piso irrenunciable (24 verdes) se
mantiene.

### Veredicto

**H-001 pasa a @reviewer. No hay bloqueantes.** Los dos endpoints cumplen
`specs/H-001.md` en forma de respuesta, códigos de estado, orden de inserción,
grupo vacío y enteros de centavos. No se adelantó ningún verbo de H-002/H-003/
H-004/H-005.

Quedan **5 hallazgos abiertos**, ninguno bloqueante: B-1/B-1b son menores y
tocan `app.js` (de @dev); B-2 lo previó el propio spec §4 como historia nueva;
B-3 y B-4 viven en `tools/handlers.js` + `store.js`, fuera de la propiedad de
H-001, y necesitan decisión de @architect.

### Cómo reproducir los hallazgos

Los 5 tests que exponen los bugs están en
`backend/tests/group.qa.test.js`, en el bloque
`describe("hallazgos abiertos (rojos por construcción)")`, marcados con
`it.fails`: el cuerpo afirma el comportamiento **correcto** y hoy falla. Se los
dejó bajo `it.fails` para no dejar la suite roja (ningún hallazgo bloquea la
historia); si @dev arregla un bug, el test grita
`expected to fail but passed` y hay que sacarle el `.fails`.

Para ver las 5 fallas reales:

```
cd backend
sed 's/it\.fails(/it(/' tests/group.qa.test.js > tests/_red.test.js
npx vitest run tests/_red.test.js   # → 5 failed | 27 passed
rm tests/_red.test.js
```

---

## Hallazgos

### [B-1] `GET /api/group` con body JSON inválido responde 400, no 200

**Historia:** H-001
**Severidad:** menor
**Cómo reproducir:**

```
curl -i -X GET localhost:3000/api/group \
  -H "Content-Type: application/json" --data '{roto'
```

**Esperado:** `200` con `{group, people}`. `specs/H-001.md` §1 es explícito:
"Ambas rutas son lecturas sin parámetros y **siempre devuelven 200**", y la
historia "no tiene errores de cliente".
**Obtenido:** `400` con una página HTML de Express.
**Causa:** en `backend/src/app.js`, `app.use(express.json())` está montado
global y antes de los routers, así que parsea el body de **cualquier** método,
GET incluido. Un body roto corta el pipeline antes de llegar a la ruta.
**Sugerencia (decide @dev):** montar los routers de lectura antes de
`express.json()`, o limitar el parser a los métodos que lo necesitan. No lo
toco: `app.js` es código de producción.
**Test que lo expone:** `backend/tests/group.qa.test.js:245`

---

### [B-1b] Ese 400 no respeta la forma de error `{error, code}`

**Historia:** H-001
**Severidad:** menor
**Cómo reproducir:**

```
curl -i -X GET localhost:3000/api/expenses \
  -H "Content-Type: application/json" --data '{roto'
```

**Esperado:** el tablero fija forma única de error para todas las rutas nuevas:
`{ "error": "...", "code": "CODIGO_ESTABLE" }` con `Content-Type` JSON.
**Obtenido:** `text/html; charset=utf-8` con el stack de Express en el body.
Un cliente que hace `res.json()` revienta.
**Nota:** mismo origen que B-1. Si se arregla B-1, esta ruta deja de dar 400,
pero el hueco sigue abierto para las rutas de mutación de H-002/H-003 — vale la
pena que @architect defina un middleware de error antes de esas historias.
**Test que lo expone:** `backend/tests/group.qa.test.js:256`

---

### [B-2] La respuesta expone los objetos internos del store (mutación demostrada)

**Historia:** H-001
**Severidad:** menor (el spec ya lo previó)
**Cómo reproducir:**

```js
const e1 = store.listExpenses()[0];
e1.splitBetween.push("fantasma");
e1.amountCents = 999999;
// GET /api/expenses ahora devuelve el gasto contaminado
// store._reset() NO lo repara: solo borra los gastos e4+
```

**Esperado:** `GET /api/expenses` devuelve siempre
`splitBetween: ["ana","beto","caro"]` y `amountCents: 120000` para `e1`.
**Obtenido:** `["ana","beto","caro","fantasma"]` y `999999`. `listPeople()`,
`listExpenses()` y `store.group` devuelven referencias vivas, y
`store.addExpense` guarda el array `splitBetween` que le pasa el caller sin
copiarlo.
**Estado:** `specs/H-001.md` §4 lo anticipa y fija el Plan B: "Si @qa demuestra
una mutación, entra como historia nueva". Queda demostrado → **historia nueva
para @architect**, no arreglo dentro de H-001. Segundo efecto: `store._reset()`
no restaura semillas mutadas, así que un test que mute contamina a los que
siguen dentro del mismo archivo.
**Test que lo expone:** `backend/tests/group.qa.test.js:266`

---

### [B-3] `GET /api/expenses` puede devolver un gasto sin `description`

**Historia:** H-001 (origen en `tools/handlers.js`)
**Severidad:** importante
**Cómo reproducir:** por HTTP, vía `POST /api/ask` pidiéndole al asistente que
cargue un gasto sin descripción. Directo:

```js
executeTool("add_expense", { amountCents: 500, paidBy: "ana", splitBetween: ["ana"] });
// GET /api/expenses → { id: "e4", amountCents: 500, paidBy: "ana", splitBetween: ["ana"] }
```

**Esperado:** todo gasto de la respuesta tiene las 5 claves del contrato de
§1: `id`, `description`, `amountCents`, `paidBy`, `splitBetween`.
**Obtenido:** un gasto con 4 claves. `handlers.add_expense` valida
`amountCents`, `paidBy` y `splitBetween` pero **no** `description`: entra
`undefined`, el store lo persiste y `JSON.stringify` borra la clave. El
frontend de H-006 va a pintar `undefined` en la lista.
**Propiedad:** `tools/handlers.js` está congelado por D-6 y `store.js` no es de
H-001 → esto **no** lo arregla @dev dentro de esta historia. Es decisión de
@architect: o se valida en `handlers.js` (revisar D-6), o `validateExpense` de
H-003 se aplica también al camino del asistente.
**Test que lo expone:** `backend/tests/group.qa.test.js:283`

---

### [B-4] El asistente acepta `splitBetween` con la misma persona repetida

**Historia:** H-001 (origen en `tools/handlers.js`)
**Severidad:** importante
**Cómo reproducir:**

```js
executeTool("add_expense", { description: "doble", amountCents: 1000,
                             paidBy: "ana", splitBetween: ["ana", "ana"] });
```

**Esperado:** rechazo, o al menos deduplicación. Una persona no puede aparecer
dos veces entre quiénes se divide un gasto.
**Obtenido:** el gasto se guarda con `splitBetween: ["ana","ana"]` y
`GET /api/expenses` lo publica. `computeBalances` le cobra dos veces la parte a
la misma persona: los balances dejan de reflejar la realidad y, según cómo
reparta el resto, es el camino más corto a que la suma de balances no dé 0.
**Propiedad:** igual que B-3, `tools/handlers.js` (D-6) → @architect.
`validateExpense` de H-003 debería incluir la regla "sin duplicados en
splitBetween" para que el POST no nazca con el mismo agujero.
**Test que lo expone:** `backend/tests/group.qa.test.js:294`

---

## Cobertura agregada por @qa (27 casos verdes)

Todo esto pasa hoy y queda blindado contra regresiones:

**`GET /api/group`**

- `group` tiene exactamente `id` y `name`; la respuesta exactamente `group` y `people`.
- `people` respeta el orden de inserción del `Map` (`ana`, `beto`, `caro`).
- Sin ids de persona duplicados.
- `Content-Type: application/json`.
- Dos GET seguidos devuelven lo mismo (lectura pura, sin efectos).
- Ignora query params (`?id=g99`) y sigue en 200 con `g1` — no hay multi-grupo encubierto (D-1).
- **Grupo vacío:** con el store mockeado sin personas devuelve `people: []` y 200. Nunca `null`, nunca 404.

**`GET /api/expenses`**

- La respuesta tiene exactamente la clave `expenses`, y es un array.
- Cada gasto semilla tiene exactamente las 5 claves del contrato.
- Orden de inserción `e1`, `e2`, `e3`.
- Ningún `amountCents` es 0, negativo, float ni string; todos `> 0` e `Number.isInteger`.
- **Barrido recursivo:** ningún número en ningún nivel de la respuesta tiene decimales (D-2).
- Integridad referencial: todo `paidBy` y todo id de `splitBetween` existe en `people`.
- `splitBetween` nunca vacío ni con repetidos (en los datos semilla).
- Sin ids de gasto duplicados.
- **Suma cero:** `computeBalances` sobre los datos semilla suma exactamente `0` centavos.
- El total de gastos es `198000` centavos, entero.
- **Sin gastos:** con el store mockeado devuelve `{ expenses: [] }` y 200, no un error.
- Un gasto agregado por el asistente aparece en el siguiente GET (no hay caché).

**Que no se adelanten verbos de otras historias**

- `POST /api/expenses` → 404 (es H-003).
- `DELETE /api/expenses/e1` → 404 (es H-004).
- `POST /api/group` → 404.
- `POST /api/people` → 404 (es H-002).
- `GET /api/balances` → 404 (es H-005).
- No hay alias `/api/groups` en plural (D-1).
- `GET /api/health` sigue en 200.

### Bordes probados que resultaron correctos (no son hallazgos)

- `GET /api/group/` con barra final → 200 (comportamiento estándar de Express).
- `GET /api/group/xxx` → 404.
- `HEAD /api/group` → 200.
- Query params extra ignorados.
- Los datos semilla no tienen división inexacta: `120000/3`, `45000/3` y
  `33000/2` dan exacto. **El redondeo de centavos con resto todavía no está
  probado contra datos reales** — se prueba en serio en H-003/H-005, cuando se
  puedan cargar montos como `10` entre `3` por API. Anotado para esa ronda.
