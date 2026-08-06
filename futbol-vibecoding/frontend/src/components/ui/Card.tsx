import type { HTMLAttributes } from "react"
import { cn } from "@/lib/utils"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover lift + glow. */
  interactive?: boolean
  /** Use glass surface treatment. */
  glass?: boolean
}

export function Card({ className, interactive, glass, ...props }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-3xl border-hairline",
        glass ? "glass" : "bg-card",
        "shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_20px_40px_-24px_rgba(0,0,0,0.6)]",
        interactive &&
          "transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-[0_1px_0_0_rgba(255,255,255,0.06)_inset,0_28px_60px_-24px_rgba(0,0,0,0.7)]",
        className,
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pb-5", className)} {...props} />
}
