export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "futbol-vibecoding API",
    version: "0.1.0",
    description:
      "API de resultados de fútbol. Los datos salen en vivo del MCP de SportDB (Flashscore); el backend solo cachea y simplifica la forma de la respuesta.",
  },
  servers: [{ url: "/api" }],
  paths: {
    "/leagues": {
      get: {
        summary: "Ligas soportadas por la app",
        responses: {
          200: {
            description: "Lista de ligas",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/League" } },
              },
            },
          },
        },
      },
    },
    "/matches/river-boca": {
      get: {
        summary: "Partidos de River Plate y/o Boca Juniors (Liga Profesional + Copa Argentina)",
        responses: {
          200: {
            description: "Partidos donde jugó River, Boca, o ambos (el clásico), más recientes primero",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    allOf: [
                      { $ref: "#/components/schemas/Match" },
                      {
                        type: "object",
                        properties: {
                          league: { type: "string", example: "liga-profesional" },
                        },
                      },
                    ],
                  },
                },
              },
            },
          },
          502: { description: "Falló la consulta al MCP de SportDB" },
        },
      },
    },
    "/matches": {
      get: {
        summary: "Resultados recientes de una liga (temporada activa), o partidos por fecha",
        description:
          "Pasar `date` para traer partidos de todas las ligas configuradas ese día, o `league` " +
          "para los resultados recientes de la temporada activa de una liga puntual.",
        parameters: [
          {
            name: "date",
            in: "query",
            required: false,
            description: "Fecha (YYYY-MM-DD). Si se pasa, ignora `league` y agrega todas las ligas.",
            schema: { type: "string", example: "2026-08-16" },
          },
          {
            name: "league",
            in: "query",
            required: false,
            description: "Slug de la liga (ver GET /api/leagues). Requerido si no se pasa `date`.",
            schema: { type: "string", example: "premier-league" },
          },
        ],
        responses: {
          200: {
            description: "Partidos jugados de la temporada activa, o del día pedido",
            content: {
              "application/json": {
                schema: {
                  type: "array",
                  items: {
                    oneOf: [{ $ref: "#/components/schemas/Match" }, { $ref: "#/components/schemas/FullMatch" }],
                  },
                },
              },
            },
          },
          400: { description: "Falta `league`/`date`, o el slug de liga no existe" },
          502: { description: "Falló la consulta al MCP de SportDB" },
        },
      },
    },
    "/matches/{id}": {
      get: {
        summary: "Partido puntual por id, buscado entre las ligas configuradas (temporada activa)",
        parameters: [{ $ref: "#/components/parameters/MatchId" }],
        responses: {
          200: {
            description: "Partido encontrado",
            content: { "application/json": { schema: { $ref: "#/components/schemas/FullMatch" } } },
          },
          404: { description: "No se encontró el partido en ninguna liga configurada" },
          502: { description: "Falló la consulta al MCP de SportDB" },
        },
      },
    },
    "/matches/{id}/events": {
      get: {
        summary: "Goles, tarjetas y sustituciones de un partido",
        parameters: [{ $ref: "#/components/parameters/MatchId" }],
        responses: {
          200: {
            description: "Incidentes del partido, en orden cronológico",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/MatchEvent" } },
              },
            },
          },
          502: { description: "Falló la consulta al MCP de SportDB" },
        },
      },
    },
    "/matches/{id}/lineups": {
      get: {
        summary: "Alineaciones (titulares y suplentes) de ambos equipos",
        parameters: [{ $ref: "#/components/parameters/MatchId" }],
        responses: {
          200: {
            description: "Alineaciones home/away",
            content: { "application/json": { schema: { $ref: "#/components/schemas/Lineups" } } },
          },
          502: { description: "Falló la consulta al MCP de SportDB" },
        },
      },
    },
    "/matches/{id}/statistics": {
      get: {
        summary: "Estadísticas del partido (posesión, tiros, xG, etc.)",
        parameters: [{ $ref: "#/components/parameters/MatchId" }],
        responses: {
          200: {
            description: "Estadísticas comparadas home/away",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/MatchStatistic" } },
              },
            },
          },
          502: { description: "Falló la consulta al MCP de SportDB" },
        },
      },
    },
    "/competitions": {
      get: {
        summary: "Competiciones soportadas, con su temporada activa",
        responses: {
          200: {
            description: "Lista de competiciones",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/Competition" } },
              },
            },
          },
          502: { description: "Falló la consulta al MCP de SportDB" },
        },
      },
    },
    "/standings": {
      get: {
        summary: "Tabla de posiciones de una liga (temporada activa)",
        parameters: [
          {
            name: "league",
            in: "query",
            required: true,
            description: "Slug de la liga (ver GET /api/leagues)",
            schema: { type: "string", example: "premier-league" },
          },
        ],
        responses: {
          200: {
            description: "Tabla de posiciones",
            content: {
              "application/json": {
                schema: { type: "array", items: { $ref: "#/components/schemas/StandingRow" } },
              },
            },
          },
          400: { description: "Falta `league` o el slug no existe" },
          502: { description: "Falló la consulta al MCP de SportDB" },
        },
      },
    },
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
  },
  components: {
    parameters: {
      MatchId: {
        name: "id",
        in: "path",
        required: true,
        description: "eventId del partido (ver GET /api/matches)",
        schema: { type: "string", example: "KGB564l2" },
      },
      TeamId: {
        name: "id",
        in: "path",
        required: true,
        description: "team_id de SportDB (ver GET /api/matches o /api/standings)",
        schema: { type: "string", example: "hMrWAFH0" },
      },
    },
    schemas: {
      Competition: {
        type: "object",
        properties: {
          id: { type: "string", example: "premier-league" },
          name: { type: "string", example: "Premier League" },
          country: { type: "string", example: "England" },
          season: { type: "string", example: "2025-2026" },
          logoUrl: { type: "string", nullable: true },
        },
      },
      Team: {
        type: "object",
        properties: {
          id: { type: "string", example: "hA1Zm19f" },
          name: { type: "string", example: "Arsenal" },
        },
      },
      FullMatch: {
        type: "object",
        properties: {
          id: { type: "string", example: "KGB564l2" },
          competition: { $ref: "#/components/schemas/Competition" },
          status: { type: "string", enum: ["live", "finished", "upcoming"] },
          kickoff: { type: "string", format: "date-time" },
          statusLabel: { type: "string", nullable: true, example: "2H" },
          minute: { type: "integer", nullable: true },
          stadium: { type: "string", nullable: true },
          homeTeam: { $ref: "#/components/schemas/Team" },
          awayTeam: { $ref: "#/components/schemas/Team" },
          score: {
            type: "object",
            properties: {
              home: { type: "integer", nullable: true },
              away: { type: "integer", nullable: true },
            },
          },
        },
      },
      MatchEvent: {
        type: "object",
        properties: {
          id: { type: "string", example: "baWbmWGt" },
          minute: { type: "integer", example: 4 },
          type: { type: "string", enum: ["goal", "yellow", "red", "sub", "var"] },
          side: { type: "string", enum: ["home", "away"] },
          player: { type: "string", example: "Ekitike H." },
          detail: { type: "string", nullable: true },
        },
      },
      LineupPlayer: {
        type: "object",
        properties: {
          id: { type: "string", example: "Stf4BYFn" },
          number: { type: "integer", example: 10 },
          name: { type: "string", example: "Eze E." },
          position: { type: "string", example: "(G)" },
        },
      },
      TeamLineup: {
        type: "object",
        properties: {
          formation: { type: "string", example: "1-3-4-2-1" },
          starters: { type: "array", items: { $ref: "#/components/schemas/LineupPlayer" } },
          substitutes: { type: "array", items: { $ref: "#/components/schemas/LineupPlayer" } },
        },
      },
      Lineups: {
        type: "object",
        properties: {
          home: { $ref: "#/components/schemas/TeamLineup" },
          away: { $ref: "#/components/schemas/TeamLineup" },
        },
      },
      MatchStatistic: {
        type: "object",
        properties: {
          label: { type: "string", example: "Ball possession" },
          home: { type: "number", example: 41 },
          away: { type: "number", example: 59 },
          isPercent: { type: "boolean" },
        },
      },
      League: {
        type: "object",
        properties: {
          slug: { type: "string", example: "premier-league" },
          name: { type: "string", example: "Premier League" },
          country: { type: "string", example: "England" },
        },
      },
      MatchSide: {
        type: "object",
        properties: {
          name: { type: "string", example: "Arsenal" },
          teamId: { type: "string", example: "hA1Zm19f" },
          score: { type: "string", example: "2" },
        },
      },
      Match: {
        type: "object",
        properties: {
          id: { type: "string", example: "KGB564l2" },
          date: { type: "string", format: "date-time" },
          round: { type: "string", nullable: true, example: "Round 2" },
          home: { $ref: "#/components/schemas/MatchSide" },
          away: { $ref: "#/components/schemas/MatchSide" },
          winner: { type: "string", enum: ["home", "away", "draw"] },
        },
      },
      StandingRow: {
        type: "object",
        properties: {
          rank: { type: "integer", example: 1 },
          teamId: { type: "string", example: "hA1Zm19f" },
          teamName: { type: "string", example: "Arsenal" },
          played: { type: "integer" },
          wins: { type: "integer" },
          draws: { type: "integer" },
          losses: { type: "integer" },
          goalsFor: { type: "integer" },
          goalsAgainst: { type: "integer" },
          goalDiff: { type: "integer" },
          points: { type: "integer" },
          form: {
            type: "array",
            items: { type: "string", enum: ["w", "d", "l", "upcoming"] },
            description: "Últimos resultados del equipo, más reciente primero",
          },
        },
      },
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
    },
  },
};
