import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_CONTENT_CHARS = 8000
const MAX_BATCH_SIZE = 10

export async function POST(request: Request) {
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const { generateText } = await import('@/lib/gemini')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase configuration is not complete' }, { status: 500 })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value },
      set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
      remove(name: string, options: any) { cookieStore.delete({ name, ...options }) },
    },
  })

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers })
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
    }

    const body = await request.json()
    const { ids } = body as { ids?: string[] }

    let query = supabase
      .from('tabs')
      .select('id, title, url, content, description')
      .eq('status', 'active')
      .eq('user_id', user.id)
      .is('summary', null)
      .not('content', 'is', null)

    if (ids && Array.isArray(ids) && ids.length > 0) {
      query = query.in('id', ids.slice(0, MAX_BATCH_SIZE))
    } else {
      query = query.order('created_at', { ascending: false }).limit(MAX_BATCH_SIZE)
    }

    const { data: tabs, error } = await query

    if (error) {
      console.error('Summary query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500, headers })
    }

    if (!tabs || tabs.length === 0) {
      return NextResponse.json({ summarized: 0, results: [] }, { headers })
    }

    const results: { id: string; summary: string; error?: string }[] = []

    for (const tab of tabs) {
      try {
        const content = (tab.content || '').slice(0, MAX_CONTENT_CHARS)
        const prompt = `Summarize this webpage in 2-3 concise sentences. Focus on the key information and purpose of the page. Do not include any preamble — just the summary.

Title: ${tab.title || 'Unknown'}
URL: ${tab.url}
Content:
${content}`

        const response = await generateText(prompt)

        if (response.error || !response.text) {
          results.push({ id: tab.id, summary: '', error: response.error || 'Empty response' })
          continue
        }

        const summary = response.text.trim()

        const { error: updateError } = await supabase
          .from('tabs')
          .update({ summary, summarized_at: new Date().toISOString() })
          .eq('id', tab.id)
          .eq('user_id', user.id)

        if (updateError) {
          results.push({ id: tab.id, summary, error: updateError.message })
        } else {
          results.push({ id: tab.id, summary })
        }
      } catch (err) {
        results.push({
          id: tab.id,
          summary: '',
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const summarized = results.filter(r => !r.error).length

    return NextResponse.json({ summarized, total: tabs.length, results }, { headers })
  } catch (error) {
    console.error('Error in POST /api/tabs/summarize:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers })
  }
}
