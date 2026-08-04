# SportDB (Flashscore) MCP — Guía de referencia

## Qué es

`sportdb` es un servidor MCP que expone datos deportivos de Flashscore (fútbol y otros deportes:
tenis, basket, etc.) a través de 15 tools. No es una base de datos propia: cada tool llama en el
momento a un endpoint HTTP tipo `/api/flashscore/...` y devuelve la respuesta cruda envuelta en un
objeto `{ endpoint, source_status_code, data }`.

- `endpoint`: el path HTTP real que se llamó (útil para debug/logs).
- `source_status_code`: código HTTP de la fuente (200 normalmente).
- `data`: el payload real. Puede ser un array, un objeto, o `null` (por ejemplo cuando no hay
  fixtures futuros para una temporada ya finalizada).

Todas las tools están bajo el prefijo `mcp__sportdb__` cuando se listan en este entorno, pero el
nombre de tool a usar en código es el que aparece en los headers de abajo
(`flashscore_list_countries`, etc.).

Instrucción del propio servidor: "Use sportdb.dev Flashscore tools to retrieve sports, live events,
match stats, and match incidents."

## Cómo se encadenan las tools (flujo típico)

```
flashscore_list_sports
        │  sport slug (ej. "soccer")
        ▼
flashscore_list_countries(sport)
        │  country_slug + country_id (ej. england/198, argentina/22, europe/6)
        ▼
flashscore_list_competitions(sport, country_slug, country_id)
        │  competition_slug + competition_id (ej. premier-league/dYlOSQOD)
        ▼
flashscore_list_competition_seasons(sport, country_slug, country_id, competition_slug, competition_id)
        │  season (ej. "2025-2026", "2025", "2026")
        ▼
flashscore_get_competition_fixtures / _results / _standings (...mismos params + season [+ page])
        │  eventId / teamId de cada partido/equipo
        ▼
flashscore_get_match_stats / _match_events / _match_lineups (match_id)
flashscore_get_team_details (team_slug, team_id)
flashscore_get_player_details (player_slug, player_id)
```

`flashscore_search` es un atajo: dado un texto libre devuelve equipos/jugadores/competiciones ya
con sus `id`/`slug`, evitando tener que navegar countries → competitions → seasons cuando ya se
conoce el nombre.

Los identificadores (`country_id`, `competition_id`, `team_id`, `player_id`, `match_id`/`eventId`)
son opacos y específicos de Flashscore (alfanuméricos tipo `dYlOSQOD`, `hA1Zm19f`). Hay que
obtenerlos siempre de una respuesta anterior — no son adivinables ni estables entre deportes (el
mismo país puede tener distinto `country_id` en `soccer` vs `basketball`, ver Boca Juniors abajo).

## IDs concretos útiles (recolectados en esta exploración)

**Sport:** `soccer` (id numérico 1, pero el parámetro de tools es el slug `soccer`).

**Países (sport=soccer):**
| país | slug | id |
|---|---|---|
| England | `england` | `198` |
| Argentina | `argentina` | `22` |
| Europe (confederación, para competiciones UEFA) | `europe` | `6` |

**Competiciones:**
| competición | country | slug | id |
|---|---|---|---|
| Premier League | england/198 | `premier-league` | `dYlOSQOD` |
| FA Community Shield | england/198 | `fa-community-shield` | `AsSx0P9K` |
| Liga Profesional (Argentina) | argentina/22 | `liga-profesional` | `naYhNOaA` |
| Copa Argentina | argentina/22 | `copa-argentina` | `OWsjCTcG` |
| Champions League | europe/6 | `champions-league` | `xGrwqq16` |
| Europa League | europe/6 | `europa-league` | `ClDjv3V5` |

**Equipos (sport=soccer):**
| equipo | slug | team_id | país |
|---|---|---|---|
| Boca Juniors | `boca-juniors` | `hMrWAFH0` | Argentina |
| Arsenal | `arsenal` | `hA1Zm19f` | England |
| Manchester City | `manchester-city` | `Wtn9Stg0` | England |
| Manchester Utd | `manchester-united` | `ppjDR086` | England |
| Liverpool | `liverpool` | `lId4TMwf` | England |
| Crystal Palace | `crystal-palace` | `AovF1Mia` | England |
| Inter Miami | `inter-miami` | `0AheRyBg` | USA |

