import type { Match } from "@/types/football"
import { Avatar } from "@/components/ui/Avatar"
import { MatchCard } from "./MatchCard"
import { teamInitials, pageNumber } from "@/lib/utils"

interface CompetitionSectionProps {
  competitionId: string
  competitionName: string
  country?: string
  logoUrl?: string | null
  matches: Match[]
  onToggleFavorite?: (id: string) => void
}

export function CompetitionSection({
  competitionId,
  competitionName,
  country,
  logoUrl,
  matches,
  onToggleFavorite,
}: CompetitionSectionProps) {
  return (
    <section className="flex flex-col">
      <header className="flex items-center gap-3 bg-tx-orange px-3 py-2.5 text-tx-bg">
        <Avatar
          src={logoUrl}
          alt={competitionName}
          fallback={teamInitials(competitionName)}
          shape="square"
          size="sm"
          className="border-2 border-tx-bg/70 bg-tx-bg/10"
        />
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-tx-mono text-sm font-extrabold uppercase tracking-[0.08em]">
            {competitionName}
          </h2>
          {country && (
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.1em] text-tx-bg/70">
              {country}
            </p>
          )}
        </div>
        <span className="shrink-0 font-tx-mono text-xs font-bold tabular-nums">
          P&middot;{pageNumber(competitionId)}
        </span>
      </header>

      <div className="flex flex-col border-2 border-t-0 border-tx-line">
        {matches.map((match, i) => (
          <MatchCard
            key={match.id}
            match={match}
            onToggleFavorite={onToggleFavorite}
            divider={i > 0}
            zebra={i % 2 === 1}
          />
        ))}
      </div>
    </section>
  )
}
