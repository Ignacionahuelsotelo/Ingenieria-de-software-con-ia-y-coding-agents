import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type KeyColor = "neutral" | "red" | "gold" | "orange"

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean
  /** Fastext-style colour key — mirrors the coloured buttons on a teletext remote. */
  keyColor?: KeyColor
}

const activeFill: Record<KeyColor, string> = {
  neutral: "bg-tx-ink text-tx-bg",
  red: "bg-tx-red text-tx-bg",
  gold: "bg-tx-gold text-tx-bg",
  orange: "bg-tx-orange text-tx-bg",
}

const idleDot: Record<KeyColor, string> = {
  neutral: "bg-tx-ink",
  red: "bg-tx-red",
  gold: "bg-tx-gold",
  orange: "bg-tx-orange",
}

export function Chip({ active, keyColor = "neutral", className, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "flex shrink-0 items-center gap-2 border-2 border-tx-line px-3.5 py-2 font-tx-mono text-xs font-bold uppercase tracking-[0.12em] transition-colors focus-visible:outline-tx-gold",
        active
          ? activeFill[keyColor]
          : "bg-tx-panel text-tx-muted hover:text-tx-ink",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className={cn("h-2 w-2 shrink-0", active ? "bg-tx-bg" : idleDot[keyColor])}
      />
      {children}
    </button>
  )
}
