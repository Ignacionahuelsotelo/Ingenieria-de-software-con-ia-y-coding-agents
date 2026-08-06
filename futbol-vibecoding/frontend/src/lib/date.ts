/** Date helpers for the horizontal date selector. All UI-only. */

export interface DateOption {
  /** YYYY-MM-DD used as the API query param. */
  iso: string
  /** e.g. "Today", "Mon" */
  weekday: string
  /** e.g. "14" */
  day: string
  /** e.g. "Sep" */
  month: string
  isToday: boolean
}

function toIso(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Build a window of dates centered on today (from -1 day to +daysAhead). */
export function buildDateWindow(daysBack = 1, daysAhead = 12): DateOption[] {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const options: DateOption[] = []

  for (let offset = -daysBack; offset <= daysAhead; offset++) {
    const d = new Date(today)
    d.setDate(today.getDate() + offset)
    const isToday = offset === 0

    let weekday: string
    if (offset === -1) weekday = "Yesterday"
    else if (offset === 0) weekday = "Today"
    else if (offset === 1) weekday = "Tomorrow"
    else weekday = d.toLocaleDateString("en-US", { weekday: "short" })

    options.push({
      iso: toIso(d),
      weekday,
      day: d.toLocaleDateString("en-US", { day: "2-digit" }),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      isToday,
    })
  }
  return options
}

/** Format an ISO timestamp to a local kickoff time e.g. "20:45". */
export function formatKickoff(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  } catch {
    return "--:--"
  }
}
