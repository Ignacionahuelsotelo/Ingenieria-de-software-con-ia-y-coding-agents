import { Chip } from "@/components/ui/Chip"

export type MatchFilter = "all" | "live" | "finished" | "upcoming" | "favorites"

const FILTERS: { key: MatchFilter; label: string; keyColor: "neutral" | "red" | "gold" | "orange" }[] = [
  { key: "all", label: "All", keyColor: "neutral" },
  { key: "live", label: "Live", keyColor: "red" },
  { key: "finished", label: "FT", keyColor: "gold" },
  { key: "upcoming", label: "Next", keyColor: "orange" },
  { key: "favorites", label: "Starred", keyColor: "neutral" },
]

interface FilterChipsProps {
  value: MatchFilter
  onChange: (filter: MatchFilter) => void
}

export function FilterChips({ value, onChange }: FilterChipsProps) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 pb-0.5 sm:mx-0 sm:px-0">
      {FILTERS.map((f) => (
        <Chip
          key={f.key}
          active={value === f.key}
          keyColor={f.keyColor}
          onClick={() => onChange(f.key)}
        >
          {f.label}
        </Chip>
      ))}
    </div>
  )
}
