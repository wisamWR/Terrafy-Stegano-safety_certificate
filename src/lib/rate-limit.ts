// Best-effort in-memory limiter for login attempts. State is per server instance, so on
// serverless/multi-instance deployments swap this for a shared store (e.g. Redis/Upstash).

type Entry = { count: number; resetAt: number }

const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 5
const attempts = new Map<string, Entry>()

function current(key: string): Entry | undefined {
    const entry = attempts.get(key)
    if (entry && entry.resetAt <= Date.now()) {
        attempts.delete(key)
        return undefined
    }
    return entry
}

/** Seconds the caller must wait, or 0 if allowed. */
export function loginRetryAfter(key: string): number {
    const entry = current(key)
    if (!entry || entry.count < MAX_FAILURES) return 0
    return Math.ceil((entry.resetAt - Date.now()) / 1000)
}

export function recordLoginFailure(key: string) {
    const entry = current(key)
    if (entry) entry.count++
    else attempts.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS })
}

export function clearLoginFailures(key: string) {
    attempts.delete(key)
}
