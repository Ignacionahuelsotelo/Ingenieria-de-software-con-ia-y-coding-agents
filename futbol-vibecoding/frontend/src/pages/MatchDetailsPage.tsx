import { useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CalendarDays, MapPin } from "lucide-react"
import { useMatch, useMatchEvents, useMatchLineups, useMatchStatistics } from "@/hooks/useMatches"
import { Avatar } from "@/components/ui/Avatar"
import { LiveBadge, Badge } from "@/components/ui/Badge"
import { Tabs, type TabItem } from "@/components/ui/Tabs"
import { Skeleton } from "@/components/ui/Skeleton"
import { ErrorState, EmptyState } from "@/components/ui/States"
import { Card } from "@/components/ui/Card"
import { MatchEvents } from "@/components/match/MatchEvents"
import { MatchLineups } from "@/components/match/MatchLineups"
import { MatchStatistics } from "@/components/match/MatchStatistics"
import { teamInitials } from "@/lib/utils"
import { formatKickoff } from "@/lib/date"

const TABS: TabItem[] = [
  { key: "overview", label: "Overview" },
  { key: "events", label: "Events" },
  { key: "lineups", label: "Lineups" },
  { key: "statistics", label: "Statistics" },
]

function TabPlaceholder({ label }: { label: string }) {
  return (
    <EmptyState
      title={`${label} coming soon`}
      description="This panel will populate once the backend match endpoints are connected."
      className="mt-2"
    />
  )
}

export function MatchDetailsPage() {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const [tab, setTab] = useState("overview")
  const { data: match, isLoading, error, reload } = useMatch(id)
  const events = useMatchEvents(id)
  const lineups = useMatchLineups(id)
  const statistics = useMatchStatistics(id)

  return (
    <div className="flex flex-col gap-6">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex w-fit items-center gap-2 rounded-full bg-surface/60 px-4 py-2 text-sm font-medium text-muted border-hairline transition-colors hover:text-foreground hover:bg-surface"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <Card glass className="overflow-hidden">
        <div className="relative">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/[0.06] to-transparent" />
          <div className="relative p-6 sm:p-8">
            {isLoading ? (
              <div className="flex flex-col items-center gap-6">
                <Skeleton className="h-4 w-40" />
                <div className="flex w-full items-center justify-center gap-6">
                  <Skeleton className="h-16 w-16 rounded-2xl" />
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-16 w-16 rounded-2xl" />
                </div>
              </div>
            ) : error ? (
              <ErrorState onRetry={reload} className="border-0 bg-transparent py-4" />
            ) : match ? (
              <div className="flex flex-col items-center gap-6 text-center">
                <div className="flex flex-col items-center gap-2">
                  <Badge variant="accent">{match.competition.name}</Badge>
                  <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      {match.stadium ?? "Stadium TBD"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {new Date(match.kickoff).toLocaleDateString("en-US", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </span>
                  </div>
                </div>

                <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 sm:gap-8">
                  <div className="flex flex-col items-center gap-3">
                    <Avatar
                      src={match.homeTeam.logoUrl}
                      alt={match.homeTeam.name}
                      fallback={teamInitials(match.homeTeam.name)}
                      shape="squircle"
                      size="lg"
                    />
                    <span className="text-sm font-semibold text-foreground text-balance">
                      {match.homeTeam.name}
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2">
                    <div className="font-mono text-4xl font-bold tabular-nums text-foreground sm:text-5xl">
                      {match.score.home ?? "-"}
                      <span className="mx-2 text-muted">:</span>
                      {match.score.away ?? "-"}
                    </div>
                    {match.status === "live" ? (
                      <LiveBadge label={match.statusLabel ?? `${match.minute ?? 0}'`} />
                    ) : match.status === "cancelled" ? (
                      <Badge variant="cancelled">{match.statusLabel ?? "Cancelled"}</Badge>
                    ) : (
                      <Badge variant={match.status === "finished" ? "finished" : "upcoming"}>
                        {match.status === "finished"
                          ? (match.statusLabel ?? "Full time")
                          : formatKickoff(match.kickoff)}
                      </Badge>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <Avatar
                      src={match.awayTeam.logoUrl}
                      alt={match.awayTeam.name}
                      fallback={teamInitials(match.awayTeam.name)}
                      shape="squircle"
                      size="lg"
                    />
                    <span className="text-sm font-semibold text-foreground text-balance">
                      {match.awayTeam.name}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState title="Match not found" className="border-0 bg-transparent py-4" />
            )}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Tabs
          items={TABS}
          value={tab}
          onChange={setTab}
          layoutId="match-details-tabs"
          className="w-max min-w-full"
        />
      </div>

      <div>
        {tab === "overview" && <TabPlaceholder label="Overview" />}
        {tab === "events" && (
          <MatchEvents
            events={events.data}
            isLoading={events.isLoading}
            error={events.error}
            onRetry={events.reload}
          />
        )}
        {tab === "lineups" && (
          <MatchLineups
            lineups={lineups.data}
            isLoading={lineups.isLoading}
            error={lineups.error}
            onRetry={lineups.reload}
          />
        )}
        {tab === "statistics" && (
          <MatchStatistics
            statistics={statistics.data}
            isLoading={statistics.isLoading}
            error={statistics.error}
            onRetry={statistics.reload}
          />
        )}
      </div>
    </div>
  )
}
