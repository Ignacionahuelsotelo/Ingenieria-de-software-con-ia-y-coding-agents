import { forwardRef } from "react"
import type { ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/utils"

type Variant = "primary" | "secondary" | "ghost" | "surface" | "danger"
type Size = "sm" | "md" | "lg" | "icon"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-background font-semibold shadow-[0_8px_24px_-8px_rgba(34,197,94,0.6)] hover:brightness-110 active:brightness-95",
  secondary:
    "bg-secondary text-background font-semibold shadow-[0_8px_24px_-8px_rgba(59,130,246,0.6)] hover:brightness-110 active:brightness-95",
  surface:
    "bg-surface text-foreground border-hairline hover:bg-white/[0.06] active:bg-white/[0.03]",
  ghost: "bg-transparent text-muted hover:text-foreground hover:bg-white/[0.05]",
  danger: "bg-danger text-foreground font-semibold hover:brightness-110",
}

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm gap-1.5",
  md: "h-11 px-5 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
  icon: "h-11 w-11 p-0 justify-center",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "surface", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-full transition-all duration-200 ease-[cubic-bezier(0.22,1,0.36,1)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.97]",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"
