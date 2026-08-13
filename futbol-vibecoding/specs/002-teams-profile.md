# Spec 002 — `GET /api/teams/:id`

**Estado:** pendiente de implementación
**Alcance:** solo backend. No tocar `frontend/`.

---

## 1. Problema

La app muestra nombres de equipos en todos lados (partidos, alineaciones, tabla de
posiciones) pero no tiene ningún endpoint que devuelva información de un equipo:
estadio, país, director técnico y plantel. SportDB MCP expone `flashscore_get_team_details`
(1 sola llamada, barata y confiable) que trae exactamente eso.

Restricción descubierta: el tool MCP exige **`team_slug` + `team_id`** (verificado contra
el servidor real; sin `team_slug` devuelve error de validación). La app solo tiene
`team_id` (de matches/lineups/standings). El backend debe resolver el slug desde datos
que ya cachea: los partidos (`homeParticipantNameUrl`/`awayParticipantNameUrl` en
fixtures/results) y, como fallback, las standings crudas (`teamSlug`).

---

## 2. Contrato

### Request

```
GET /api/teams/:id
```

- `:id` — `team_id` de SportDB (ej. `hMrWAFH0`). Sin validación de formato: un id que no
  se resuelve en ninguna liga configurada devuelve 404.

### Response 200

```json
{
  "id": "hMrWAFH0",
  "name": "Boca Juniors",
  "slug": "boca-juniors",
  "logoUrl": "https://static.flashscore.com/res/image/data/h4UwH8Cr-pGZDw8HC.png",
  "country": "Argentina",
  "stadium": { "name": "Estadio Alberto J. Armando (Buenos Aires)", "capacity": 57200 },
  "coach": { "id": "abc123", "name": "Rodolfo Arruabarrena" },
  "squad": [
    { "id": "2e5J9jeK", "name": "Leandro Brey", "number": 12, "position": "Goalkeepers", "country": "Argentina" }
  ]
}
```

Reglas del DTO:

- `logoUrl` — `teamLogo` crudo, o `null` si no viene.
- `country` — `country.name` crudo, o `""` si no viene.
- `stadium.capacity` — `stadiumCapacity` crudo (en SportDB viene como número, no string),
  o `null` si no viene.
- `coach` — el jugador del plantel con `position === "Coach"` (puede haber 0 o 1; si no
  hay, `null`). El coach **no** aparece en `squad`.
- `squad` — todos los jugadores del plantel **sin duplicados** (un mismo jugador aparece
  en varios grupos de `squad[]` porque Flashscore separa el roster por torneo; dedupe por
  `player.id`, primera aparición gana). `number` es `parseInt(jerseyNumber, 10)` o `null`
  si no parsea. `position` y `country` crudos (`"Goalkeepers"`, `"Defenders"`,
  `"Midfielders"`, `"Forwards"`).

### Errores

| Código | Cuándo | Body |
|---|---|---|
| 404 | El `team_id` no se resuelve en ninguna liga configurada (ni en matches ni en standings) | `{ "error": "Team not found" }` |
| 502 | Falló alguna llamada al MCP de SportDB | `{ "error": "Failed to fetch team from SportDB" }` |

Todo error se loguea con `console.error(err)` antes de responder, igual que en
`backend/src/routes/standings.js`.

---

## 3. Archivos a crear o modificar

| Archivo | Acción |
|---|---|
| `backend/src/routes/teams.js` | **Crear.** Exporta `teamsRouter` |
| `backend/src/services/sportdb.js` | **Modificar.** Agregar `getTeamById`, `findTeamSlug`, `mapTeamDetails`, `flattenStandings` |
| `backend/tests/teams.test.js` | **Crear.** Obligatorio (ver §6) |
| `backend/src/app.js` | **Modificar.** Montar `app.use("/api/teams", teamsRouter)` |
| `backend/src/openapi.js` | **Modificar.** Documentar el endpoint y sus schemas |
| `backend/src/cache/index.js` | **Modificar.** Agregar `TEAM` al objeto `TTL` |

**No crear ningún otro archivo. No tocar `frontend/`.**

---

## 4. Implementación

### `backend/src/cache/index.js`

Agregar una entrada al objeto `TTL`:

```js
export const TTL = {
  SEASON: 12 * 60 * 60 * 1000,
  STANDINGS: 5 * 60 * 1000,
  MATCHES: 3 * 60 * 1000,
  TEAM: 5 * 60 * 1000,
};
```

### `backend/src/services/sportdb.js`

Agregar al final del archivo (todas las funciones que usa ya existen arriba:
`LEAGUES`, `getLeagueMatches`, `getActiveSeason`, `baseParams`, `wrap`, `callSportDbTool`).

