import type { ReactNode } from "react"
import { Navbar } from "@/components/layout/Navbar"
import { BottomNavigation } from "@/components/layout/BottomNavigation"

export function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-tx-bg">
      <Navbar />

      <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 sm:px-6 md:pb-16">
        {children}
      </main>

      <BottomNavigation />
    </div>
  )
}
