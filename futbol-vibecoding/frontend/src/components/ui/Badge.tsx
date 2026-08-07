import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type BadgeVariant = "live" | "finished" | "upcoming" | "cancelled" | "neutral" | "accent"

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const variants: Record<BadgeVariant, string> = {
  live: "bg-primary/15 text-primary border border-primary/25",
  finished: "bg-white/[0.06] text-muted border-hairline",
  upcoming: "bg-secondary/12 text-secondary border border-secondary/25",
  cancelled: "bg-white/[0.06] text-muted/80 border-hairline line-through decoration-muted/60",
  neutral: "bg-white/[0.06] text-muted border-hairline",
  accent: "bg-secondary/15 text-secondary border border-secondary/25",
}

export function Badge({ className, variant = "neutral", children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide",
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </span>
  )
}

/** Animated LIVE badge with pulsing dot. */
export function LiveBadge({ label = "Live", className }: { label?: string; className?: string }) {
  return (
    <Badge variant="live" className={className}>
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      {label}
    </Badge>
  )
}