```js
// --- Team profile ---

// Las standings vienen planas (Premier League: array de filas) o agrupadas por grupo
// (Liga Profesional: [{ roundType, roundTypeId, teams: [...] }]). Normalizar a filas planas.
function flattenStandings(standings) {
  if (!Array.isArray(standings)) return [];
  if (Array.isArray(standings[0]?.teams)) return standings.flatMap((group) => group.teams ?? []);
  return standings;
}

// flashscore_get_team_details exige team_slug + team_id, pero la app solo tiene team_id.
// El slug se resuelve desde datos que ya se cachean: primero los partidos de cada liga
// (fixtures+results traen homeParticipantNameUrl/awayParticipantNameUrl) y, si el equipo
// no aparece, las standings crudas (teamSlug). Devuelve null si no se encuentra.
async function findTeamSlug(teamId) {
  for (const league of LEAGUES) {
    const matches = await getLeagueMatches(league);
    for (const match of matches) {
      if (match.homeParticipantIds === teamId) return match.homeParticipantNameUrl;
      if (match.awayParticipantIds === teamId) return match.awayParticipantNameUrl;
    }
  }
  for (const league of LEAGUES) {
    const season = await getActiveSeason(league);
    const standings = await wrap(
      "standings-raw",
      { competitionId: league.competitionId, season },
      TTL.STANDINGS,
      async () => callSportDbTool("flashscore_get_competition_standings", { ...baseParams(league), season })
    );
    const row = flattenStandings(standings).find((r) => r.teamId === teamId);
    if (row?.teamSlug) return row.teamSlug;
  }
  return null;
}

function mapTeamDetails(data) {
  const seen = new Set();
  const squad = [];
  let coach = null;
  for (const group of data.squad ?? []) {
    for (const player of group.players ?? []) {
      if (seen.has(player.id)) continue;
      seen.add(player.id);
      const name = [player.firstName, player.lastName].filter(Boolean).join(" ");
      const number = parseInt(player.jerseyNumber, 10);
      if (player.position === "Coach") {
        coach = { id: player.id, name };
      } else {
        squad.push({
          id: player.id,
          name,
          number: Number.isNaN(number) ? null : number,
          position: player.position ?? "",
          country: player.countryName ?? "",
        });
      }
    }
  }
  return {
    id: data.id,
    name: data.teamName,
    slug: data.slug,
    logoUrl: data.teamLogo ?? null,
    country: data.country?.name ?? "",
    stadium: { name: data.stadiumName ?? "", capacity: data.stadiumCapacity ?? null },
    coach,
    squad,
  };
}

// Cachea el resultado (encontrado o no) por team_id, igual que getMatchById: sin esto,
// un id inexistente fuerza el recorrido completo de las 6 ligas por request.
export async function getTeamById(teamId) {
  return wrap("team", { teamId }, TTL.TEAM, async () => {
    const slug = await findTeamSlug(teamId);
    if (!slug) return null;
    const details = await callSportDbTool("flashscore_get_team_details", {
      team_slug: slug,
      team_id: teamId,
    });
    return mapTeamDetails(details);
  });
}
```

### `backend/src/routes/teams.js`

Sigue el patrón exacto de `backend/src/routes/matches.js` (ruta `/:id`):

```js
import { Router } from "express";
import { getTeamById } from "../services/sportdb.js";

export const teamsRouter = Router();

teamsRouter.get("/:id", async (req, res) => {
  try {
    const team = await getTeamById(req.params.id);
    if (!team) {
      return res.status(404).json({ error: "Team not found" });
    }
    res.json(team);
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: "Failed to fetch team from SportDB" });
  }
});
```

### `backend/src/app.js`

Agregar el import y montar junto a las demás rutas:

```js
import { teamsRouter } from "./routes/teams.js";
// ...
app.use("/api/standings", standingsRouter);
app.use("/api/teams", teamsRouter);
```

### `backend/src/openapi.js`

1. Agregar el path `/teams/{id}` (mismo estilo que `/matches/{id}`):

```js
"/teams/{id}": {
  get: {
    summary: "Perfil de un equipo (estadio, país, DT y plantel)",
    parameters: [{ $ref: "#/components/parameters/TeamId" }],
    responses: {
      200: {
        description: "Perfil del equipo",
        content: { "application/json": { schema: { $ref: "#/components/schemas/TeamProfile" } } },
      },
      404: { description: "El team_id no se encontró en ninguna liga configurada" },
      502: { description: "Falló la consulta al MCP de SportDB" },
    },
  },
},
```

2. Agregar el parámetro `TeamId` en `components.parameters`:

```js
TeamId: {
  name: "id",
  in: "path",
  required: true,
  description: "team_id de SportDB (ver GET /api/matches o /api/standings)",
  schema: { type: "string", example: "hMrWAFH0" },
},
```

3. Agregar el schema `TeamProfile` en `components.schemas`:

