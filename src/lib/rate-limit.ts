/**
 * A small in-memory, per-key sliding-window rate limiter.
 *
 * Built for one job: stop a stranger from scripting requests against the chat route and
 * draining `ANTHROPIC_API_KEY` credits (FE-14's "production hygiene" requirement) — not a
 * general-purpose abuse-prevention system. Deliberately simple rather than reaching for a
 * dependency or an external store for a capstone-scale app:
 *
 * - **Known limitation, stated plainly:** this is a `Map` living in the server process's
 *   memory. On Vercel's serverless runtime that means the count is per-instance, not global —
 *   a burst of traffic that gets load-balanced across multiple warm instances (or a cold start)
 *   resets or fragments the count. That's an acceptable gap for "stop trivial/casual abuse,"
 *   which is the actual bar FE-14 sets, but it is *not* a durable limit a determined attacker
 *   with concurrent connections can't route around. A real production hardening pass would swap
 *   this module's internals for Vercel KV or Upstash Redis (same call signature, different
 *   storage) — noted in the README rather than built now, since adding an external data store
 *   is a bigger decision than this task's scope.
 * - **Bounded memory:** old entries are swept on every call (not on a timer) so the map can't
 *   grow forever in a long-lived process; see `sweep()`.
 */

interface WindowState {
  /** Timestamps (ms) of requests within the current window, oldest first. */
  hits: number[];
}

const windows = new Map<string, WindowState>();

/** Sweep interval: don't scan the whole map on every single call, only every N calls. */
const SWEEP_EVERY_N_CALLS = 50;
let callsSinceSweep = 0;

export interface RateLimitResult {
  allowed: boolean;
  /** Seconds the caller should wait before retrying. Only set when `allowed` is false. */
  retryAfterSeconds?: number;
}

export interface RateLimitOptions {
  /** Max requests allowed within `windowMs`. */
  limit: number;
  /** Sliding window size in milliseconds. */
  windowMs: number;
}

/**
 * Checks (and records) a hit for `key` against a sliding window. Call once per incoming
 * request, before doing any expensive work — this doesn't just report state, it consumes
 * one slot in the window if the request is allowed.
 */
export function checkRateLimit(key: string, { limit, windowMs }: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const windowStart = now - windowMs;

  let state = windows.get(key);
  if (!state) {
    state = { hits: [] };
    windows.set(key, state);
  }

  // Drop hits that have aged out of the current window.
  state.hits = state.hits.filter((timestamp) => timestamp > windowStart);

  if (state.hits.length >= limit) {
    const oldestHit = state.hits[0];
    const retryAfterMs = oldestHit + windowMs - now;
    return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  state.hits.push(now);

  callsSinceSweep += 1;
  if (callsSinceSweep >= SWEEP_EVERY_N_CALLS) {
    callsSinceSweep = 0;
    sweep(windowStart);
  }

  return { allowed: true };
}

/** Removes keys whose every recorded hit has aged out — keeps the map from growing forever. */
function sweep(windowStart: number) {
  for (const [key, state] of windows) {
    if (state.hits.every((timestamp) => timestamp <= windowStart)) {
      windows.delete(key);
    }
  }
}

/** Test-only: resets all state between test cases. */
export function _resetRateLimitStateForTests() {
  windows.clear();
  callsSinceSweep = 0;
}

/**
 * Best-effort client identifier for a request on Vercel's runtime. `x-forwarded-for` can carry
 * a comma-separated chain (client, then any proxies) — the first entry is the original client.
 * Falls back to a constant key if neither header is present (e.g. local `next dev`, where every
 * request is effectively "the same client" for rate-limiting purposes anyway).
 */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }
  return "unknown";
}
