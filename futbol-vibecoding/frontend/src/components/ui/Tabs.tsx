import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export interface TabItem {
  key: string
  label: string
}

interface TabsProps {
  items: TabItem[]
  value: string
  onChange: (key: string) => void
  /** Shared layoutId so multiple Tab groups don't collide. */
  layoutId?: string
  className?: string
  /** Visual style. "pill" = filled moving pill, "underline" = moving underline. */
  variant?: "pill" | "underline"
}

export function Tabs({
  items,
  value,
  onChange,
  layoutId = "tab-indicator",
  className,
  variant = "pill",
}: TabsProps) {
  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1",
        variant === "pill" && "rounded-full bg-surface/60 p-1 border-hairline",
        variant === "underline" && "gap-6 border-b border-white/[0.08]",
        className,
      )}
    >
      {items.map((item) => {
        const active = item.key === value
        return (
          <button
            key={item.key}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative z-10 whitespace-nowrap text-sm font-medium transition-colors duration-200",
              variant === "pill" && "flex-1 rounded-full px-4 py-2",
              variant === "underline" && "px-1 pb-3",
              active ? "text-foreground" : "text-muted hover:text-foreground",
            )}
          >
            {variant === "pill" && active && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 -z-10 rounded-full bg-foreground/10 border border-white/[0.1]"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            {variant === "underline" && active && (
              <motion.span
                layoutId={layoutId}
                className="absolute -bottom-px left-0 right-0 h-0.5 rounded-full bg-primary"
                transition={{ type: "spring", stiffness: 400, damping: 32 }}
              />
            )}
            {item.label}
          </button>
        )
      })}
    </div>
  )
}
