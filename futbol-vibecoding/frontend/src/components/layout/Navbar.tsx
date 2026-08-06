import { useState } from "react"
import { Link, useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { Bell, Search } from "lucide-react"
import { NAV_ITEMS } from "@/lib/navigation"
import { Avatar } from "@/components/ui/Avatar"
import { Modal } from "@/components/ui/Modal"
import { SearchBar } from "@/components/common/SearchBar"
import { cn } from "@/lib/utils"

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="Pitch home">
      <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-[#15803d] shadow-[0_8px_20px_-8px_rgba(34,197,94,0.7)]">
        <span className="h-4 w-4 rounded-full border-2 border-background" />
      </span>
      <span className="text-lg font-bold tracking-tight text-foreground">Pitch</span>
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
    <header className="sticky top-0 z-40">
      <div className="glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:px-6">
          <Logo />

          {/* Desktop tabs */}
          <nav className="ml-4 hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV_ITEMS.map((item) => {
              const active = item.key === activeKey
              return (
                <button
                  key={item.key}
                  onClick={() => navigate(item.to)}
                  className={cn(
                    "relative rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    active ? "text-foreground" : "text-muted hover:text-foreground",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="navbar-indicator"
                      className="absolute inset-0 -z-10 rounded-full bg-white/[0.08] border border-white/[0.1]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  {item.label}
                </button>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
              className="flex h-10 w-10 items-center justify-center rounded-full bg-surface/60 text-muted border-hairline transition-colors hover:text-foreground hover:bg-surface"
            >
              <Search className="h-[18px] w-[18px]" />
            </button>
            <button
              aria-label="Notifications"
              className="relative flex h-10 w-10 items-center justify-center rounded-full bg-surface/60 text-muted border-hairline transition-colors hover:text-foreground hover:bg-surface"
            >
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger ring-2 ring-[#0e1626]" />
            </button>
            <button aria-label="Account" className="ml-1 rounded-full transition-transform active:scale-95">
              <Avatar alt="Your profile" fallback="YOU" size="md" />
            </button>
          </div>
        </div>
      </div>

      <Modal open={searchOpen} onClose={() => setSearchOpen(false)} title="Search">
        <SearchBar autoFocus />
      </Modal>
    </header>
  )
}
