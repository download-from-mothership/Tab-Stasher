/**
 * In-memory response cache with stale-while-revalidate semantics.
 * Suitable for edge runtimes (no external dependencies).
 *
 * Each entry has a fresh TTL and a stale TTL. When a cached value is
 * between fresh and stale, it is returned immediately while a background
 * revalidation runs. After stale TTL, the entry is evicted.
 */

interface CacheEntry<T> {
  data: T
  createdAt: number
  /** Promise of an in-flight revalidation, if any */
  revalidating?: Promise<T>
}

interface SWRCacheOptions {
  /** How long the entry is considered fresh (ms) */
  freshMs: number
  /** How long the entry can be served stale while revalidating (ms) */
  staleMs: number
  /** Maximum number of entries before LRU eviction */
  maxEntries?: number
}

export class SWRCache<T> {
  private cache = new Map<string, CacheEntry<T>>()
  private freshMs: number
  private staleMs: number
  private maxEntries: number

  constructor(options: SWRCacheOptions) {
    this.freshMs = options.freshMs
    this.staleMs = options.staleMs
    this.maxEntries = options.maxEntries ?? 100
  }

  /**
   * Get a cached value, revalidating in background if stale.
   * Returns null if no cached value exists or entry has expired.
   */
  async get(
    key: string,
    revalidate?: () => Promise<T>
  ): Promise<T | null> {
    const entry = this.cache.get(key)
    if (!entry) return null

    const age = Date.now() - entry.createdAt

    // Expired beyond stale window — evict
    if (age > this.staleMs) {
      this.cache.delete(key)
      return null
    }

    // Stale but within window — serve stale, revalidate in background
    if (age > this.freshMs && revalidate && !entry.revalidating) {
      entry.revalidating = revalidate().then((data) => {
        this.set(key, data)
        return data
      }).catch(() => {
        // Revalidation failed — keep stale entry
        entry.revalidating = undefined
        return entry.data
      })
    }

    return entry.data
  }

  /** Store a value in the cache. */
  set(key: string, data: T): void {
    // LRU eviction: remove oldest entry if at capacity
    if (this.cache.size >= this.maxEntries && !this.cache.has(key)) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey)
      }
    }

    this.cache.set(key, { data, createdAt: Date.now() })
  }

  /** Invalidate a specific key. */
  invalidate(key: string): void {
    this.cache.delete(key)
  }

  /** Clear all entries. */
  clear(): void {
    this.cache.clear()
  }
}

/**
 * In-flight request deduplication.
 * If multiple concurrent requests arrive for the same key,
 * only one fetch runs and all callers share the same promise.
 */
const inflightRequests = new Map<string, Promise<any>>()

export async function dedupRequest<T>(
  key: string,
  fn: () => Promise<T>
): Promise<T> {
  const existing = inflightRequests.get(key)
  if (existing) return existing as Promise<T>

  const promise = fn().finally(() => {
    inflightRequests.delete(key)
  })

  inflightRequests.set(key, promise)
  return promise
}
