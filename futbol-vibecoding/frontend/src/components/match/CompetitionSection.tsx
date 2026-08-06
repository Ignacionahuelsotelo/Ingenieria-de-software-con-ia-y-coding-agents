import { ChevronRight } from "lucide-react"
import type { Match } from "@/types/football"
import { Avatar } from "@/components/ui/Avatar"
import { MatchCard } from "./MatchCard"
import { teamInitials } from "@/lib/utils"

interface CompetitionSectionProps {
  competitionName: string
  country?: string
  logoUrl?: string | null
  matches: Match[]
  onToggleFavorite?: (id: string) => void
}

export function CompetitionSection({
  competitionName,
  country,
  logoUrl,
  matches,
  onToggleFavorite,
}: CompetitionSectionProps) {
  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-center gap-3 px-1">
        <Avatar
          src={logoUrl}
          alt={competitionName}
          fallback={teamInitials(competitionName)}
          shape="squircle"
          size="sm"
        />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-semibold text-foreground">{competitionName}</h2>
          {country && (
            <p className="truncate text-xs text-muted">{country}</p>
          )}
        </div>
        <ChevronRight className="ml-auto h-4 w-4 text-muted" />
      </header>

      <div className="flex flex-col gap-2.5">
        {matches.map((match) => (
          <MatchCard key={match.id} match={match} onToggleFavorite={onToggleFavorite} />
        ))}
      </div>
    </section>
  )
}
