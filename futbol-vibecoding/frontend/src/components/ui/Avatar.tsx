import { useState } from "react"
import { cn } from "@/lib/utils"

interface AvatarProps {
  src?: string | null
  alt: string
  /** Fallback text (initials). */
  fallback: string
  size?: "sm" | "md" | "lg"
  className?: string
  /** Rounded shape — teams use "squircle", people use "circle", "square" is hard-edged (teletext). */
  shape?: "circle" | "squircle" | "square"
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-14 w-14 text-base",
}

export function Avatar({
  src,
  alt,
  fallback,
  size = "md",
  shape = "circle",
  className,
}: AvatarProps) {
  const [errored, setErrored] = useState(false)
  const showImage = src && !errored

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden bg-surface font-semibold text-muted select-none border-hairline",
        shape === "circle" ? "rounded-full" : shape === "square" ? "rounded-none" : "rounded-xl",
        sizes[size],
        className,
      )}
      aria-label={alt}
    >
      {showImage ? (
        <img
          src={src || "/placeholder.svg"}
          alt={alt}
          crossOrigin="anonymous"
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <span aria-hidden="true">{fallback}</span>
      )}
    </span>
  )
}
