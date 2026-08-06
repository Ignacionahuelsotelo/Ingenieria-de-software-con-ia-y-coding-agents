import type { MatchEvent, MatchEventType } from "@/types/football"
import { Skeleton } from "@/components/ui/Skeleton"
import { EmptyState, ErrorState } from "@/components/ui/States"
import { cn } from "@/lib/utils"

const EVENT_DOT: Record<MatchEventType, string> = {
  goal: "bg-primary",
  yellow: "bg-yellow-400",
  red: "bg-danger",
  sub: "bg-secondary",
  var: "bg-muted",
}

const EVENT_LABEL: Record<MatchEventType, string> = {
  goal: "Goal",
  yellow: "Yellow card",
  red: "Red card",
  sub: "Substitution",
  var: "VAR",
}

function EventRow({ event }: { event: MatchEvent }) {
  const home = event.side === "home"
  const content = (
    <div className={cn("flex min-w-0 items-center gap-2", home ? "justify-end text-right" : "justify-start text-left")}>
      <span className={cn("order-none flex flex-col", home ? "items-end" : "items-start")}>
        <span className="truncate text-sm font-medium text-foreground">{event.player}</span>
        <span className="text-xs text-muted">{EVENT_LABEL[event.type]}</span>
      </span>
    </div>
  )

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-2.5">
      {home ? content : <div />}
      <div className="flex flex-col items-center gap-1">
        <span className={cn("h-2 w-2 rounded-full", EVENT_DOT[event.type])} />
        <span className="font-mono text-xs text-muted">{event.minute}'</span>
      </div>
      {home ? <div /> : content}
    </div>
  )
}

export function MatchEvents({
  events,
  isLoading,
  error,
  onRetry,
}: {
  events: MatchEvent[] | null
  isLoading: boolean
  error: string | null
  onRetry: () => void
}) {
  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    )
  }

  if (error) return <ErrorState onRetry={onRetry} />

  if (!events || events.length === 0) {
    return <EmptyState title="No events yet" description="Goals, cards and substitutions will show up here." />
  }

  return (
    <div className="divide-y divide-white/[0.06]">
      {[...events].sort((a, b) => a.minute - b.minute).map((event) => (
        <EventRow key={event.id} event={event} />
      ))}
    </div>
  )
}
