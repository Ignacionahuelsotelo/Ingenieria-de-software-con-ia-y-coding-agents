# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

App de resultados de fútbol. Los datos de partidos/resultados provienen de un servidor MCP externo
(**SportDB**, ver `mcp.json`) en lugar de una base de datos propia. Además de
mostrar resultados, la app va a tener una feature de **preguntas en lenguaje natural** sobre los
resultados (ej. "¿quién ganó el clásico el fin de semana pasado?"), resuelta con un LLM que usa el MCP
de SportDB como fuente de datos en vez de tener la lógica de consulta hardcodeada.

This directory is currently empty/unscaffolded — the structure below is the target architecture, not
yet-existing code. When scaffolding, follow this layout rather than improvising a different one.

## Target structure

- `/backend` — Node + Express. Responsable de:
  - Exponer los endpoints REST que consume el frontend.
  - Hacer de cliente MCP hacia SportDB (el frontend no debería hablar MCP directamente).
  - Alojar la lógica de la feature de preguntas en lenguaje natural: recibe la pregunta del usuario,
    arma el prompt/tool-calling contra el LLM con acceso al MCP de SportDB, y devuelve una respuesta
    en lenguaje natural (no solo datos crudos).
- `/frontend` — React + Vite. Consume la API del backend (no llama a SportDB ni al LLM directamente).
  UI de resultados de partidos + una interfaz de preguntas/chat para la feature en lenguaje natural.

## Data source: SportDB MCP

- La configuración del servidor MCP (`sportdb`, streamable-http) vive en `mcp.json` en la raíz del
  monorepo (un nivel arriba de esta carpeta), no dentro de `futbol-vibecoding/`.
- El backend es el único componente que debe conectarse al MCP. Evitar duplicar credenciales o
  configuración de conexión en el frontend.
- Como los resultados vienen de una fuente externa vía MCP, no asumir que hay una base de datos local
  de partidos — el "estado" real vive en SportDB.

## Convenciones
- Backend: Express, ESM, tests con Vitest en backend/tests/
- Frontend: React + Vite, sin librerías de UI externas
- Toda ruta nueva en backend/src/routes/ necesita su test en backend/tests/
- Nunca hardcodear datos de fútbol: siempre vienen del MCP

## Commands (once scaffolded)

```bash
# backend
cd backend
npm install
npm run dev       # dev server con reload

# frontend
cd frontend
npm install
npm run dev        # Vite dev server
npm run build       # build de producción
```

Ajustar estos comandos a los `package.json` reales una vez que existan — estos son los comandos
convencionales para un stack Express + Vite, no confirmados todavía en este repo.
