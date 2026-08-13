import { buildDateWindow } from "@/lib/date"
import { cn } from "@/lib/utils"

interface DateSelectorProps {
  value: string
  onChange: (iso: string) => void
}

export function DateSelector({ value, onChange }: DateSelectorProps) {
  const dates = buildDateWindow()

  return (
    <div
      className="no-scrollbar -mx-4 flex overflow-x-auto border-2 border-tx-line px-0 sm:mx-0"
      role="tablist"
      aria-label="Select date"
    >
      {dates.map((d, i) => {
        const active = d.iso === value
        return (
          <button
            key={d.iso}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(d.iso)}
            className={cn(
              "flex shrink-0 flex-col items-center justify-center gap-0.5 px-4 py-2.5 font-tx-mono transition-colors focus-visible:outline-tx-gold",
              i > 0 && "border-l-2 border-tx-line",
              active
                ? "bg-tx-orange text-tx-bg"
                : "bg-tx-panel text-tx-muted hover:bg-tx-line/40 hover:text-tx-ink",
            )}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.15em]">
              {d.isToday ? "TODAY" : d.weekday}
            </span>
            <span className="text-sm font-bold tabular-nums tracking-wide">
              {d.day} {d.month}
            </span>
          </button>
        )
      })}
    </div>
  )
}
