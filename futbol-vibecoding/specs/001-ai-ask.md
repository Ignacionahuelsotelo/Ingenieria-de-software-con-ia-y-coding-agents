# Spec 001 — `POST /api/ai/ask`

**Estado:** pendiente de implementación
**Alcance:** solo backend. No tocar `frontend/` — ya está construido y consume este endpoint.

---

## 1. Problema

El frontend tiene la UI de chat lista (`AssistantPage`, `frontend/src/services/aiService.ts`)
pegándole a una ruta que no existe en el backend. Hay que implementarla.

El usuario escribe una pregunta en lenguaje natural sobre fútbol
("¿quién ganó el clásico?", "¿cómo va la tabla de la Premier?") y recibe una
respuesta en lenguaje natural, no datos crudos. Los datos salen del MCP de SportDB.

---

## 2. Contrato

Fijo. Lo define el frontend y **no se puede cambiar**.

### Request

```
POST /api/ai/ask
Content-Type: application/json
```

```json
{
  "question": "¿Quién ganó el último River - Boca?",
  "history": [
    { "id": "m1", "role": "user",      "content": "hola",      "createdAt": 1786000000000 },
    { "id": "m2", "role": "assistant", "content": "¡Hola!",    "createdAt": 1786000001000 }
  ]
}
```

- `question` — string, requerido, no vacío tras `trim()`
- `history` — array, opcional (puede venir ausente o `[]`). Cada elemento:
  `{ id: string, role: "user" | "assistant", content: string, createdAt: number }`

### Response 200

```json
{ "answer": "River le ganó 2-1 a Boca el 15 de marzo en el Monumental." }
```

Exactamente esa forma. Una sola clave `answer`, string. Nada más.

### Errores

| Código | Cuándo | Body |
|---|---|---|
| 400 | `question` ausente, no string, o vacío tras trim | `{ "error": "Missing required field: question" }` |
| 400 | `history` presente pero no es array | `{ "error": "Field history must be an array" }` |
| 502 | El LLM o el MCP fallaron | `{ "error": "Failed to get an answer from the assistant" }` |
| 503 | Falta `ANTHROPIC_API_KEY` en el entorno | `{ "error": "Assistant is not configured" }` |

Todo error se loguea con `console.error(err)` antes de responder, igual que en
`backend/src/routes/standings.js`.

---

## 3. Archivos a crear o modificar

| Archivo | Acción |
|---|---|
| `backend/src/routes/ai.js` | **Crear.** Exporta `aiRouter` |
| `backend/src/services/assistant.js` | **Crear.** Toda la lógica del LLM vive acá |
| `backend/tests/ai.test.js` | **Crear.** Obligatorio (ver §6) |
| `backend/src/app.js` | **Modificar.** Montar `app.use("/api/ai", aiRouter)` |
| `backend/src/openapi.js` | **Modificar.** Documentar el endpoint |
| `backend/.env.example` | **Modificar.** Agregar `ANTHROPIC_API_KEY=` |
| `backend/package.json` | **Modificar.** Agregar dependencia `@anthropic-ai/sdk` |

**No crear ningún otro archivo. No tocar `frontend/`.**

---

## 4. Implementación

### `backend/src/services/assistant.js`

Exporta una sola función:

```js
export async function ask(question, history = []) { /* devuelve string */ }
```

Pasos:

1. Si no hay `process.env.ANTHROPIC_API_KEY`, tirar un error con
   `err.code = "NOT_CONFIGURED"` para que la ruta pueda responder 503.

2. Instanciar el cliente:

   ```js
   import Anthropic from "@anthropic-ai/sdk";
   const client = new Anthropic();  // lee ANTHROPIC_API_KEY del entorno
   ```

3. Mapear `history` al formato de mensajes de la API. De cada `ChatMessage`
   solo se usan `role` y `content`; `id` y `createdAt` se descartan.
   Descartar también los mensajes con `content` vacío.

