import type { ReactNode } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { BottomNavigation } from "@/components/layout/BottomNavigation"

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh">
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -top-40 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-[140px]" />
        <div className="absolute top-1/3 -right-40 h-[420px] w-[420px] rounded-full bg-secondary/[0.06] blur-[130px]" />
      </div>

      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">
        {children}
      </main>

      <BottomNavigation />
    </div>
  )
}
