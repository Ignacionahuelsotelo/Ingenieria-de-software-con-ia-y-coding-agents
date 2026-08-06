import { useNavigate } from "react-router-dom"
import { Star } from "lucide-react"
import type { Match, Team } from "@/types/football"
import { Avatar } from "@/components/ui/Avatar"
import { LiveBadge } from "@/components/ui/Badge"
import { cn, teamInitials } from "@/lib/utils"
import { formatKickoff } from "@/lib/date"

interface MatchCardProps {
  match: Match
  onToggleFavorite?: (id: string) => void
}

function TeamRow({
  team,
  score,
  isWinner,
  dim,
}: {
  team: Team
  score: number | null
  isWinner: boolean
  dim: boolean
}) {
  return (
    <div className="flex items-center gap-3">
      <Avatar
        src={team.logoUrl}
        alt={team.name}
        fallback={teamInitials(team.name)}
        shape="squircle"
        size="sm"
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-[15px]",
          isWinner ? "font-semibold text-foreground" : dim ? "text-muted" : "text-foreground",
        )}
      >
        {team.name}
      </span>
      <span
        className={cn(
          "w-6 text-right font-mono text-lg tabular-nums",
          score === null ? "text-muted" : isWinner ? "text-foreground" : "text-foreground/80",
        )}
      >
        {score ?? "-"}
      </span>
    </div>
  )
}

export function MatchCard({ match, onToggleFavorite }: MatchCardProps) {
  const navigate = useNavigate()
  const { status, score, homeTeam, awayTeam } = match

  const homeWin = status === "finished" && (score.home ?? 0) > (score.away ?? 0)
  const awayWin = status === "finished" && (score.away ?? 0) > (score.home ?? 0)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/match/${match.id}`)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          navigate(`/match/${match.id}`)
        }
      }}
      className={cn(
        "group relative flex cursor-pointer items-stretch gap-4 rounded-2xl bg-card/80 p-4 border-hairline",
        "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]",
        "hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-card hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.7)]",
      )}
    >
      {/* Live accent bar */}
      {status === "live" && (
        <span className="absolute inset-y-3 left-0 w-1 rounded-full bg-primary animate-live-pulse" />
      )}

      {/* Status column */}
      <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1 border-r border-white/[0.06] pr-4 text-center">
        {status === "live" ? (
          <>
            <span className="font-mono text-sm font-semibold text-primary">
              {match.statusLabel ?? `${match.minute ?? 0}'`}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Live
            </span>
          </>
        ) : status === "finished" ? (
          <span className="text-xs font-semibold uppercase tracking-wide text-muted">
            {match.statusLabel ?? "FT"}
          </span>
        ) : (
          <>
            <span className="font-mono text-sm font-semibold text-foreground">
              {formatKickoff(match.kickoff)}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-muted">
              Kickoff
            </span>
          </>
        )}
      </div>

      {/* Teams + scores */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
        <TeamRow team={homeTeam} score={score.home} isWinner={homeWin} dim={awayWin} />
        <TeamRow team={awayTeam} score={score.away} isWinner={awayWin} dim={homeWin} />
      </div>

      {/* Favorite */}
      <button
        aria-label={match.isFavorite ? "Remove from favorites" : "Add to favorites"}
        onClick={(e) => {
          e.stopPropagation()
          onToggleFavorite?.(match.id)
        }}
        className="flex w-6 shrink-0 items-center justify-center self-center text-muted transition-colors hover:text-secondary"
      >
        <Star
          className={cn(
            "h-4 w-4 transition-all",
            match.isFavorite && "fill-secondary text-secondary",
          )}
        />
      </button>
    </div>
  )
}

/** Loading placeholder matching MatchCard footprint. */
export function MatchCardSkeleton() {
  return (
    <div className="flex items-stretch gap-4 rounded-2xl bg-card/80 p-4 border-hairline">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1.5 border-r border-white/[0.06] pr-4">
        <div className="h-4 w-8 rounded bg-white/[0.05]" />
        <div className="h-2.5 w-10 rounded bg-white/[0.04]" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-white/[0.05]" />
            <div className="h-3.5 w-32 rounded bg-white/[0.05]" />
          </div>
        ))}
      </div>
    </div>
  )
}

export { LiveBadge }
