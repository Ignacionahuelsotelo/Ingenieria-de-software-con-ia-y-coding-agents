import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
}

export function Chip({ active, className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] active:scale-[0.96]",
        active
          ? "bg-foreground text-background shadow-[0_8px_20px_-10px_rgba(249,250,251,0.5)]"
          : "bg-surface/60 text-muted border-hairline hover:text-foreground hover:bg-surface",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
