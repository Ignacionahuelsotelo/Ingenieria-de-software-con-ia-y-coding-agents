---
name: sportdb-queries
description: >
  Cómo consultar el MCP de SportDB (Flashscore) desde el backend de futbol-vibecoding.
  Usar SIEMPRE que se escriba o modifique código en backend/ que llame a alguna tool
  mcp__sportdb__* (fixtures, resultados, standings, stats de partido, búsqueda de
  equipos/jugadores, live, etc.), que arme un endpoint REST respaldado por SportDB, o que
  alimente la feature de preguntas en lenguaje natural con datos de SportDB. También
  aplica si se necesita el country_id/competition_id de una liga (Premier League, Liga
  Profesional Argentina, Champions League, etc.) o si hay dudas sobre formato de fecha,
  paginación o por qué una respuesta vino null/vacía/gigante.
---

# SportDB (Flashscore) MCP — instrucciones para el backend

Referencia completa (specs de cada tool, ejemplos de response, notas de exploración):
`docs/sportdb-api.md`. Esta skill es el resumen accionable — si necesitás el detalle
completo de una tool puntual, andá a esa sección del doc en vez de asumir el formato.

Todas las tools cuelgan de `mcp__sportdb__`. Toda response viene envuelta en
`{ endpoint, source_status_code, data }` — lo que te importa está en `data`.

## Mapa "necesito X → uso tool Y"

| Necesito... | Tool |
|---|---|
| Próximos partidos de una liga | `flashscore_get_competition_fixtures` |
| Partidos ya jugados / resultados de una liga | `flashscore_get_competition_results` |
| Tabla de posiciones | `flashscore_get_competition_standings` |
| Stats de un partido puntual (posesión, xG, tiros) | `flashscore_get_match_stats` |
| Goles/tarjetas/sustituciones de un partido | `flashscore_get_match_events` |
| Alineaciones de un partido | `flashscore_get_match_lineups` |
| Info + plantel de un equipo | `flashscore_get_team_details` |
| Ficha + carrera de un jugador | `flashscore_get_player_details` |
| Partidos en vivo/del día (todo el mundo, sin filtro) | `flashscore_get_live` |
| Cuotas en vivo | `flashscore_get_live_odds` |
| Encontrar el id/slug de un equipo/jugador/competición por nombre | `flashscore_search` |
| Listar temporadas disponibles de una competición | `flashscore_list_competition_seasons` |
| Descubrir competiciones de un país | `flashscore_list_competitions` |
| Descubrir países/regiones de un deporte | `flashscore_list_countries` |
| Descubrir deportes soportados | `flashscore_list_sports` |

Regla general: si ya conocés el nombre de un equipo/jugador/competición, arrancá por
`flashscore_search` (con `type` seteado) en vez de navegar countries → competitions a mano.
Si necesitás fixtures/results/standings de una liga específica, andá directo con los IDs
concretos de la tabla de abajo — no hace falta pasar por `list_countries`/`list_competitions`
para las ligas que ya usamos en la app.

## IDs de ligas que usamos (sport siempre `"soccer"`)

| Competición | country_slug | country_id | competition_slug | competition_id |
|---|---|---|---|---|
| Premier League | `england` | `198` | `premier-league` | `dYlOSQOD` |
| FA Community Shield | `england` | `198` | `fa-community-shield` | `AsSx0P9K` |
| Liga Profesional (Argentina) | `argentina` | `22` | `liga-profesional` | `naYhNOaA` |
| Copa Argentina | `argentina` | `22` | `copa-argentina` | `OWsjCTcG` |
| Champions League | `europe` | `6` | `champions-league` | `xGrwqq16` |
| Europa League | `europe` | `6` | `europa-league` | `ClDjv3V5` |

Torneos internacionales (Champions/Europa League) viven bajo la confederación (`europe/6`),
no bajo un país. Si aparece una liga nueva que no está en esta tabla, resolvela con
`flashscore_search` o `list_countries`/`list_competitions` y considerá agregarla acá.

Todos estos IDs son específicos de `sport=soccer` — no son válidos para otro deporte aunque
el país/equipo tenga el mismo nombre (ver Boca Juniors en `docs/sportdb-api.md`).

## Fechas, timezone y paginación

- `startDateTimeUtc`: ISO-8601 en UTC. Usalo para mostrar/ordenar fechas — no lo
  reconstruyas a mano.
- `startUtime` / `startTime`: epoch en segundos, pero viene como **string**, no número.
  Parsear antes de usar.
- `season`: usar siempre el string exacto que devuelve `flashscore_list_competition_seasons`
  (puede ser `"2025"` o `"2025-2026"` según la liga) — no inferirlo ni armarlo manualmente.
- `page`: solo aplica a `get_competition_fixtures` y `get_competition_results`, default `1`.
  `get_competition_standings` y `get_competition_seasons` NO están paginadas.
- `flashscore_get_live` acepta `offset` (desplazamiento de día, 0 = hoy) y `tz` (offset de
  timezone) — no confundir `offset` con paginación, es un offset de fecha.

## Errores típicos y cómo evitarlos

1. **Payload demasiado grande.** `get_live` para `soccer`, y `get_competition_fixtures`/
   `_results` de una temporada completa en ligas grandes (Premier League ~380 partidos)
   pueden superar los límites de una tool call. Nunca reenviar la respuesta cruda a un LLM
   (rompe la feature de preguntas en lenguaje natural) — paginar agresivamente y/o filtrar
   server-side (por `tournamentName`, por lista de `team_id` de interés) antes de usarla.
   Para "próximos partidos de esta liga" preferir `get_competition_fixtures` (filtrable) en
   vez de `get_live` (trae todo el mundo, sin filtro).

2. **`data` puede ser `null`, no `[]`.** `get_competition_fixtures` devuelve `null` cuando
   la temporada ya cerró y no quedan partidos programados. Chequear explícitamente
   `data == null` además de `data.length === 0` — un `.length` sobre `null` rompe.

3. **Campos que a veces son array y a veces string simple.** En `get_match_events` y
   `get_match_lineups`, campos como `incidentType`, `incidentPlayerName`,
   `incidentPlayerId`, `incidentCommentary` vienen como array cuando el incidente tiene más
   de un actor (gol + asistencia, sub in/out) y como string simple cuando es uno solo
   (tarjeta). Normalizar siempre a array antes de procesar (`Array.isArray(x) ? x : [x]`).

4. **`homeEventParticipantId` ≠ `homeParticipantIds`.** El primero es un id efímero del
   evento; `homeParticipantIds`/`awayParticipantIds` es el `team_id` real, que es el que hay
   que usar para llamar a `get_team_details` o para filtrar `get_live`.

5. **`flashscore_search` devuelve homónimos.** Un mismo nombre puede matchear equipos de
   distinto deporte/país/género/categoría. Siempre filtrar por `type` (parámetro de la
   tool) y por `sport.name`/`country.name` del resultado antes de tomar el primero — nunca
   asumir que `results[0]` es el correcto.

6. **Casi todo viene como string, incluidos números.** Scores, stats, epoch times y ratings
   son strings en la mayoría de las tools (excepciones: `get_player_details.careers[].stats[].value`
   y `get_team_details.stadiumCapacity`, que sí son números). No usar comparaciones/aritmética
   directa sin `parseInt`/`parseFloat` primero. Además algunos stats vienen con formato
   compuesto (`"86% (459/536)"`), no un número puro.

7. **IDs no son globales entre deportes.** Resolver siempre los IDs dentro del contexto de
   `sport: "soccer"` — no reutilizar un `team_id`/`country_id` obtenido para otro deporte.
