import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Create an authenticated Supabase server client for use in API routes.
 *
 * Uses Supabase's built-in connection pooling via the REST endpoint.
 * For direct Postgres access (e.g. migrations, heavy analytics),
 * connect through the pooler URL (port 6543) instead.
 *
 * Configure the pooler URL via SUPABASE_DB_POOLER_URL env var.
 */
export async function createSupabaseServer() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase configuration')
  }

  const cookieStore = await cookies()

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: any) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: any) {
        cookieStore.delete({ name, ...options })
      },
    },
    // Supabase JS client uses PostgREST (HTTP) by default which goes through
    // Supabase's built-in PgBouncer pool. No additional pooling config needed
    // for the REST API path.
    global: {
      headers: {
        // Help identify slow queries in Supabase logs
        'X-Client-Info': 'tab-stasher-server',
      },
    },
  })
}

/**
 * Execute a Supabase query with slow-query logging.
 * Logs a warning if the query exceeds the threshold (default 1000ms).
 */
export async function trackedQuery<T>(
  label: string,
  queryFn: () => Promise<{ data: T; error: any }>,
  thresholdMs = 1000
): Promise<{ data: T; error: any; durationMs: number }> {
  const start = Date.now()
  const result = await queryFn()
  const durationMs = Date.now() - start

  if (durationMs > thresholdMs) {
    console.warn(
      `[slow-query] ${label}: ${durationMs}ms (threshold: ${thresholdMs}ms)`
    )
  }

  return { ...result, durationMs }
}