Nota: `flashscore_search` para "Boca Juniors" devuelve *múltiples* resultados con el mismo nombre
pero distinto deporte/país/categoría (equipo masculino, femenino, U20, basketball, volleyball,
futsal, beach soccer, e incluso un "Boca Juniors" de Colombia y otro de Gibraltar). Siempre hay que
filtrar por `type` (usar el parámetro `type: "team"` del search) y por el campo `sport.name` /
`country.name` del resultado antes de asumir cuál es el equipo correcto.

**Jugadores:**
| jugador | slug | player_id |
|---|---|---|
| Lionel Messi | `messi-lionel` | `vgOOdZbd` |

**Partido de ejemplo usado para stats/events/lineups:**
FA Community Shield 2025, Crystal Palace 3(pen)-3(2) Liverpool → `match_id = KGB564l2`.

---

## flashscore_list_sports

Lista todos los deportes soportados y sus endpoints de live feed.

**Parámetros:** ninguno.

**Response** (`data`: array de objetos):
```json
{
  "id": 1,
  "link": "/api/flashscore/soccer",
  "live": "/api/flashscore/soccer/live"
}
```
Nota: `soccer` y `football` aparecen ambos con `id: 1` (alias). Hay ~40 deportes (tennis,
basketball, hockey, handball, rugby, cricket, darts, esports, motorsport, etc.). El campo a usar
como parámetro `sport` en el resto de las tools es el segmento final del `link` (ej. `soccer`,
`tennis`, `basketball`).

---

## flashscore_list_countries

Lista los países/regiones disponibles para un deporte, con sus IDs.

**Parámetros:**
- `sport` (string, requerido): slug del deporte, ej. `"soccer"`.

**Ejemplo:** `{ sport: "soccer" }`

**Response** (`data`: array):
```json
{
  "name": "Argentina",
  "id": 22,
  "slug": "argentina",
  "sportId": 1,
  "competitions": "/api/flashscore/soccer/argentina:22"
}
```
Incluye tanto países reales (England, Argentina, ...) como confederaciones/regiones agrupadoras:
`Africa (1)`, `Asia (5)`, `Australia & Oceania (7)`, `Europe (6)`, `North & Central America (2)`,
`South America (3)`, `World (8)`. Estas últimas son las que hay que usar para torneos
internacionales (Champions League vive en `europe:6`, Copa América en `south-america:3`, Mundial en
`world:8`, etc.), no dentro de un país puntual.

---

## flashscore_list_competitions

Lista las competiciones (ligas, copas, categorías juveniles/femeninas, etc.) de un país/región.

**Parámetros:**
- `sport` (string, requerido)
- `country_slug` (string, requerido)
- `country_id` (integer, requerido)

**Ejemplo:** `{ sport: "soccer", country_slug: "england", country_id: 198 }`

**Response** (`data`: array):
```json
{
  "id": "dYlOSQOD",
  "name": "Premier League",
  "slug": "premier-league",
  "link": "/api/flashscore/soccer/england:198/premier-league:dYlOSQOD"
}
```
Para England devuelve ~29 competiciones (Premier League, Championship, League One/Two, FA Cup, EFL
Cup, WSL, categorías U18/U20, reservas, etc.). El `id` de competición es alfanumérico y estable pero
opaco (no confundir con el `id` de país que es numérico).

---

## flashscore_list_competition_seasons

Lista las temporadas históricas disponibles para una competición, con links pre-armados a
fixtures/results/standings/stages de cada una.

**Parámetros:**
- `sport`, `country_slug`, `country_id` (igual que arriba)
- `competition_slug` (string, requerido)
- `competition_id` (string, requerido)

**Ejemplo:** `{ sport: "soccer", country_slug: "argentina", country_id: 22, competition_slug: "liga-profesional", competition_id: "naYhNOaA" }`

**Response** (`data`: array, una entrada por temporada, ordenadas de más reciente a más antigua):
```json
{
  "season": "2025",
  "results": "/api/flashscore/soccer/argentina:22/liga-profesional:naYhNOaA/2025/results?page=1",
  "fixtures": "/api/flashscore/soccer/argentina:22/liga-profesional:naYhNOaA/2025/fixtures?page=1",
  "standings": "/api/flashscore/soccer/argentina:22/liga-profesional:naYhNOaA/2025/standings",
  "stages": "/api/flashscore/soccer/argentina:22/liga-profesional:naYhNOaA/2025/stages",
  "flashcoreUrl": "https://www.flashscore.com/soccer/argentina/liga-profesional-2025/"
}
```
- El formato del `season` varía: puede ser un año simple (`"2025"`, para ligas que corren en año
  calendario, como Argentina) o un rango (`"2025-2026"`, para ligas europeas con temporada
  otoño-primavera, como Premier League). Hay que usar exactamente el string devuelto acá como
  parámetro `season` en las tools de fixtures/results/standings — no inferirlo.
