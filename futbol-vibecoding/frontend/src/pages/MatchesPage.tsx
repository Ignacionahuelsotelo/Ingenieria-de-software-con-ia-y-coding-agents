import { useMemo, useState } from "react"
import { AlertTriangle, CalendarX2, RefreshCw } from "lucide-react"
import type { Match } from "@/types/football"
import { useMatchesByDate } from "@/hooks/useMatches"
import { buildDateWindow } from "@/lib/date"
import { DateSelector } from "@/components/match/DateSelector"
import { FilterChips, type MatchFilter } from "@/components/match/FilterChips"
import { CompetitionSection } from "@/components/match/CompetitionSection"
import { MatchCardSkeleton } from "@/components/match/MatchCard"

function groupByCompetition(matches: Match[]) {
  const map = new Map<
    string,
    { id: string; name: string; country?: string; logoUrl?: string | null; matches: Match[] }
  >()
  for (const m of matches) {
    const existing = map.get(m.competition.id)
    if (existing) existing.matches.push(m)
    else
      map.set(m.competition.id, {
        id: m.competition.id,
        name: m.competition.name,
        country: m.competition.country,
        logoUrl: m.competition.logoUrl,
        matches: [m],
      })
  }
  return [...map.values()]
}

const EMPTY_COPY: Record<MatchFilter, { title: string; description: string }> = {
  all: {
    title: "NO FIXTURES FOR THIS DAY",
    description: "Pick another date on the strip above to see more fixtures.",
  },
  live: {
    title: "NOTHING LIVE RIGHT NOW",
    description: "No matches are being played at this moment on this date.",
  },
  finished: {
    title: "NO RESULTS YET",
    description: "Nothing has finished on this date so far.",
  },
  upcoming: {
    title: "NO FIXTURES SCHEDULED",
    description: "There's nothing left to kick off on this date.",
  },
  favorites: {
    title: "NO STARRED MATCHES",
    description: "Press the star on any match to keep it here.",
  },
}

export function MatchesPage() {
  const today = useMemo(() => buildDateWindow().find((d) => d.isToday)?.iso ?? "", [])
  const [date, setDate] = useState(today)
  const [filter, setFilter] = useState<MatchFilter>("all")
  const [favorites, setFavorites] = useState<Set<string>>(new Set())

  const { data, isLoading, error, reload } = useMatchesByDate(date)

  const toggleFavorite = (id: string) =>
    setFavorites((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const matches = useMemo(() => {
    const list = (data ?? []).map((m) => ({ ...m, isFavorite: favorites.has(m.id) }))
    switch (filter) {
      case "live":
        return list.filter((m) => m.status === "live")
      case "finished":
        return list.filter((m) => m.status === "finished")
      case "upcoming":
        return list.filter((m) => m.status === "upcoming")
      case "favorites":
        return list.filter((m) => m.isFavorite)
      default:
        return list
    }
  }, [data, filter, favorites])

  const grouped = useMemo(() => groupByCompetition(matches), [matches])
  const liveCount = (data ?? []).filter((m) => m.status === "live").length

  return (
    <div className="flex flex-col gap-4 font-tx-sans">
      {/* Page header — teletext page banner */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-2 border-tx-line bg-tx-panel px-4 py-3">
        <div>
          <h1 className="font-tx-mono text-xl font-extrabold uppercase tracking-[0.08em] text-tx-ink sm:text-2xl">
            Results
          </h1>
          <p className="mt-0.5 text-xs text-tx-muted sm:text-sm">
            Live scores, fixtures and results — every competition, one page.
          </p>
        </div>
        <div className="flex items-center gap-2 font-tx-mono text-xs font-bold uppercase tracking-[0.1em]">
          <span className="border-2 border-tx-line px-2 py-1 text-tx-muted">P&middot;101</span>
          {liveCount > 0 && (
            <span className="flex items-center gap-1.5 border-2 border-tx-red bg-tx-red/10 px-2 py-1 text-tx-red">
              <span className="h-1.5 w-1.5 shrink-0 bg-tx-red animate-live-pulse" />
              {liveCount} live
            </span>
          )}
        </div>
      </div>

      <DateSelector value={date} onChange={setDate} />
      <FilterChips value={filter} onChange={setFilter} />

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col border-2 border-tx-line">
          {[0, 1, 2, 3].map((i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <div className="flex flex-col items-center gap-3 border-2 border-tx-red bg-tx-red/[0.06] px-6 py-14 text-center">
          <AlertTriangle className="h-6 w-6 text-tx-red" aria-hidden="true" />
          <h3 className="font-tx-mono text-sm font-extrabold uppercase tracking-[0.1em] text-tx-ink">
            Signal lost
          </h3>
          <p className="max-w-sm text-sm text-tx-muted">
            We couldn&apos;t reach the football service. This is expected until the backend is
            connected.
          </p>
          <button
            onClick={reload}
            className="mt-1 flex items-center gap-2 border-2 border-tx-red px-3.5 py-2 font-tx-mono text-xs font-bold uppercase tracking-[0.1em] text-tx-red transition-colors hover:bg-tx-red hover:text-tx-bg focus-visible:outline-tx-gold"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>
        </div>
      ) : grouped.length === 0 ? (
        <div className="flex flex-col items-center gap-3 border-2 border-tx-line bg-tx-panel px-6 py-14 text-center">
          <CalendarX2 className="h-6 w-6 text-tx-muted" aria-hidden="true" />
          <h3 className="font-tx-mono text-sm font-extrabold uppercase tracking-[0.1em] text-tx-ink">
            {EMPTY_COPY[filter].title}
          </h3>
          <p className="max-w-sm text-sm text-tx-muted">{EMPTY_COPY[filter].description}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {grouped.map((group) => (
            <CompetitionSection
              key={group.id}
              competitionId={group.id}
              competitionName={group.name}
              country={group.country}
              logoUrl={group.logoUrl}
              matches={group.matches}
              onToggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  )
}