```js
TeamProfile: {
  type: "object",
  properties: {
    id: { type: "string", example: "hMrWAFH0" },
    name: { type: "string", example: "Boca Juniors" },
    slug: { type: "string", example: "boca-juniors" },
    logoUrl: { type: "string", nullable: true },
    country: { type: "string", example: "Argentina" },
    stadium: {
      type: "object",
      properties: {
        name: { type: "string", example: "Estadio Alberto J. Armando (Buenos Aires)" },
        capacity: { type: "integer", nullable: true, example: 57200 },
      },
    },
    coach: {
      type: "object",
      nullable: true,
      properties: {
        id: { type: "string", example: "abc123" },
        name: { type: "string", example: "Rodolfo Arruabarrena" },
      },
    },
    squad: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string", example: "2e5J9jeK" },
          name: { type: "string", example: "Leandro Brey" },
          number: { type: "integer", nullable: true, example: 12 },
          position: { type: "string", example: "Goalkeepers" },
          country: { type: "string", example: "Argentina" },
        },
      },
    },
  },
},
```

---

## 5. Riesgos conocidos

1. **Equipos que no se resuelven → 404.** El slug se busca en los partidos de la
   temporada activa (fixtures+results, página 1) y en las standings de las 6 ligas
   configuradas. Un equipo que jugó solo en temporadas anteriores, o en una competición
   no configurada, devuelve 404 aunque exista en SportDB. Es el comportamiento definido;
   no intentar resolver con `flashscore_search` (busca por nombre, no por id).

2. **Forma variable de las standings.** Premier League devuelve un array plano; Liga
   Profesional devuelve `[{ roundType, teams: [...] }]`. `flattenStandings` cubre ambas.
   Si aparece una tercera forma, hay que extenderla. **No tocar `getStandings`** (el
   endpoint existente): es un bug preexistente que no maneja la forma agrupada, pero la
   resolución de slug usa standings crudas y no se ve afectada.

3. **Latencia en frío.** Peor caso (cache vacía + id inexistente): ~19 llamadas MCP
   (12 de matches + 6 de standings + 1 de team_details) ≈ 7s con el throttle de 350ms.
   Mitigado por el cache (matches 3 min, standings 5 min, team 5 min) y porque el
   resultado "no encontrado" también se cachea.

4. **Dedupe del plantel.** Un jugador puede aparecer en varios grupos de `squad[]`
   (liga, copa nacional, copas internacionales). Se deduplica por `player.id` y gana la
   primera aparición. Si los datos del jugador difieren entre grupos (raro), el primero
   manda.

---

## 6. Tests — `backend/tests/teams.test.js`

Obligatorio: el hook `.claude/hooks/backend-tests.sh` bloquea si falta el test de alguna
ruta o si `npm test` falla.

Vitest, mismo estilo que `backend/tests/standings.test.js`. **Mockear
`../src/mcp/client.js`** — los tests no pueden llamar al MCP real.

Casos mínimos (mock de `callSportDbTool` con `mockImplementation` por tool):

1. **Happy path vía matches** — `flashscore_get_competition_results` devuelve un partido
   con `homeParticipantIds: "hMrWAFH0"` y `homeParticipantNameUrl: "boca-juniors"`;
   `flashscore_get_team_details` devuelve el objeto de §2 (con un jugador y un coach en
   `squad`). Assert: 200, body igual al DTO de §2 (coach separado, squad sin coach), y
   que `flashscore_get_team_details` se llamó con `{ team_slug: "boca-juniors", team_id: "hMrWAFH0" }`.
2. **Fallback a standings (forma agrupada)** — los matches no contienen al equipo;
   `flashscore_get_competition_standings` devuelve
   `[{ roundType: "Group A", teams: [{ teamId: "hMrWAFH0", teamSlug: "boca-juniors", ... }] }]`.
   Assert: 200 y `body.id === "hMrWAFH0"`.
3. **404** — ningún match ni standings contienen al id. Assert: 404 y
   `{ error: "Team not found" }`.
4. **502** — `callSportDbTool.mockRejectedValue(new Error("boom"))`. Assert: 502.
5. **Cache** — dos requests al mismo id; `flashscore_get_team_details` se llama una sola
   vez (contar `mock.calls` filtrados por tool).

---

## 7. Criterios de aceptación

- [ ] `cd backend && npm test` pasa, incluidos los tests nuevos
- [ ] `GET /api/teams/hMrWAFH0` responde 200 con el DTO de §2 (con la key de SportDB configurada)
- [ ] `GET /api/teams/nonexistent` responde 404 con `{ "error": "Team not found" }`
- [ ] `/api-docs` muestra `/teams/{id}` documentado
- [ ] `frontend/` no tiene ni un cambio
- [ ] No se crearon archivos fuera de la lista de §3