- **Cuidado con el tamaño de la respuesta**: para competiciones con muchos años de historial (ej.
  Liga Profesional Argentina, ~28 temporadas desde 1999) el payload puede rondar los 50KB+ de JSON y
  el runtime de este entorno lo bloquea por exceder el límite de tokens de una sola tool call
  (ver sección "Limitaciones" al final). En un cliente MCP real esto no debería ser un problema si
  se procesa el JSON en el propio backend en vez de mostrarlo íntegro a un LLM.

---

## flashscore_get_competition_fixtures

Partidos programados (aún no jugados) de una competición/temporada. Paginado.

**Parámetros:**
- `sport`, `country_slug`, `country_id`, `competition_slug`, `competition_id` (igual que arriba)
- `season` (string, requerido): tal cual viene de `list_competition_seasons`.
- `page` (integer, opcional, default `1`).

**Ejemplo:** `{ sport: "soccer", country_slug: "england", country_id: 198, competition_slug: "fa-community-shield", competition_id: "AsSx0P9K", season: "2026", page: 1 }`

**Response** (`data`: array de eventos, o `null` si no hay fixtures futuros para esa temporada):
```json
{
  "eventId": "jNXdfeGb",
  "eventStage": "SCHEDULED",
  "eventStageTypeId": "1",
  "homeEventParticipantId": "MH4dFoAd",
  "homeName": "Arsenal",
  "homeParticipantIds": "hA1Zm19f",
  "awayEventParticipantId": "nedrwk23",
  "awayName": "Manchester City",
  "awayParticipantIds": "Wtn9Stg0",
  "round": "Final",
  "startDateTimeUtc": "2026-08-16T14:00:00.000Z",
  "startUtime": "1786888800",
  "tournamentName": "ENGLAND: FA Community Shield",
  "infoNotice": "Neutral location - Principality Stadium.",
  "links": {
    "details": "/api/flashscore/match/jNXdfeGb/details",
    "lineups": "/api/flashscore/match/jNXdfeGb/lineups",
    "stats": "/api/flashscore/match/jNXdfeGb/stats"
  }
}
```
- `eventId` es el `match_id` a usar en `flashscore_get_match_*`.
- `homeParticipantIds` / `awayParticipantIds` son los `team_id` reales (nótese que
  `homeEventParticipantId` es distinto y es un id efímero del evento, no el id del equipo/team —
  usar siempre `*ParticipantIds` para referenciar el equipo en `flashscore_get_team_details`).
- `startDateTimeUtc` es ISO-8601 UTC; `startUtime`/`startTime` son epoch en segundos (string).
- **Importante:** cuando la temporada ya terminó y no quedan partidos por jugar, `data` es `null`
  (no array vacío). Hay que manejar ese caso explícitamente en el backend.
- Para ligas grandes (ej. Premier League completa, 380 partidos/temporada) esta respuesta puede ser
  muy pesada; usar `page` para no traer todo de una.

---

## flashscore_get_competition_results

Partidos ya jugados (terminados) de una competición/temporada. Misma forma de parámetros que
fixtures, paginado.

**Parámetros:** idénticos a `flashscore_get_competition_fixtures` (incluye `page`).

**Ejemplo:** `{ ..., competition_slug: "fa-community-shield", competition_id: "AsSx0P9K", season: "2025", page: 1 }`

**Response** (`data`: array de eventos finalizados):
```json
{
  "eventId": "KGB564l2",
  "eventStage": "FINISHED",
  "homeName": "Crystal Palace",
  "homeParticipantIds": "AovF1Mia",
  "homeScore": "3",
  "homeFullTimeScore": "2",
  "homeResultPeriod2": "1",
  "awayName": "Liverpool",
  "awayParticipantIds": "lId4TMwf",
  "awayScore": "2",
  "awayFullTimeScore": "2",
  "winner": "1",
  "round": "Final",
  "startDateTimeUtc": "2025-08-10T14:00:00.000Z",
  "tournamentName": "ENGLAND: FA Community Shield",
  "infoNotice": "Playing at Wembley Stadium.",
  "links": { "details": "/api/flashscore/match/KGB564l2/details", "stats": "...", "lineups": "..." }
}
```
- `homeScore`/`awayScore` es el resultado final "oficial" (incluye penales si los hubo, ver
  `homeResultPeriod2`/`awayResultPeriod2` para el resultado tras la prórroga si aplica);
  `homeFullTimeScore`/`awayFullTimeScore` es el resultado en los 90 minutos reglamentarios.
  `winner`: `"1"` = ganó home, `"2"` = ganó away, `"0"`/ausente = empate.
