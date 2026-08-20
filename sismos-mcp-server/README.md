# sismos-mcp-server

Servidor MCP de monitoreo sísmico **y su propio cliente en lenguaje natural**,
donde un modelo abierto decide qué herramienta activar.

Sin Claude, sin Claude Code, sin API key de nadie: el protocolo MCP de un lado
y `gpt-oss` del otro.

## Arquitectura

```
  vos escribís en castellano
          │
          ▼
  ┌───────────────────┐
  │  cliente (CLI)    │   gpt-oss ELIGE la tool  ← function calling
  └─────────┬─────────┘
            │ protocolo MCP (Streamable HTTP)
            ▼
  ┌───────────────────┐
  │  servidor MCP     │   10 tools · 3 resources · 3 prompts
  └─────────┬─────────┘
            │
      ┌─────┼─────────────┐
      ▼     ▼             ▼
   API    SQLite      gpt-oss
   USGS   local       (resumen)
```

El modelo abierto aparece **dos veces**: en el cliente eligiendo tools, y
dentro del servidor resumiendo datos. Mismo modelo, dos roles.

## Arrancar

Necesitás Node 22+ y Ollama con un modelo abierto:

```bash
ollama serve                        # en una terminal
ollama pull gpt-oss:20b-cloud       # una sola vez
```

Después:

```bash
npm install
npm run dev          # terminal 1 — servidor MCP (logs en la terminal)
npm run web          # terminal 2 — visualizador  → http://localhost:8788
```

Para la versión en terminal, en vez de `npm run web`:

```bash
npm run ask          # cliente interactivo en la consola
```

## El visualizador

`npm run web` abre un frontend didáctico de tres columnas:

```
┌──────────────┬──────────────┬──────────────┐
│  CLIENTE     │ PROTOCOLO    │ SERVIDOR MCP │
│              │    MCP       │              │
│ el modelo    │ initialize   │ sismo_buscar │
│ razona y     │ tools/list   │  [API·USGS]  │
│ elige tool   │ tools/call → │  GET usgs... │
│              │ ← tool_result│  ✓ 598ms     │
└──────────────┴──────────────┴──────────────┘
```

Escribís la pregunta arriba y ves las dos mitades trabajando en vivo. Son
**dos streams SSE de dos procesos distintos**: el del cliente sale del backend
web, el del servidor sale de `GET :8787/events`. El split-screen es fiel a la
arquitectura, no una animación.

El selector de arriba a la derecha cambia el modelo sin recargar — es la mejor
demo del proyecto: mismo servidor, distinto modelo, comportamiento distinto.

O una consulta suelta:

```bash
npm run ask -- "hubo sismos fuertes en Chile este mes?"
```

## Cambiar de modelo

El cliente es agnóstico: cualquier endpoint OpenAI-compatible con function
calling sirve.

```bash
npm run ask:gptoss     # gpt-oss:20b-cloud   (Ollama, free tier)
npm run ask:minimax    # minimax-m3:cloud    (Ollama, free tier)
npm run ask:groq       # openai/gpt-oss-120b (Groq, necesita GROQ key)
```

Probados sobre la misma consulta:

| Modelo | Comportamiento observado |
|---|---|
| `gpt-oss:20b-cloud` | Va directo a `sismo_buscar`. Rápido, respuestas cortas |
| `minimax-m3:cloud` | Confirma el id de región primero. Más pasos, respuestas con más detalle |

Cambiar de modelo no toca una línea de código: solo `LLM_MODEL`.

## Qué expone el servidor

### Tools (10)

| Tool | Fuente | Escribe |
|---|---|---|
| `sismo_listar_regiones` | config | no |
| `sismo_buscar` | API USGS | no |
| `sismo_detalle` | API USGS | no |
| `watchlist_listar` | SQLite | no |
| `watchlist_agregar` | SQLite | **sí** |
| `watchlist_quitar` | SQLite | **sí** |
| `nota_agregar` | SQLite | **sí** |
| `nota_listar` | SQLite | no |
| `sismo_explicar` | API + LLM | no |
| `informe_watchlist` | SQLite + API + LLM | no |

### Resources (3)

`sismos://watchlist` · `sismos://regiones` · `sismos://region/{id}`

### Prompts (3)

`informe-diario` · `analizar-region` · `comparar-regiones`

## Configuración

| Variable | Default |
|---|---|
| `PORT` | 8787 |
| `DB_PATH` | ./sismos.db |
| `LLM_BASE_URL` | http://localhost:11434/v1 |
| `LLM_MODEL` | gpt-oss:20b-cloud |
| `LLM_API_KEY` | ollama |
| `MCP_URL` | http://localhost:8787/mcp |

Cambiar a Groq:

```bash
LLM_BASE_URL=https://api.groq.com/openai/v1 \
LLM_MODEL=openai/gpt-oss-120b \
LLM_API_KEY=gsk_... \
npm run ask
```

## También funciona con Claude Code

El servidor es un MCP estándar, así que cualquier cliente puede consumirlo:

```bash
claude mcp add --transport http --scope project sismos http://localhost:8787/mcp
```

Sirve para el contraste: el mismo servidor, dos clientes, dos modelos de
empresas distintas, resultados equivalentes.

## Datos

[USGS Earthquake Catalog](https://earthquake.usgs.gov/fdsnws/event/1/) — API
pública, sin key ni registro.
