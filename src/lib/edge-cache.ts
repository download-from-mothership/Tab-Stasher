/**
 * Edge cache utilities for Cloudflare Workers / CDN layer.
 *
 * These helpers set Cache-Control and CDN-Cache-Control headers
 * appropriate for different response types.
 */

export interface CacheProfile {
  /** Browser cache max-age in seconds */
  browserMaxAge: number
  /** CDN/edge cache max-age in seconds (Cloudflare) */
  cdnMaxAge: number
  /** Stale-while-revalidate window in seconds */
  swr?: number
  /** Whether the response varies per-user (private) */
  isPrivate?: boolean
}

/** Pre-defined cache profiles */
export const CACHE_PROFILES = {
  /** User-specific data: short browser cache, no CDN cache */
  private: {
    browserMaxAge: 30,
    cdnMaxAge: 0,
    swr: 300,
    isPrivate: true,
  },
  /** Public, rarely changing (health check, static config) */
  publicShort: {
    browserMaxAge: 10,
    cdnMaxAge: 60,
    swr: 120,
    isPrivate: false,
  },
  /** Static assets or immutable responses */
  immutable: {
    browserMaxAge: 31536000,
    cdnMaxAge: 31536000,
    isPrivate: false,
  },
} as const satisfies Record<string, CacheProfile>

/**
 * Build Cache-Control and CDN-Cache-Control header values.
 * CDN-Cache-Control is recognized by Cloudflare to set edge TTL
 * independently of browser TTL.
 */
export function buildCacheHeaders(
  profile: CacheProfile
): Record<string, string> {
  const parts: string[] = []

  if (profile.isPrivate) {
    parts.push('private')
  } else {
    parts.push('public')
  }

  parts.push(`max-age=${profile.browserMaxAge}`)

  if (profile.swr) {
    parts.push(`stale-while-revalidate=${profile.swr}`)
  }

  const headers: Record<string, string> = {
    'Cache-Control': parts.join(', '),
  }

  // CDN-Cache-Control lets Cloudflare cache independently of browser
  if (!profile.isPrivate && profile.cdnMaxAge > 0) {
    headers['CDN-Cache-Control'] = `max-age=${profile.cdnMaxAge}`
  }

  return headers
}