- **Cuidado con el tamaño**: pedir resultados de una temporada completa de una liga grande (ej.
  Premier League 2025-2026, 380 partidos) generó una respuesta de ~196.000 caracteres que excedió el
  límite de una sola tool call en este entorno. Conviene paginar agresivamente o filtrar por ronda
  en el consumidor si el volumen es alto. Para copas de partido único (Community Shield) la
  respuesta es liviana (~1 evento).

---

## flashscore_get_competition_standings

Tabla de posiciones de una competición/temporada, con los últimos 5 resultados de cada equipo
embebidos.

**Parámetros:**
- `sport`, `country_slug`, `country_id`, `competition_slug`, `competition_id`, `season` (sin `page`
  — no está paginado).

**Ejemplo:** `{ sport: "soccer", country_slug: "england", country_id: 198, competition_slug: "premier-league", competition_id: "dYlOSQOD", season: "2025-2026" }`

**Response** (`data`: array, una entrada por equipo, ya ordenado por posición):
```json
{
  "rank": "1",
  "teamId": "hA1Zm19f",
  "teamName": "Arsenal",
  "teamSlug": "arsenal",
  "matches": "38",
  "wins": "26",
  "draws": "7",
  "lossesRegular": "5",
  "goals": "71:27",
  "goalDiff": "44",
  "points": "85",
  "pointsPerMatchesPlayed": "2.24",
  "rankClass": "q1",
  "rankColor": "004682",
  "events": [
    {
      "eventId": "UNC9hLMj",
      "eventHomeParticipantName": "Crystal Palace",
      "eventAwayParticipantName": "Arsenal",
      "eventHomeScore": "1",
      "eventAwayScore": "2",
      "eventType": "w",
      "eventStartTime": "1779580800"
    }
    /* ... hasta 5 eventos, forma racha reciente ("w"/"d"/"l") */
  ]
}
```
- `rankClass`/`rankColor` codifican el color de la fila en la UI de Flashscore (ej. `q1` = zona de
  clasificación a Champions, `r1` = descenso) — útiles si se quiere replicar la semántica visual,
  pero no siempre presentes (algunos rangos "neutros" no traen esos campos).
  `events[].eventType`: `"w"` (win), `"d"` (draw), `"l"` (loss) desde la perspectiva de ese equipo.
- Esta respuesta puede ser grande para ligas de 20 equipos (~35-40KB), pero generalmente entra
  dentro del límite de una tool call (a diferencia de fixtures/results de temporada completa).

---

## flashscore_get_match_stats

Estadísticas resumen de un partido (posesión, tiros, xG, tarjetas, etc.), separadas por período.

**Parámetros:**
- `match_id` (string, requerido): el `eventId` de fixtures/results/live.

**Ejemplo:** `{ match_id: "KGB564l2" }`

**Response** (`data`: array, un objeto por período):
```json
{
  "period": "Match",
  "stats": [
    { "statId": "432", "statName": "Expected goals (xG)", "homeValue": "2.07", "awayValue": "1.10" },
    { "statId": "12", "statName": "Ball possession", "homeValue": "41%", "awayValue": "59%" },
    { "statId": "34", "statName": "Total shots", "homeValue": "14", "awayValue": "12" }
    /* ... ~30 stats por período */
  ]
}
```
- `period` puede ser `"Match"`, `"1st Half"`, `"2nd Half"` (y potencialmente otros para deportes/
  competiciones con prórroga).
- `homeValue`/`awayValue` son siempre strings; algunas son porcentajes (`"59%"`), otras conteos
  (`"14"`) y otras tienen formato `"86% (459/536)"` (para pases). No asumir número puro, parsear.
- No todos los partidos tienen stats disponibles (partidos muy antiguos o de ligas menores pueden
  devolver `data: []`).

---

## flashscore_get_match_events

Incidentes del partido: goles, tarjetas, sustituciones, penales — comentario tipo "live text" en
inglés. **No** incluye jugada a jugada (pases, secuencia de tiros, toques de balón), solo estos
incidentes discretos. También trae metadata del partido (árbitro, estadio, asistencia).

