import { useMemo, useState } from "react"
import { CalendarDays, Radio } from "lucide-react"
import type { Match } from "@/types/football"
import { useMatchesByDate } from "@/hooks/useMatches"
import { buildDateWindow } from "@/lib/date"
import { DateSelector } from "@/components/match/DateSelector"
import { FilterChips, type MatchFilter } from "@/components/match/FilterChips"
import { CompetitionSection } from "@/components/match/CompetitionSection"
import { MatchCardSkeleton } from "@/components/match/MatchCard"
import { EmptyState, ErrorState } from "@/components/ui/States"

function groupByCompetition(matches: Match[]) {
  const map = new Map<string, { name: string; country?: string; logoUrl?: string | null; matches: Match[] }>()
  for (const m of matches) {
    const existing = map.get(m.competition.id)
    if (existing) existing.matches.push(m)
    else
      map.set(m.competition.id, {
        name: m.competition.name,
        country: m.competition.country,
        logoUrl: m.competition.logoUrl,
        matches: [m],
      })
  }
  return [...map.values()]
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
    <div className="flex flex-col gap-6">
      {/* Page heading */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Matches
          </h1>
          <p className="mt-1 text-sm text-muted">
            Live scores, fixtures and results across every competition.
          </p>
        </div>
        {liveCount > 0 && (
          <span className="hidden shrink-0 items-center gap-2 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary border border-primary/25 sm:inline-flex">
            <Radio className="h-4 w-4" />
            {liveCount} live
          </span>
        )}
      </div>

      <DateSelector value={date} onChange={setDate} />
      <FilterChips value={filter} onChange={setFilter} />

      {/* Content */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <MatchCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : grouped.length === 0 ? (
        <EmptyState
          icon={filter === "favorites" ? undefined : <CalendarDays className="h-6 w-6" />}
          title={
            filter === "all"
              ? "No matches for this day"
              : `No ${filter} matches`
          }
          description={
            filter === "favorites"
              ? "Tap the star on any match to keep an eye on it here."
              : "Pick another date or filter to see more fixtures."
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          {grouped.map((group, i) => (
            <CompetitionSection
              key={i}
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
