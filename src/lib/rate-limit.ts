/**
 * Simple sliding-window rate limiter using in-memory Map.
 * Works in both Node.js and edge runtimes (Cloudflare Workers).
 *
 * Note: In a multi-instance deployment each isolate has its own Map,
 * so this provides per-isolate limiting. For strict global limiting,
 * use Cloudflare Rate Limiting rules or a KV/Durable Objects backend.
 */

interface RateLimitEntry {
  tokens: number
  lastRefill: number
}

const buckets = new Map<string, RateLimitEntry>()

// Periodic cleanup to prevent unbounded memory growth
const CLEANUP_INTERVAL = 60_000 // 1 minute
let lastCleanup = Date.now()

function cleanup(windowMs: number) {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of buckets) {
    if (now - entry.lastRefill > windowMs * 2) {
      buckets.delete(key)
    }
  }
}

export interface RateLimitConfig {
  /** Max requests allowed in the window */
  maxRequests: number
  /** Window duration in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  retryAfterMs: number
}

/**
 * Check rate limit for a given key (e.g. IP address or user ID).
 * Uses a token-bucket algorithm with fixed refill rate.
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now()
  cleanup(config.windowMs)

  let entry = buckets.get(key)

  if (!entry) {
    entry = { tokens: config.maxRequests - 1, lastRefill: now }
    buckets.set(key, entry)
    return { allowed: true, remaining: entry.tokens, retryAfterMs: 0 }
  }

  // Refill tokens based on elapsed time
  const elapsed = now - entry.lastRefill
  const refillRate = config.maxRequests / config.windowMs
  const tokensToAdd = elapsed * refillRate
  entry.tokens = Math.min(config.maxRequests, entry.tokens + tokensToAdd)
  entry.lastRefill = now

  if (entry.tokens >= 1) {
    entry.tokens -= 1
    return { allowed: true, remaining: Math.floor(entry.tokens), retryAfterMs: 0 }
  }

  // Not enough tokens — calculate when one token will be available
  const retryAfterMs = Math.ceil((1 - entry.tokens) / refillRate)
  return { allowed: false, remaining: 0, retryAfterMs }
}

/** Pre-configured rate limit tiers */
export const RATE_LIMITS = {
  /** Authenticated API requests: 60 req/min */
  api: { maxRequests: 60, windowMs: 60_000 } as RateLimitConfig,
  /** Expensive operations (AI, scraping): 10 req/min */
  expensive: { maxRequests: 10, windowMs: 60_000 } as RateLimitConfig,
  /** Auth endpoints (login, signup): 5 req/min */
  auth: { maxRequests: 5, windowMs: 60_000 } as RateLimitConfig,
  /** Public/unauthenticated: 20 req/min */
  public: { maxRequests: 20, windowMs: 60_000 } as RateLimitConfig,
} as const
