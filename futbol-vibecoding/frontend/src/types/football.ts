/**
 * Domain types for the football live-scores app.
 *
 * These describe the shape of data the frontend EXPECTS from the backend REST
 * endpoints (which proxy the SportDB MCP server + AI endpoint). No data is
 * mocked here — components render empty/loading states until real data arrives.
 */

export type MatchStatus = "live" | "finished" | "upcoming" | "cancelled"

export interface Team {
  id: string
  name: string
  shortName?: string
  /** Optional crest URL. When absent, UI renders initials placeholder. */
  logoUrl?: string | null
}

export interface Competition {
  id: string
  name: string
  country: string
  /** e.g. "2025/26" */
  season?: string
  logoUrl?: string | null
}

export interface Score {
  home: number | null
  away: number | null
}

export interface Match {
  id: string
  competition: Pick<Competition, "id" | "name" | "logoUrl" | "country">
  status: MatchStatus
  /** ISO 8601 kickoff timestamp */
  kickoff: string
  /** e.g. "90+4'", "HT", "FT" — backend-provided display string */
  statusLabel?: string
  /** Live clock in minutes, when applicable */
  minute?: number | null
  stadium?: string | null
  homeTeam: Team
  awayTeam: Team
  score: Score
  isFavorite?: boolean
}

export type MatchEventType = "goal" | "yellow" | "red" | "sub" | "var"

export interface MatchEvent {
  id: string
  minute: number
  type: MatchEventType
  side: "home" | "away"
  player: string
  detail?: string
}

export interface LineupPlayer {
  id: string
  number: number
  name: string
  position: string
}

export interface TeamLineup {
  formation: string
  starters: LineupPlayer[]
  substitutes: LineupPlayer[]
}

export interface MatchStatistic {
  label: string
  home: number
  away: number
  /** whether values are percentages */
  isPercent?: boolean
}

export type ChatRole = "user" | "assistant"

export interface ChatMessage {
  id: string
  role: ChatRole
  content: string
  createdAt: number
}

/** Generic async resource state used across hooks. */
export interface AsyncState<T> {
  data: T | null
  isLoading: boolean
  error: string | null
}
