import { useCallback, useEffect, useRef, useState } from "react"
import type { AsyncState } from "@/types/football"

/**
 * Generic async fetcher. Runs the provided loader whenever `deps` change and
 * exposes {data, isLoading, error}. Aborts in-flight requests on cleanup.
 *
 * Because the backend is not wired up yet, the loader typically rejects — which
 * is expected. Consumers render error / empty states accordingly.
 */
export function useAsync<T>(
  loader: (signal: AbortSignal) => Promise<T>,
  deps: unknown[],
): AsyncState<T> & { reload: () => void } {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: true,
    error: null,
  })
  const [nonce, setNonce] = useState(0)
  const loaderRef = useRef(loader)
  loaderRef.current = loader

  const reload = useCallback(() => setNonce((n) => n + 1), [])

  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setState({ data: null, isLoading: true, error: null })

    loaderRef
      .current(controller.signal)
      .then((data) => {
        if (active) setState({ data, isLoading: false, error: null })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted || !active) return
        const message = err instanceof Error ? err.message : "Something went wrong"
        setState({ data: null, isLoading: false, error: message })
      })

    return () => {
      active = false
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, nonce])

  return { ...state, reload }
}
