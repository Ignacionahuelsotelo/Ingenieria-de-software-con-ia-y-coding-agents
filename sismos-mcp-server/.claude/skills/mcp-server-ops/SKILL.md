---
name: mcp-server-ops
description: Cómo levantar, conectar y depurar el servidor MCP de sismos, y cómo leer sus logs. Usar cuando el servidor no responde, una tool falla, o hay que interpretar la salida de la terminal.
---

# Operar el servidor MCP

## Levantarlo

```bash
npm run dev     # desarrollo, recarga al guardar
npm start       # requiere npm run build antes
```

Arranca en `http://localhost:8787/mcp`. Chequeo rápido:

```bash
curl -s localhost:8787/health
```

## Conectarlo a Claude Code

```bash
claude mcp add --transport http --scope project sismos http://localhost:8787/mcp
```

`--scope project` escribe `.mcp.json` en el repo, así viaja con el proyecto.
Después de agregarlo hay que **reiniciar la sesión** para que aparezca.

## Leer los logs

Cada llamada imprime un bloque. La etiqueta de la derecha dice **de dónde
salieron los datos** — es lo que hay que mirar primero:

```
┌─ 17:55:16  sismo_buscar                          [API · USGS]
│  → {"region":"chile","magnitudMinima":4}      ← lo que pidió el modelo
│  ↳ GET earthquake.usgs.gov/...                ← la llamada real que salió
│  ✓ 3 sismos en Chile · 807ms                  ← resultado y duración
└─
```

| Etiqueta | Fuente | Latencia esperada |
|---|---|---|
| `[API · USGS]` | API pública | 300–1500ms |
| `[DB · sqlite]` | Base local | < 5ms |
| `[LLM · abierto]` | Modelo abierto | 3–15s |
| `[MCP]` | Config del servidor | < 1ms |

Una línea `✗` en rojo es un error **devuelto al modelo**, no una caída del
servidor: el modelo lo recibe como `tool_result` con `isError` y puede
recuperarse. Que aparezca un `✗` no significa que haya que reiniciar nada.

## Diagnóstico

| Síntoma | Causa probable |
|---|---|
| Claude no ve las tools | Falta reiniciar la sesión después de `claude mcp add` |
| `ECONNREFUSED` en el cliente | El servidor no está levantado |
| Solo fallan `sismo_explicar` / `informe_watchlist` | Ollama caído: `ollama serve` |
| Todo tarda muchísimo | La API del USGS con rangos grandes; bajá `dias` o subí `magnitudMinima` |
| `ExperimentalWarning: SQLite` | Normal. `node:sqlite` es experimental en Node 22 |

## Probarlo sin Claude

```bash
npx @modelcontextprotocol/inspector
```

Abre una UI para listar y disparar tools a mano. Es la forma más rápida de
saber si un problema es del servidor o del cliente.

Con curl, para una tool puntual:

```bash
curl -s -X POST localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"sismo_buscar","arguments":{"region":"chile","dias":7}}}'
```

## Configuración por entorno

| Variable | Default | Para qué |
|---|---|---|
| `PORT` | 8787 | Puerto HTTP |
| `DB_PATH` | ./sismos.db | Archivo SQLite |
| `LLM_BASE_URL` | http://localhost:11434/v1 | Endpoint OpenAI-compatible |
| `LLM_MODEL` | gpt-oss:20b-cloud | Modelo abierto |
| `LLM_API_KEY` | ollama | Key (Groq/OpenRouter la necesitan) |

Para cambiar a Groq: `LLM_BASE_URL=https://api.groq.com/openai/v1
LLM_MODEL=openai/gpt-oss-120b LLM_API_KEY=gsk_... npm run dev`
