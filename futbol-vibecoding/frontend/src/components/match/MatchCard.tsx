import { useNavigate } from "react-router-dom"
import { Star } from "lucide-react"
import type { Match, Team } from "@/types/football"
import { Avatar } from "@/components/ui/Avatar"
import { cn, teamInitials } from "@/lib/utils"
import { formatKickoff } from "@/lib/date"

interface MatchCardProps {
  match: Match
  onToggleFavorite?: (id: string) => void
  /** Draw the top divider — false for the first row in a section. */
  divider?: boolean
  /** Alternate row shading, teletext-grid style. */
  zebra?: boolean
}

const DOTS = "·".repeat(80)

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
    <div className="flex min-w-0 items-center gap-2.5">
      <Avatar
        src={team.logoUrl}
        alt={team.name}
        fallback={teamInitials(team.name)}
        shape="square"
        size="sm"
        className="border-2 border-tx-line bg-tx-bg"
      />
      <span
        className={cn(
          "shrink-0 truncate font-tx-sans text-[15px] leading-tight",
          isWinner ? "font-bold text-tx-ink" : dim ? "text-tx-muted" : "font-medium text-tx-ink",
        )}
        style={{ maxWidth: "min(60%, 220px)" }}
      >
        {team.name}
      </span>
      <span aria-hidden="true" className="tx-leader select-none text-sm">
        {DOTS}
      </span>
      <span
        className={cn(
          "w-6 shrink-0 text-right font-tx-mono text-lg font-bold tabular-nums",
          score === null ? "text-tx-muted" : isWinner ? "text-tx-gold" : "text-tx-ink/70",
        )}
      >
        {score ?? "–"}
      </span>
    </div>
  )
}

export function MatchCard({ match, onToggleFavorite, divider = true, zebra = false }: MatchCardProps) {
  const navigate = useNavigate()
  const { status, score, homeTeam, awayTeam } = match

  const homeWin = status === "finished" && (score.home ?? 0) > (score.away ?? 0)
  const awayWin = status === "finished" && (score.away ?? 0) > (score.home ?? 0)
  const isLive = status === "live"

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
        "group relative flex cursor-pointer items-stretch gap-0 outline-none",
        "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tx-gold",
        divider && "border-t-2 border-tx-line",
        zebra ? "bg-tx-panel" : "bg-tx-bg",
        "hover:bg-tx-line/30",
      )}
    >
      {/* Status column */}
      <div
        className={cn(
          "flex w-16 shrink-0 flex-col items-center justify-center gap-1 border-r-2 border-tx-line py-3 text-center",
          isLive && "bg-tx-gold/10",
        )}
      >
        {isLive ? (
          <>
            <span className="font-tx-mono text-sm font-bold tabular-nums text-tx-gold">
              {match.statusLabel ?? `${match.minute ?? 0}'`}
            </span>
            <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.1em] text-tx-gold">
              <span className="h-1.5 w-1.5 shrink-0 bg-tx-gold animate-live-pulse" />
              Live
            </span>
          </>
        ) : status === "finished" ? (
          <span className="font-tx-mono text-xs font-bold uppercase tracking-[0.1em] text-tx-muted">
            {match.statusLabel ?? "FT"}
          </span>
        ) : status === "cancelled" ? (
          <span className="font-tx-mono text-xs font-bold uppercase tracking-[0.1em] text-tx-red">
            {match.statusLabel ?? "Cancelled"}
          </span>
        ) : (
          <>
            <span className="font-tx-mono text-sm font-bold tabular-nums text-tx-ink">
              {formatKickoff(match.kickoff)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-tx-muted">
              Kickoff
            </span>
          </>
        )}
      </div>

      {/* Teams + scores */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 px-3 py-2.5">
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
        className={cn(
          "flex w-10 shrink-0 items-center justify-center self-stretch border-l-2 border-tx-line text-tx-muted transition-colors hover:text-tx-red focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-tx-gold",
          match.isFavorite && "bg-tx-red/10 text-tx-red",
        )}
      >
        <Star className={cn("h-4 w-4", match.isFavorite && "fill-tx-red text-tx-red")} />
      </button>
    </div>
  )
}

/** Loading placeholder matching MatchCard footprint. */
export function MatchCardSkeleton() {
  return (
    <div className="flex items-stretch border-t-2 border-tx-line first:border-t-0">
      <div className="flex w-16 shrink-0 flex-col items-center justify-center gap-1.5 border-r-2 border-tx-line py-3">
        <div className="h-3.5 w-8 bg-tx-line/60" />
        <div className="h-2.5 w-10 bg-tx-line/40" />
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3 px-3 py-2.5">
        {[0, 1].map((i) => (
          <div key={i} className="flex items-center gap-2.5">
            <div className="h-8 w-8 bg-tx-line/40" />
            <div className="h-3.5 w-32 bg-tx-line/50" />
          </div>
        ))}
      </div>
      <div className="w-10 shrink-0 border-l-2 border-tx-line" />
    </div>
  )
}