**Parámetros:**
- `match_id` (string, requerido).

**Ejemplo:** `{ match_id: "KGB564l2" }`

**Response** (`data`: objeto, no array):
```json
{
  "homeName": "Crystal Palace",
  "awayName": "Liverpool",
  "referee": "Kavanagh C.",
  "venue": "Wembley Stadium",
  "venueCity": "London",
  "attendance": "82 645",
  "capacity": "90 000",
  "events": [
    {
      "eventId": "baWbmWGt",
      "incidentTime": "4'",
      "incidentHalf": "1",
      "incidentSide": "2",
      "incidentType": ["3", "8"],
      "incidentTypeName": ["Goal", "Assistance"],
      "incidentPlayerName": ["Ekitike H.", "Wirtz F."],
      "incidentPlayerId": ["ltVXPlJU", "0Q5gjImi"],
      "incidentPlayerUrl": ["/player/ekitike-hugo/ltVXPlJU/", "/player/wirtz-florian/0Q5gjImi/"],
      "incidentCommentary": ["Goal! Hugo Ekitike ... 0:1.", ""],
      "homeScore": "0",
      "awayScore": "1"
    }
  ]
}
```
- `incidentSide`: `"1"` = home, `"2"` = away.
- Muchos campos vienen como **arrays paralelos** cuando el incidente tiene dos "actores" (ej. gol +
  asistencia, o jugador que sale + jugador que entra en una sustitución): `incidentType`,
  `incidentTypeName`, `incidentPlayerId`, `incidentPlayerName`, `incidentPlayerUrl`,
  `incidentCommentary` tienen la misma longitud y se corresponden por índice. Cuando el incidente es
  simple (ej. tarjeta amarilla a un solo jugador), esos mismos campos vienen como **string simple**,
  no array — hay que manejar ambos casos al parsear.
- Tandas de penales (`incidentHalf: "penalties"`) se listan como incidentes individuales
  `incidentType: ["5","10"]` (Penalty Awarded / Penalty) o `["5","11"]` (Penalty missed).
- `incidentPlayerId` es el `player_id` a usar en `flashscore_get_player_details`.

---

## flashscore_get_match_lineups

Alineaciones titulares, suplentes y cuerpo técnico de ambos equipos, con ratings individuales e
incidentes embebidos por jugador (goles, tarjetas, sustituciones que le tocaron a ese jugador).

**Parámetros:**
- `match_id` (string, requerido).

**Ejemplo:** `{ match_id: "KGB564l2" }`

**Response** (`data`: array de 3 grupos — Starting Lineups, Substitutes, Coaches — cada uno con
`home`/`away`):
```json
[
  {
    "group": "Starting Lineups",
    "home": [
      {
        "participantId": "Stf4BYFn",
        "participantName": "Eze E.",
        "participantNumber": "10",
        "positionKey": "10",
        "participantRating": "5.8",
        "formation": "1-3-4-2-1",
        "participantUrl": "/player/eze-eberechi/Stf4BYFn/"
      }
    ],
    "away": [ /* ... */ ]
  },
  { "group": "Substitutes", "home": [ /* ... */ ], "away": [ /* ... */ ] },
  { "group": "Coaches", "home": [ /* playerType: "2" */ ], "away": [ /* ... */ ] }
]
```
- `formation` (ej. `"1-3-4-2-1"`) aparece repetido en cada jugador titular de ese equipo (no en un
  campo separado a nivel de equipo).
- `playerType`: `"1"` = jugador de campo/arquero, `"3"` en el arquero específicamente (goalkeeper
  flag además de playerType 1 en algunos casos — ver `participantSpecialPosition: "(G)"` como
  indicador más confiable), `"2"` = cuerpo técnico (coach).
- Jugadores que entraron/salieron o tuvieron incidentes traen `incidentTooltip`/`incidentTypeName`/
  `incidentUrl`/`lineupIncident` (mismo patrón de "array paralelo si hay más de un incidente" que en
  `get_match_events`).
- No disponible (array vacío o sin ese grupo) para partidos sin cobertura de lineups detallada.

---

## flashscore_get_team_details

Info de un equipo: estadio, país, y el plantel (squad) agrupado por competición (liga doméstica,
copa nacional, copas internacionales — puede repetirse un mismo jugador en varios grupos porque
Flashscore separa el roster registrado por torneo).

**Parámetros:**
- `team_slug` (string, requerido)
- `team_id` (string, requerido)

