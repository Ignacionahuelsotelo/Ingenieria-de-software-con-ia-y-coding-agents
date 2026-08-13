import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { Bell, CircleDot, Search } from "lucide-react"
import { NAV_ITEMS } from "@/lib/navigation"
import { Avatar } from "@/components/ui/Avatar"
import { Modal } from "@/components/ui/Modal"
import { SearchBar } from "@/components/common/SearchBar"
import { cn } from "@/lib/utils"

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Pitch home">
      <span className="flex h-9 w-9 items-center justify-center bg-tx-orange text-tx-bg">
        <CircleDot className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="font-tx-mono text-lg font-extrabold uppercase tracking-[0.08em] text-tx-ink">
        Pitch
      </span>
    </Link>
  )
}

export function Navbar() {
  const location = useLocation()
  const navigate = useNavigate()
  const [searchOpen, setSearchOpen] = useState(false)

  const activeKey =
    NAV_ITEMS.find((item) => item.to === location.pathname)?.key ??
    (location.pathname.startsWith("/match") ? "matches" : "matches")

  return (
    <header className="sticky top-0 z-40 border-b-2 border-tx-line bg-tx-panel">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Logo />

        {/* Desktop tabs */}
        <nav className="ml-4 hidden h-full items-center gap-1 md:flex" aria-label="Primary">
          {NAV_ITEMS.map((item) => {
            const active = item.key === activeKey
            return (
              <button
                key={item.key}
                onClick={() => navigate(item.to)}
                className={cn(
                  "relative flex h-full items-center px-3 font-tx-mono text-sm font-bold uppercase tracking-[0.06em] transition-colors focus-visible:outline-tx-gold",
                  active ? "text-tx-orange" : "text-tx-muted hover:text-tx-ink",
                )}
              >
                {item.label}
                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-[3px] bg-tx-orange"
                  />
                )}
              </button>
            )
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
            className="flex h-9 w-9 items-center justify-center border-2 border-tx-line text-tx-muted transition-colors hover:border-tx-orange hover:text-tx-ink focus-visible:outline-tx-gold"
          >
            <Search className="h-[18px] w-[18px]" />
          </button>
          <button
            aria-label="Notifications"
            className="relative flex h-9 w-9 items-center justify-center border-2 border-tx-line text-tx-muted transition-colors hover:border-tx-orange hover:text-tx-ink focus-visible:outline-tx-gold"
          >
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 bg-tx-red" />
          </button>
          <button
            aria-label="Account"
            className="ml-0.5 border-2 border-tx-line transition-colors hover:border-tx-orange focus-visible:outline-tx-gold"
          >
            <Avatar alt="Your profile" fallback="YOU" size="md" shape="square" className="border-0 bg-tx-panel" />
          </button>
        </div>
      </div>

      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search">
        <SearchBar autoFocus />
      </Modal>
    </header>
  )
}
