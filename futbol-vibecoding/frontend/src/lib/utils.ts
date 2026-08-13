import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Return team initials for logo placeholders, e.g. "Manchester City" -> "MC" */
export function teamInitials(name: string): string {
  // Drop parenthetical suffixes like "(Kaz)" before picking initials.
  const words = name
    .replace(/\([^)]*\)/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

/**
 * Deterministic 3-digit "page number" derived from a string id, in the
 * teletext index range (1xx-3xx) — purely a stylistic index code, not a
 * real sequence.
 */
export function pageNumber(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  }
  return String(100 + (hash % 300))
}
