import type { LineupPlayer, TeamLineup } from "@/types/football"
import { Skeleton } from "@/components/ui/Skeleton"
import { EmptyState, ErrorState } from "@/components/ui/States"

function PlayerRow({ player }: { player: LineupPlayer }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-muted border-hairline">
        {player.number || "-"}
      </span>
      <span className="truncate text-sm text-foreground">{player.name}</span>
      {player.position && <span className="ml-auto shrink-0 text-xs text-muted">{player.position}</span>}
    </div>
  )
}

function TeamLineupColumn({ title, lineup }: { title: string; lineup: TeamLineup }) {
  return (
    <div className="flex-1">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {lineup.formation && (
          <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-muted border-hairline">
            {lineup.formation}
          </span>
        )}
      </div>
      <div className="flex flex-col">
        {lineup.starters.map((player) => (
          <PlayerRow key={player.id} player={player} />
        ))}
      </div>
      {lineup.substitutes.length > 0 && (
        <>
          <p className="mb-1.5 mt-4 text-xs font-semibold uppercase tracking-wide text-muted">
            Substitutes
          </p>
          <div className="flex flex-col">
            {lineup.substitutes.map((player) => (
              <PlayerRow key={player.id} player={player} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function MatchLineups({
  lineups,
  isLoading,
  error,
  onRetry,
}: {
  lineups: { home: TeamLineup; away: TeamLineup } | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((j) => (
              <Skeleton key={j} className="h-6 w-full" />
            ))}
          </div>
        ))}
      </div>
    )
  }

  if (error) return <ErrorState onRetry={onRetry} />

  if (!lineups || (lineups.home.starters.length === 0 && lineups.away.starters.length === 0)) {
    return <EmptyState title="Lineups not available" description="Lineups are published closer to kickoff." />
  }

  return (
    <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
      <TeamLineupColumn title="Home" lineup={lineups.home} />
      <TeamLineupColumn title="Away" lineup={lineups.away} />
    </div>
  )
}
