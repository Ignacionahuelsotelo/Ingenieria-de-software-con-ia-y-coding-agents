/**
 * Match & competition service. These functions describe the backend REST
 * contract. They are intentionally NOT mocked — they call the real endpoints.
 * Until the backend is wired up, hooks surface empty/error states in the UI.
 */

import { apiGet } from "./apiClient"
import type { Competition, Match, MatchEvent, MatchStatistic, TeamLineup } from "@/types/football"

/** GET /matches?date=YYYY-MM-DD */
export function fetchMatchesByDate(date: string, signal?: AbortSignal): Promise<Match[]> {
  return apiGet<Match[]>(`/matches?date=${encodeURIComponent(date)}`, signal)
}

/** GET /matches/:id */
export function fetchMatchById(id: string, signal?: AbortSignal): Promise<Match> {
  return apiGet<Match>(`/matches/${encodeURIComponent(id)}`, signal)
}

/** GET /matches/:id/events */
export function fetchMatchEvents(id: string, signal?: AbortSignal): Promise<MatchEvent[]> {
  return apiGet<MatchEvent[]>(`/matches/${encodeURIComponent(id)}/events`, signal)
}

/** GET /matches/:id/lineups */
export function fetchMatchLineups(
  id: string,
  signal?: AbortSignal,
): Promise<{ home: TeamLineup; away: TeamLineup }> {
  return apiGet(`/matches/${encodeURIComponent(id)}/lineups`, signal)
}

/** GET /matches/:id/statistics */
export function fetchMatchStatistics(id: string, signal?: AbortSignal): Promise<MatchStatistic[]> {
  return apiGet<MatchStatistic[]>(`/matches/${encodeURIComponent(id)}/statistics`, signal)
}

/** GET /competitions */
export function fetchCompetitions(signal?: AbortSignal): Promise<Competition[]> {
  return apiGet<Competition[]>(`/competitions`, signal)
}
