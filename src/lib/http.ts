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

    const combinedSignal = externalSignal
      ? combineAbortSignals(externalSignal, controller.signal)
      : controller.signal

    try {
      const res = await fetch(path, { ...fetchOpts, signal: combinedSignal })
      clearTimeout(timer)

      if (!res.ok) {
        if (res.status === 429 && attempt < retries) {
          const retryAfter = Number(res.headers.get("Retry-After") || 1) * 1000
          await delay(retryAfter)
          continue
        }
        throw new ApiError(res.status, `API ${res.status}: ${path}`)
      }

      return res.json() as Promise<T>
    } catch (err) {
      clearTimeout(timer)
      if (err instanceof ApiError) throw err
      if (attempt < retries) {
        await delay(1000 * (attempt + 1))
        continue
      }
      throw err
    }
  }
  throw new Error("Unreachable")
}

function combineAbortSignals(external: AbortSignal, internal: AbortSignal): AbortSignal {
  const controller = new AbortController()
  const onAbort = () => controller.abort()
  external.addEventListener("abort", onAbort, { once: true })
  internal.addEventListener("abort", onAbort, { once: true })
  return controller.signal
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}
