import type { MatchStatistic } from "@/types/football"
import { Skeleton } from "@/components/ui/Skeleton"
import { EmptyState, ErrorState } from "@/components/ui/States"

function StatRow({ stat }: { stat: MatchStatistic }) {
  const total = stat.home + stat.away
  const homeShare = total > 0 ? (stat.home / total) * 100 : 50

  return (
    <div className="flex flex-col gap-1.5 py-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="font-mono font-semibold text-foreground">
          {stat.home}
          {stat.isPercent && "%"}
        </span>
        <span className="text-xs text-muted">{stat.label}</span>
        <span className="font-mono font-semibold text-foreground">
          {stat.away}
          {stat.isPercent && "%"}
        </span>
      </div>
      <div className="flex h-1.5 gap-1 overflow-hidden rounded-full bg-surface">
        <div className="h-full rounded-full bg-primary" style={{ width: `${homeShare}%` }} />
        <div className="h-full rounded-full bg-secondary" style={{ width: `${100 - homeShare}%` }} />
      </div>
    </div>
  )
}

export function MatchStatistics({
  statistics,
  isLoading,
  error,
  onRetry,
}: {
  statistics: MatchStatistic[] | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (error) return <ErrorState onRetry={onRetry} />

  if (!statistics || statistics.length === 0) {
    return <EmptyState title="No statistics available" description="Match statistics will appear here once published." />
  }

  return (
    <div className="divide-y divide-white/[0.06]">
      {statistics.map((stat) => (
        <StatRow key={stat.label} stat={stat} />
      ))}
    </div>
  )
}
