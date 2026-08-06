import { cn } from "@/lib/utils"

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl bg-white/[0.05]",
        "after:absolute after:inset-0 after:-translate-x-full after:bg-gradient-to-r after:from-transparent after:via-white/[0.06] after:to-transparent after:content-[''] after:[animation:shimmer_1.6s_infinite]",
        className,
      )}
      aria-hidden="true"
    />
  )
}
