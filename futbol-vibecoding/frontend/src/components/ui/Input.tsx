import { forwardRef } from "react"
import type { InputHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode
  rightSlot?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, leftIcon, rightSlot, ...props }, ref) => {
    return (
      <div
        className={cn(
          "flex items-center gap-2.5 rounded-2xl bg-surface/60 border-hairline px-4 transition-colors focus-within:border-white/20 focus-within:bg-surface",
          className,
        )}
      >
        {leftIcon && <span className="text-muted shrink-0">{leftIcon}</span>}
        <input
          ref={ref}
          className="h-12 w-full bg-transparent text-sm text-foreground placeholder:text-muted outline-none"
          {...props}
        />
        {rightSlot}
      </div>
    )
  },
)
Input.displayName = "Input"
