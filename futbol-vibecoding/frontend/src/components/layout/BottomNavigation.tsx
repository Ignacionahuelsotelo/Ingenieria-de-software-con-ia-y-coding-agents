import { useLocation, useNavigate } from "react-router-dom"
import { motion } from "framer-motion"
import { NAV_ITEMS } from "@/lib/navigation"
import { cn } from "@/lib/utils"

export function BottomNavigation() {
  const location = useLocation()
  const navigate = useNavigate()

  const activeKey =
    NAV_ITEMS.find((item) => item.to === location.pathname)?.key ??
    (location.pathname.startsWith("/match") ? "matches" : "matches")

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="glass mx-3 mb-3 flex items-center justify-around rounded-3xl px-2 py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.key === activeKey
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.to)}
              aria-current={active ? "page" : undefined}
              className="relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2"
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-indicator"
                  className="absolute inset-0 rounded-2xl bg-white/[0.07]"
                  transition={{ type: "spring", stiffness: 420, damping: 34 }}
                />
              )}
              <Icon
                className={cn(
                  "relative h-5 w-5 transition-colors",
                  active ? "text-primary" : "text-muted",
                )}
              />
              <span
                className={cn(
                  "relative text-[11px] font-medium transition-colors",
                  active ? "text-foreground" : "text-muted",
                )}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}
