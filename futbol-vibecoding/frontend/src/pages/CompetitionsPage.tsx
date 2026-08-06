import { Trophy } from "lucide-react"
import { useCompetitions } from "@/hooks/useMatches"
import {
  CompetitionCard,
  CompetitionCardSkeleton,
} from "@/components/competition/CompetitionCard"
import { EmptyState, ErrorState } from "@/components/ui/States"

export function CompetitionsPage() {
  const { data, isLoading, error, reload } = useCompetitions()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Competitions
        </h1>
        <p className="mt-1 text-sm text-muted">
          Explore leagues and tournaments from around the world.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <CompetitionCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState onRetry={reload} />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon={<Trophy className="h-6 w-6" />}
          title="No competitions yet"
          description="Competitions will appear here once the backend endpoint is connected."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.map((competition) => (
            <CompetitionCard key={competition.id} competition={competition} />
          ))}
        </div>
      )}
    </div>
  )
}