4. Armar la llamada con el **MCP connector**, apuntando al mismo servidor
   SportDB que usa el resto del backend:

   ```js
   const response = await client.beta.messages.create({
     model: "claude-opus-5",
     max_tokens: 2048,
     betas: ["mcp-client-2025-11-20"],
     system: SYSTEM_PROMPT,
     mcp_servers: [{
       type: "url",
       url: process.env.SPORTDB_URL,
       name: "sportdb"
     }],
     tools: [{ type: "mcp_toolset", mcp_server_name: "sportdb" }],
     messages: [...historyMapeado, { role: "user", content: question }]
   });
   ```

5. Extraer el texto: concatenar el `.text` de todos los bloques de
   `response.content` con `type === "text"`, unidos por `\n`. Si no hay
   ningún bloque de texto, devolver un mensaje de fallback:
   `"No pude encontrar una respuesta a esa pregunta."`

### `SYSTEM_PROMPT`

Constante en el mismo archivo. Contenido:

```
Sos un asistente de resultados de fútbol. Respondés preguntas usando
exclusivamente los datos que obtenés de las herramientas de SportDB.

Reglas:
- Respondé en español rioplatense, en 1-3 oraciones. Sin markdown, sin listas.
- Si los datos no alcanzan para responder, decilo claramente. No inventes
  resultados, fechas ni nombres.
- Si la pregunta no es sobre fútbol, decí que solo respondés sobre fútbol.
- Incluí siempre el dato concreto (marcador, fecha, posición) cuando exista.
```

### `backend/src/routes/ai.js`

Sigue el patrón exacto de `backend/src/routes/standings.js`:

```js
import { Router } from "express";
import { ask } from "../services/assistant.js";

export const aiRouter = Router();

aiRouter.post("/ask", async (req, res) => {
  // validaciones → 400
  // try { const answer = await ask(...); res.json({ answer }); }
  // catch → 503 si err.code === "NOT_CONFIGURED", si no 502
});
```

### `backend/src/app.js`

Agregar el import y montar **antes** de las líneas de `/api-docs`:

```js
app.use("/api/ai", aiRouter);
```

⚠️ El body de la request es JSON, así que hace falta `express.json()`.
Verificar si ya está en `app.js`; si no está, agregarlo antes de las rutas.

---

## 5. Riesgo conocido — autenticación del MCP

`.mcp.json` autentica SportDB con un header `X-API-Key`. El MCP connector de
Anthropic solo soporta `authorization_token`, que se envía como
`Authorization: Bearer <token>`.

**Antes de dar por terminada la implementación, verificar si SportDB acepta la
key como Bearer.** Si no la acepta:

- Documentar el problema en un comentario al tope de `services/assistant.js`
- Implementar el fallback: en vez del MCP connector, definir tools propias
  que envuelvan las funciones que ya existen en
  `backend/src/services/sportdb.js` (`getStandings`, `getMatches`, etc.),
  y correr el loop de tool use a mano
- El contrato del endpoint (§2) no cambia en ninguno de los dos casos

---

## 6. Tests — `backend/tests/ai.test.js`

Obligatorio: el hook `.claude/hooks/backend-tests.sh` bloquea si falta el test
de alguna ruta o si `npm test` falla.

Vitest, mismo estilo que `backend/tests/standings.test.js`. **Mockear
`../src/services/assistant.js`** — los tests no pueden llamar a la API de
Anthropic ni al MCP.

Casos mínimos:

1. `POST /api/ai/ask` con `{ question: "..." }` válida → 200 y body `{ answer: "..." }`
2. Body sin `question` → 400
3. `question: "   "` (solo espacios) → 400
4. `history` que no es un array → 400
5. El service tira un error genérico → 502
6. El service tira un error con `code: "NOT_CONFIGURED"` → 503
7. `history` válido → el service lo recibe con los mensajes en orden

---

## 7. Criterios de aceptación

- [ ] `cd backend && npm test` pasa, incluidos los tests nuevos
- [ ] `POST /api/ai/ask` responde 200 con `{ answer: string }` cuando la key está configurada
- [ ] Los 4 casos de error de §2 devuelven el código y el body exactos
- [ ] `/api-docs` muestra el endpoint documentado
- [ ] `frontend/` no tiene ni un cambio
- [ ] No se crearon archivos fuera de la lista de §3