**Ejemplo:** `{ team_slug: "boca-juniors", team_id: "hMrWAFH0" }`

**Response** (`data`: objeto):
```json
{
  "id": "hMrWAFH0",
  "teamName": "Boca Juniors",
  "teamLogo": "https://static.flashscore.com/res/image/data/h4UwH8Cr-pGZDw8HC.png",
  "stadiumName": "Estadio Alberto J. Armando (Buenos Aires)",
  "stadiumCapacity": 57200,
  "country": { "name": "Argentina", "slug": "argentina" },
  "squad": [
    {
      "tournamentId": "j1MnZ14E",
      "tournamentType": "league",
      "players": [
        {
          "id": "AmuPcgC4",
          "slug": "aranda-tomas",
          "firstName": "Tomas",
          "lastName": "Aranda",
          "jerseyNumber": "10",
          "position": "Midfielders",
          "countryName": "Argentina",
          "countryId": 22,
          "link": "/api/flashscore/player/aranda-tomas/AmuPcgC4"
        }
      ]
    }
    /* más grupos: "national-cup", "international-cups" (puede haber más de uno,
       ej. Libertadores y Sudamericana por separado), y un grupo final con
       tournamentId/tournamentType vacíos que agrega el roster completo sin duplicar */
  ]
}
```
- `id` de cada jugador en `squad[].players[]` es el `player_id` para `get_player_details`.
- `position` viene en inglés y en plural: `"Goalkeepers"`, `"Defenders"`, `"Midfielders"`,
  `"Forwards"`, y `"Coach"` para el cuerpo técnico (aparece dentro de la misma lista de `players`,
  no separado).

---

## flashscore_get_player_details

Ficha de un jugador: datos personales, equipo actual, y carrera histórica completa desglosada por
temporada y competición (liga, copas nacionales, copas internacionales, selección nacional).

**Parámetros:**
- `player_slug` (string, requerido)
- `player_id` (string, requerido)

**Ejemplo:** `{ player_slug: "messi-lionel", player_id: "vgOOdZbd" }`

**Response** (`data`: objeto):
```json
{
  "id": "vgOOdZbd",
  "firstName": "Lionel",
  "lastName": "Messi",
  "dob": "1987-06-24",
  "teamName": "Inter Miami",
  "teamId": "0AheRyBg",
  "marketValue": "€17.2m",
  "contractExpires": "Contract expires: 31.12.2028",
  "playerStatus": "ACTIVE",
  "countryName": "Argentina",
  "careers": {
    "league": [
      {
        "season": "2025",
        "teamName": "Inter Miami",
        "teamId": "0AheRyBg",
        "competitionName": "MLS",
        "competitionSlug": "mls",
        "countrySlug": "usa",
        "stats": [
          { "name": "Rating", "value": 8.2 },
          { "name": "Matches Played", "value": 34 },
          { "name": "Goals Scored", "value": 35 },
          { "name": "Assists", "value": 23 },
          { "name": "Yellow Cards", "value": 3 },
          { "name": "Red Cards", "value": 0 }
        ]
      }
    ],
    "nationalCups": [ /* misma forma */ ],
    "internationalCups": [ /* misma forma, incluye Champions League, Mundial de Clubes, etc. */ ],
    "nationalTeams": [ /* misma forma, carrera con la selección (Argentina) */ ]
  }
}
```
- `careers` tiene 4 buckets fijos: `league`, `nationalCups`, `internationalCups`, `nationalTeams`.
  Cada uno es un array de temporadas (puede haber varias entradas para la misma `season` si el
  jugador jugó más de una competición ese año, ej. liga + Champions).
  `stats[].value` puede ser `null` (dato no disponible, sobre todo en temporadas viejas para
  "Assists") o `0` (rating no calculado en temporadas antiguas).
- `position` vino vacío (`""`) en el ejemplo probado — no confiar en ese campo, puede no venir
  poblado; usar mejor la posición reportada en `flashscore_get_team_details` o en lineups.

---

## flashscore_get_live

Eventos en vivo (y próximos a jugarse el mismo día) de un deporte, **sin filtrar por país ni
competición** — trae todos los partidos live/próximos de todo el mundo para ese deporte.

**Parámetros:**
- `sport` (string, requerido)
- `offset` (integer, opcional, default `0`): desplazamiento de día (0 = hoy, 1 = mañana, etc.)
- `tz` (integer, opcional, default `0`): offset de timezone.

