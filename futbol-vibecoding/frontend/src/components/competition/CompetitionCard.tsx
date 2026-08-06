import { ChevronRight } from "lucide-react"
import type { Competition } from "@/types/football"
import { Card } from "@/components/ui/Card"
import { Avatar } from "@/components/ui/Avatar"
import { Skeleton } from "@/components/ui/Skeleton"
import { teamInitials } from "@/lib/utils"

export function CompetitionCard({ competition }: { competition: Competition }) {
  return (
    <Card interactive className="group cursor-pointer p-5">
      <div className="flex items-start gap-4">
        <Avatar
          src={competition.logoUrl}
          alt={competition.name}
          fallback={teamInitials(competition.name)}
          shape="squircle"
          size="lg"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-foreground">
            {competition.name}
          </h3>
          <p className="truncate text-sm text-muted">{competition.country}</p>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground" />
      </div>
      {competition.season && (
        <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
          <span className="text-xs font-medium uppercase tracking-wide text-muted">Season</span>
          <span className="rounded-full bg-surface px-2.5 py-1 text-xs font-semibold text-foreground border-hairline">
            {competition.season}
          </span>
        </div>
      )}
    </Card>
  )
}

export function CompetitionCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start gap-4">
        <Skeleton className="h-14 w-14 rounded-xl" />
        <div className="flex-1 space-y-2 pt-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
    </Card>
  )
}
