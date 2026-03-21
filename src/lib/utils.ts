import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

/**
 * Normalizes a URL for duplicate detection
 * Handles:
 * - Protocol normalization (http -> https)
 * - Trailing slash removal
 * - www. prefix removal
 * - Query parameter sorting (optional, can be enabled)
 * - Fragment removal
 * - Lowercase hostname
 */
export function normalizeUrl(url: string, options?: { removeQueryParams?: boolean }): string {
  if (!url) return ''
  
  try {
    // Ensure URL has a protocol
    let normalized = url.trim()
    if (!normalized.match(/^https?:\/\//i)) {
      normalized = 'https://' + normalized
    }
    
    const urlObj = new URL(normalized)
    
    // Normalize protocol to https
    urlObj.protocol = 'https:'
    
    // Normalize hostname to lowercase and remove www
    let hostname = urlObj.hostname.toLowerCase()
    if (hostname.startsWith('www.')) {
      hostname = hostname.substring(4)
    }
    urlObj.hostname = hostname
    
    // Remove fragment (hash)
    urlObj.hash = ''
    
    // Remove trailing slash from pathname (except for root)
    let pathname = urlObj.pathname
    if (pathname.length > 1 && pathname.endsWith('/')) {
      pathname = pathname.slice(0, -1)
    }
    urlObj.pathname = pathname
    
    // Optionally remove query parameters
    if (options?.removeQueryParams) {
      urlObj.search = ''
    } else {
      // Sort query parameters for consistency
      const params = new URLSearchParams(urlObj.search)
      const sortedParams = new URLSearchParams()
      Array.from(params.keys())
        .sort()
        .forEach(key => {
          params.getAll(key).forEach(value => {
            sortedParams.append(key, value)
          })
        })
      urlObj.search = sortedParams.toString()
    }
    
    return urlObj.toString()
  } catch (error) {
    // If URL parsing fails, return original URL lowercased
    console.warn('Failed to normalize URL:', url, error)
    return url.toLowerCase().trim()
  }
} 