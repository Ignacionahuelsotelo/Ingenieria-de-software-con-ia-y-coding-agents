# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

App de resultados de fútbol. Los datos de partidos/resultados provienen de un servidor MCP externo
(**SportDB**, ver `.mcp.json` en la raíz del monorepo) en lugar de una base de datos propia. Además de
mostrar resultados, la app tiene una feature de **preguntas en lenguaje natural** sobre los
resultados (ej. "¿quién ganó el clásico?"), resuelta con un LLM que usa el MCP de SportDB como fuente
de datos en vez de tener la lógica de consulta hardcodeada.

El backend y el frontend ya están scaffoldeados y funcionando (ver estructura real abajo). El endpoint
de preguntas en lenguaje natural (`POST /ai/ask`) todavía **no está implementado en el backend** — el
frontend ya tiene la UI y el service que lo consumen (`AssistantPage`, `aiService.ts`), pero pegan
contra una ruta que aún no existe del lado del servidor.

## Estructura actual

- `/backend` — Node + Express (ESM). Responsable de:
  - Exponer los endpoints REST que consume el frontend (`backend/src/routes/`).
  - Hacer de cliente MCP hacia SportDB (`backend/src/mcp/client.js`, `backend/src/services/sportdb.js`)
    — el frontend no habla MCP directamente.
  - Documentación OpenAPI servida en `/api-docs` (Swagger UI) y `/api-docs.json`
    (`backend/src/openapi.js`).
  - Pendiente: alojar la lógica de la feature de preguntas en lenguaje natural (`POST /ai/ask`) —
    recibir la pregunta del usuario, armar el prompt/tool-calling contra el LLM con acceso al MCP de
    SportDB, y devolver una respuesta en lenguaje natural (no solo datos crudos).
- `/frontend` — React 19 + Vite + TypeScript + Tailwind CSS 4. Consume la API del backend (no llama a
  SportDB ni al LLM directamente). Incluye UI de resultados de partidos + interfaz de chat para la
  feature en lenguaje natural (ya construida, a la espera del endpoint backend).

### Backend — rutas implementadas (`backend/src/routes/`)

- `GET /api/leagues` — ligas soportadas (config estática en `backend/src/config/leagues.js`, no pide
  datos al MCP).
- `GET /api/competitions` — lista de competiciones vía SportDB.
- `GET /api/matches?league=<slug>` o `?date=<fecha>` — partidos por liga o por fecha.
- `GET /api/matches/river-boca` — endpoint específico para el clásico River-Boca.
- `GET /api/matches/:id` — detalle de un partido.
- `GET /api/matches/:id/events` — incidencias del partido.
- `GET /api/matches/:id/lineups` — alineaciones.
- `GET /api/matches/:id/statistics` — estadísticas del partido.
- `GET /api/standings?league=<slug>` — tabla de posiciones.
- Cada una de estas rutas tiene su test correspondiente en `backend/tests/`.

Las ligas soportadas (slug, país, `competitionId`, `countryId` de SportDB) están centralizadas en
`backend/src/config/leagues.js`. Esto es config de qué ligas mostramos, no datos de fútbol — nombres,
resultados y tablas siempre se piden en vivo al MCP.

### Frontend — estructura (`frontend/src/`)

- `pages/` — `MatchesPage`, `MatchDetailsPage`, `CompetitionsPage`, `AssistantPage` (rutas en
  `App.tsx` vía `react-router-dom`).
- `services/` — `apiClient.ts` (fetch wrapper), `matchService.ts`, `aiService.ts` (POST a
  `/ai/ask`, todavía sin backend).
- `components/` — organizados por dominio: `assistant/`, `match/`, `competition/`, `layout/`, `ui/`,
  `common/`.
- `hooks/` (`useAsync`, `useMatches`), `lib/` (helpers de fecha, navegación, utils), `types/football.ts`.
- Sin librerías de componentes UI (no MUI/shadcn/etc.); sí usa `lucide-react` (íconos), `framer-motion`
  (animaciones/transiciones de página) y Tailwind CSS 4 para estilos.

## Data source: SportDB MCP

- La configuración del servidor MCP (`sportdb`, HTTP) vive en `.mcp.json` en la raíz del monorepo (un
  nivel arriba de esta carpeta), no dentro de `futbol-vibecoding/`.
- El backend es el único componente que debe conectarse al MCP. Evitar duplicar credenciales o
  configuración de conexión en el frontend.
- Como los resultados vienen de una fuente externa vía MCP, no asumir que hay una base de datos local
  de partidos — el "estado" real vive en SportDB.
- Antes de escribir/modificar código en `backend/` que llame a tools `mcp__sportdb__*`, usar la skill
  `sportdb-queries` (formato de fechas, paginación, ids de competición/país, etc.).

## Convenciones

- Backend: Express, ESM, tests con Vitest en `backend/tests/`.
- Frontend: React + Vite + TypeScript + Tailwind, sin librerías de componentes UI externas.
- Toda ruta nueva en `backend/src/routes/` necesita su test en `backend/tests/` — hay un hook de Stop
  (`.claude/hooks/backend-tests.sh`) que bloquea si falta el test de alguna ruta o si `npm test` falla
  en `backend/`.
- Nunca hardcodear datos de fútbol: siempre vienen del MCP. Config de ligas/equipos (slugs, ids) sí
  puede vivir en `backend/src/config/`.

## Commands

```bash
# backend
cd backend
npm install
npm run dev        # node --watch src/index.js
npm test           # vitest run

# frontend
cd frontend
npm install
npm run dev         # Vite dev server
npm run build        # tsc -b && vite build
```
