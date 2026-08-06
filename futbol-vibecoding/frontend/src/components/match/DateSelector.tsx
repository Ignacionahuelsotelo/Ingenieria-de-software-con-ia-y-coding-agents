import { buildDateWindow } from "@/lib/date"
import { cn } from "@/lib/utils"

interface DateSelectorProps {
  value: string
  onChange: (iso: string) => void
}

export function DateSelector({ value, onChange }: DateSelectorProps) {
  const dates = buildDateWindow()

  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
      {dates.map((d) => {
        const active = d.iso === value
        return (
          <button
            key={d.iso}
            onClick={() => onChange(d.iso)}
            aria-pressed={active}
            className={cn(
              "flex shrink-0 flex-col items-center gap-0.5 rounded-2xl px-4 py-2.5 transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.97]",
              active
                ? "bg-foreground text-background shadow-[0_10px_24px_-12px_rgba(249,250,251,0.5)]"
                : "bg-surface/50 text-muted border-hairline hover:bg-surface hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "text-[11px] font-semibold uppercase tracking-wide",
                active ? "text-background/70" : "text-muted",
              )}
            >
              {d.weekday}
            </span>
            <span className="text-sm font-bold tabular-nums">
              {d.day} {d.month}
            </span>
          </button>
        )
      })}
    </div>
  )
}
