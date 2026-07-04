export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = "ApiError"
  }
}

interface ApiOptions extends Omit<RequestInit, "signal"> {
  timeout?: number
  retries?: number
  signal?: AbortSignal
}

export async function http<T = unknown>(path: string, opts: ApiOptions = {}): Promise<T> {
  const { timeout = 15000, retries = 2, signal: externalSignal, ...fetchOpts } = opts

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeout)
    const signalPair = externalSignal
      ? combineAbortSignals(externalSignal, controller.signal)
      : null

    const combinedSignal = signalPair?.signal ?? controller.signal

    try {
      const res = await fetch(path, { ...fetchOpts, signal: combinedSignal })
      clearTimeout(timer)
      signalPair?.cleanup()

      if (!res.ok) {
        if (res.status === 429 && attempt < retries) {
          const retryAfter = Number(res.headers.get("Retry-After") || 1) * 1000
          await delay(retryAfter)
          continue
        }
        throw new ApiError(res.status, `API ${res.status}: ${path}`)
      }

      if (res.status === 204) return null as T
      const text = await res.text()
      if (!text) return null as T
      return JSON.parse(text) as T
    } catch (err) {
      clearTimeout(timer)
      signalPair?.cleanup()
      if (err instanceof ApiError) throw err
      if (isAbortError(err)) throw err
      if (attempt < retries) {
        await delay(1000 * (attempt + 1))
        continue
      }
      throw err
    }
  }
  throw new Error("Unreachable")
}

function combineAbortSignals(external: AbortSignal, internal: AbortSignal): { signal: AbortSignal; cleanup: () => void } {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  external.addEventListener("abort", onAbort, { once: true })
  internal.addEventListener("abort", onAbort, { once: true })
  return {
    signal: controller.signal,
    cleanup: () => {
      external.removeEventListener("abort", onAbort)
      internal.removeEventListener("abort", onAbort)
    },
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === "AbortError"
}
