import { Chip } from "@/components/ui/Chip"

export type MatchFilter = "all" | "live" | "finished" | "upcoming" | "favorites"

const FILTERS: { key: MatchFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "live", label: "Live" },
  { key: "finished", label: "Finished" },
  { key: "upcoming", label: "Upcoming" },
  { key: "favorites", label: "Favorites" },
]

interface FilterChipsProps {
  value: MatchFilter
  onChange: (filter: MatchFilter) => void
}

export function FilterChips({ value, onChange }: FilterChipsProps) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      {FILTERS.map((f) => (
        <Chip key={f.key} active={value === f.key} onClick={() => onChange(f.key)}>
          {f.key === "live" && value !== "live" && (
            <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary align-middle" />
          )}
          {f.label}
        </Chip>
      ))}
    </div>
  )
}
