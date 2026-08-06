import { useState } from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/Input"
import { EmptyState } from "@/components/ui/States"

interface SearchBarProps {
  autoFocus?: boolean
}

/**
 * Search UI. Wire the query to a backend search endpoint later; for now it
 * renders an empty prompt state.
 */
export function SearchBar({ autoFocus }: SearchBarProps) {
  const [query, setQuery] = useState("")

  return (
    <div className="flex flex-col gap-4">
      <Input
        autoFocus={autoFocus}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search teams, competitions, players…"
        leftIcon={<Search className="h-4 w-4" />}
        aria-label="Search"
      />
      <EmptyState
        icon={<Search className="h-6 w-6" />}
        title={query ? `No results for “${query}”` : "Search football"}
        description={
          query
            ? "Search results will appear here once the backend search endpoint is connected."
            : "Find teams, competitions and players across every league."
        }
      />
    </div>
  )
}