**Ejemplo:** `{ sport: "futsal" }`

**Response** (`data`: array; `[]` si no hay nada en vivo/programado en ese momento para ese deporte):
```json
{
  "eventId": "E7kfed8s",
  "eventStage": "SCHEDULED",
  "gameTime": "-1",
  "homeName": "Atletico-PI",
  "homeParticipantIds": "4KqQ1im1",
  "awayName": "Sorriso",
  "awayParticipantIds": "Ms9lWUkC",
  "tournamentName": "BRAZIL: Campeonato Brasileiro",
  "startDateTimeUtc": "2026-07-30T22:45:00.000Z",
  "hasLiveBetting": "n",
  "links": {
    "details": "/api/flashscore/match/E7kfed8s/details",
    "lineups": "/api/flashscore/match/E7kfed8s/lineups",
    "stats": "/api/flashscore/match/E7kfed8s/stats",
    "odds": "/api/flashscore/match/E7kfed8s/odds"
  }
}
```
- **Limitación importante detectada**: para `sport: "soccer"` (y también para `darts`, que en
  principio suena "chico") esta tool devolvió un payload tan grande (>100.000 caracteres, en el caso
  de soccer más de 1.000.000 de caracteres) que excedió el límite de una tool call en este entorno y
  no pudo inspeccionarse directamente. Esto ocurre porque `get_live` no acepta ningún filtro de país
  o competición — trae *todos* los eventos en vivo/del día de todo el mundo para ese deporte. En un
  backend real conviene:
  - Llamarla con cuidado (puede ser una respuesta enorme en deportes populares como soccer).
  - Filtrar del lado del backend por `tournamentName` o por lista de `homeParticipantIds`/
    `awayParticipantIds` de interés, en vez de mostrar la respuesta cruda a un LLM.
  - Considerar usar en su lugar `flashscore_get_competition_fixtures` con `season` actual si lo que
    se necesita es "próximos partidos de una liga específica", que sí es filtrable y paginado.
- `eventStage` observado: `"SCHEDULED"` (no empezado). Presumiblemente durante partidos en curso
  trae también estados tipo "1H"/"2H"/"FINISHED" con `homeScore`/`awayScore` (no confirmado en esta
  sesión porque no había partidos de soccer en vivo verificables sin exceder el límite de tokens).

---

## flashscore_get_live_odds

Cuotas de casas de apuestas (1X2: home/draw/away) para eventos en vivo de un deporte, con su valor
anterior para detectar movimiento de mercado.

**Parámetros:**
- `sport` (string, requerido).

**Ejemplo:** `{ sport: "soccer" }`

**Response** (`data`: array plano, sin agrupar por partido más que por `eventId`):
```json
{
  "bookmakerId": "851",
  "eventId": "nZToYKve",
  "hasOddsComparison": "1",
  "odds0": "3.7",
  "odds0Previous": "3.6",
  "odds1": "2.3",
  "odds1Previous": "2.3",
  "odds2": "2.55",
  "odds2Previous": "2.6"
}
```
- `odds0` = cuota de victoria local, `odds1` = empate, `odds2` = victoria visitante (convención 1X2
  estándar; no vienen etiquetados por nombre, hay que asumir ese orden).
- Puede haber múltiples entradas para el mismo `eventId` con distinto `bookmakerId` (varias casas de
  apuestas cubriendo el mismo partido).
- `eventId` es el mismo `match_id`/`eventId` que en fixtures/results/live — permite cruzar odds con
  el partido real.
- A diferencia de `get_live`, esta tool sí devolvió una respuesta manejable (no excedió límites) al
  probarla con `soccer`, aunque en principio también carece de filtro por país/competición.

---

## flashscore_get_match_events (ver arriba, ya documentada)

## flashscore_search

Búsqueda libre de equipos, jugadores y competiciones por texto.

**Parámetros:**
- `q` (string, requerido): texto de búsqueda.
- `type` (string, opcional): `"player"` | `"team"` | `"competition"`. Si se omite, devuelve mezcla
  de tipos.

**Ejemplo:** `{ q: "Messi", type: "player" }`

**Response** (`data`: objeto `{ query, results: [...] }`):
```json
{
  "query": "Messi",
  "results": [
    {
      "id": "vgOOdZbd",
      "url": "messi-lionel",
      "name": "Messi Lionel",
      "type": "player",
      "gender": { "id": 1, "name": "Men" },
      "sport": { "id": 1, "name": "Soccer" },
      "country": { "id": 22, "name": "Argentina" },
      "teams": [
        { "id": "f9OppQjp", "name": "Argentina", "kind": "NOMINATION" },
        { "id": "0AheRyBg", "name": "Inter Miami", "kind": "TEAM" }
      ]
    }
  ]
}
```
- El campo `url` es el `slug` a usar en `get_player_details`/`get_team_details`; `id` es el
  `player_id`/`team_id`.
