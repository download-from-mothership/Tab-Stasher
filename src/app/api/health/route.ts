import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'
export const runtime = 'edge'

interface CheckResult {
  status: 'ok' | 'degraded' | 'down'
  latencyMs?: number
  error?: string
}

async function checkSupabase(): Promise<CheckResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) return { status: 'down', error: 'Missing config' }

  const start = Date.now()
  try {
    const res = await fetch(`${url}/rest/v1/`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(5000),
    })
    const latencyMs = Date.now() - start
    if (!res.ok) return { status: 'down', latencyMs, error: `HTTP ${res.status}` }
    return { status: latencyMs > 2000 ? 'degraded' : 'ok', latencyMs }
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: (e as Error).message }
  }
}

async function checkGemini(): Promise<CheckResult> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return { status: 'down', error: 'Missing GEMINI_API_KEY' }

  const start = Date.now()
  try {
    const res = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models?key=' + key,
      { signal: AbortSignal.timeout(5000) }
    )
    const latencyMs = Date.now() - start
    if (!res.ok) return { status: 'down', latencyMs, error: `HTTP ${res.status}` }
    return { status: latencyMs > 3000 ? 'degraded' : 'ok', latencyMs }
  } catch (e) {
    return { status: 'down', latencyMs: Date.now() - start, error: (e as Error).message }
  }
}

export async function GET() {
  const [supabase, gemini] = await Promise.all([
    checkSupabase(),
    checkGemini(),
  ])

  const checks = { supabase, gemini }
  const allDown = Object.values(checks).every((c) => c.status === 'down')
  const anyDown = Object.values(checks).some((c) => c.status === 'down')
  const anyDegraded = Object.values(checks).some((c) => c.status === 'degraded')

  const overall = allDown ? 'down' : anyDown || anyDegraded ? 'degraded' : 'ok'
  const httpStatus = overall === 'down' ? 503 : overall === 'degraded' ? 200 : 200

  return NextResponse.json(
    {
      status: overall,
      timestamp: new Date().toISOString(),
      checks,
    },
    { status: httpStatus }
  )
}
