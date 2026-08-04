// Ligas soportadas por la app. Esto es configuración (qué ligas mostramos),
// no datos de fútbol: nombres/resultados/tablas siempre se piden en vivo al MCP.
export const LEAGUES = [
  {
    slug: "premier-league",
    name: "Premier League",
    country: "England",
    sport: "soccer",
    countryId: "198",
    competitionId: "dYlOSQOD",
  },
  {
    slug: "fa-community-shield",
    name: "FA Community Shield",
    country: "England",
    sport: "soccer",
    countryId: "198",
    competitionId: "AsSx0P9K",
  },
  {
    slug: "liga-profesional",
    name: "Liga Profesional",
    country: "Argentina",
    sport: "soccer",
    countryId: "22",
    competitionId: "naYhNOaA",
  },
  {
    slug: "copa-argentina",
    name: "Copa Argentina",
    country: "Argentina",
    sport: "soccer",
    countryId: "22",
    competitionId: "OWsjCTcG",
  },
  {
    slug: "champions-league",
    name: "Champions League",
    country: "Europe",
    sport: "soccer",
    countryId: "6",
    competitionId: "xGrwqq16",
  },
  {
    slug: "europa-league",
    name: "Europa League",
    country: "Europe",
    sport: "soccer",
    countryId: "6",
    competitionId: "ClDjv3V5",
  },
];

export function findLeague(slug) {
  return LEAGUES.find((league) => league.slug === slug);
}