- Resultados incluyen homónimos de otros deportes/países/categorías (ver ejemplo "Boca Juniors" en
  la sección de IDs arriba) — hay que filtrar explícitamente por `sport.name === "Soccer"` (o el
  deporte deseado) y por `country`/`gender` antes de usar el primer resultado.
- Para jugadores, `teams[]` lista tanto el club actual (`kind: "TEAM"`) como la selección nacional
  (`kind: "NOMINATION"`), útil para resolver "¿en qué selección/equipo juega X?" sin otra llamada.

---

## Limitaciones generales observadas

1. **Tamaño de respuesta**: varias tools (`flashscore_get_live` para deportes populares,
   `flashscore_get_competition_results`/`_fixtures` para temporadas completas de ligas grandes,
   `flashscore_list_competition_seasons` para competiciones con muchos años de historia) pueden
   devolver payloads de cientos de KB. El backend debe:
   - Paginar agresivamente (`page` en fixtures/results).
   - Nunca reenviar la respuesta cruda entera a un LLM (para la feature de preguntas en lenguaje
     natural) — primero filtrar/resumir server-side.
2. **`data: null`**: `get_competition_fixtures` devuelve `null` (no `[]`) cuando no hay partidos
   programados para esa temporada/competición (ej. temporada ya cerrada). Hay que chequear
   explícitamente `data == null` además de `data.length === 0`.
3. **Campos "array o string simple"**: en `get_match_events` y `get_match_lineups`, varios campos de
   incidentes (`incidentType`, `incidentPlayerName`, `incidentPlayerId`, `incidentCommentary`, etc.)
   vienen como array cuando el incidente involucra a más de un jugador/tipo (gol+asistencia,
   sustitución in/out) y como string simple cuando es un único jugador/tipo (tarjeta). El código
   cliente debe normalizar ambos casos a array antes de procesar.
4. **IDs no globales entre deportes**: el mismo nombre de equipo/país puede tener `id` distinto
   según el deporte (Boca Juniors tiene un `team_id` para soccer y otro completamente distinto para
   basketball/volleyball/futsal/beach soccer). Siempre resolver IDs dentro del contexto de un
   `sport` específico.
5. **Todos los valores numéricos vienen como string** en la mayoría de las tools (scores, stats,
   epoch times, ratings) excepto en `get_player_details.careers[].stats[].value` y algunos campos de
   `get_team_details` (`stadiumCapacity`) que sí vienen como número. Conviene no asumir tipo y
   parsear defensivamente.
6. **`flashscore_get_live` / `flashscore_get_live_odds` no admiten filtro por país o competición**:
   traen todo el universo de eventos en vivo del deporte pedido. Para casos de uso acotados (ej. "¿va
   ganando Boca ahora mismo?") conviene traer la lista completa una sola vez y filtrar en el backend
   por `homeParticipantIds`/`awayParticipantIds` conocidos, en vez de depender de un filtro del lado
   del servidor MCP que no existe.

## Tools documentadas: 15/15

Se invocaron y documentaron las 15 tools listadas en el objetivo:
`flashscore_list_sports`, `flashscore_list_countries`, `flashscore_list_competitions`,
`flashscore_list_competition_seasons`, `flashscore_get_competition_fixtures`,
`flashscore_get_competition_results`, `flashscore_get_competition_standings`,
`flashscore_get_match_stats`, `flashscore_get_match_events`, `flashscore_get_match_lineups`,
`flashscore_get_team_details`, `flashscore_get_player_details`, `flashscore_get_live`,
`flashscore_get_live_odds`, `flashscore_search`.

La única tool que no pudo inspeccionarse en detalle en su forma "llena" (con eventos en curso reales
con score y minuto) fue `flashscore_get_live` para `soccer`, porque el volumen de partidos
simultáneos en vivo/del día excedió el límite de tokens de una tool call en este entorno de
exploración; su estructura de campos se infirió igualmente a partir de una respuesta más chica
(`futsal`, con 2 eventos) y de los campos compartidos con `get_competition_fixtures`/`_results`, que
usan el mismo modelo de "evento".
