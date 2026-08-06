import { Bot, LayoutGrid, Trophy } from "lucide-react"
import type { LucideIcon } from "lucide-react"

export interface NavItem {
  key: string
  label: string
  to: string
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { key: "matches", label: "Matches", to: "/", icon: LayoutGrid },
  { key: "competitions", label: "Competitions", to: "/competitions", icon: Trophy },
  { key: "assistant", label: "AI Assistant", to: "/assistant", icon: Bot },
]
