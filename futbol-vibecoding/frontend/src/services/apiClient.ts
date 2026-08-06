/**
 * Thin REST client. The frontend NEVER talks to external services directly —
 * every call targets our own Express backend. Base URL is configurable via
 * VITE_API_BASE_URL and defaults to "/api".
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api"

export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
    this.name = "ApiError"
  }
}

export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { Accept: "application/json" },
    signal,
  })
  if (!res.ok) {
    throw new ApiError(`Request failed: ${path}`, res.status)
  }
  return (await res.json()) as T
}

export async function apiPost<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
    signal,
  })
  if (!res.ok) {
    throw new ApiError(`Request failed: ${path}`, res.status)
  }
  return (await res.json()) as T
}
