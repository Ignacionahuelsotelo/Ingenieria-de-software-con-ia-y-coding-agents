import { useLocation, useNavigate } from "react-router-dom"
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
      className="fixed inset-x-0 bottom-0 z-40 border-t-2 border-tx-line bg-tx-panel md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = item.key === activeKey
          return (
            <button
              key={item.key}
              onClick={() => navigate(item.to)}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-1 border-t-[3px] py-2.5 transition-colors focus-visible:outline-tx-gold",
                active ? "border-tx-orange" : "border-transparent",
              )}
            >
              <Icon
                className={cn(
                  "h-5 w-5 transition-colors",
                  active ? "text-tx-orange" : "text-tx-muted",
                )}
              />
              <span
                className={cn(
                  "font-tx-mono text-[10px] font-bold uppercase tracking-[0.06em] transition-colors",
                  active ? "text-tx-ink" : "text-tx-muted",
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
