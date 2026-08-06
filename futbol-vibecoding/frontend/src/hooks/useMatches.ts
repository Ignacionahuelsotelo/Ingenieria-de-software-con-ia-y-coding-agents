import { useAsync } from "./useAsync"
import {
  fetchCompetitions,
  fetchMatchById,
  fetchMatchEvents,
  fetchMatchesByDate,
  fetchMatchLineups,
  fetchMatchStatistics,
} from "@/services/matchService"

export function useMatchesByDate(date: string) {
  return useAsync((signal) => fetchMatchesByDate(date, signal), [date])
}

export function useMatch(id: string) {
  return useAsync((signal) => fetchMatchById(id, signal), [id])
}

export function useMatchEvents(id: string) {
  return useAsync((signal) => fetchMatchEvents(id, signal), [id])
}

export function useMatchLineups(id: string) {
  return useAsync((signal) => fetchMatchLineups(id, signal), [id])
}

export function useMatchStatistics(id: string) {
  return useAsync((signal) => fetchMatchStatistics(id, signal), [id])
}

export function useCompetitions() {
  return useAsync((signal) => fetchCompetitions(signal), [])
}
