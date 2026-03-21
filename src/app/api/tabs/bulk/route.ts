import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const MAX_BULK_TABS = 100

interface BulkTabRequest {
  url: string
  title?: string
  description?: string
  image?: string
  favicon?: string
  content?: string
  tags?: string[]
  primaryCategory?: string
  secondaryCategory?: string
  confidence?: number
}

export async function POST(request: Request) {
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Supabase configuration is not complete' },
      { status: 500 }
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  })

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers })
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers }
      )
    }

    const body = await request.json()
    const { tabs } = body as { tabs: BulkTabRequest[] }

    if (!Array.isArray(tabs) || tabs.length === 0) {
      return NextResponse.json(
        { error: 'Request body must contain a non-empty "tabs" array' },
        { status: 400, headers }
      )
    }

    if (tabs.length > MAX_BULK_TABS) {
      return NextResponse.json(
        { error: `Maximum ${MAX_BULK_TABS} tabs per bulk request` },
        { status: 400, headers }
      )
    }

    // Validate all tabs have URLs
    const invalidTabs = tabs.filter((t, i) => !t.url)
    if (invalidTabs.length > 0) {
      return NextResponse.json(
        { error: 'All tabs must have a URL' },
        { status: 400, headers }
      )
    }

    const results: { saved: any[]; errors: { url: string; error: string }[] } = {
      saved: [],
      errors: [],
    }

    // Process tabs sequentially to avoid RPC race conditions
    for (const tab of tabs) {
      try {
        const primaryCategory = (tab.primaryCategory || 'uncategorized').toLowerCase().trim()
        const secondaryCategory = (tab.secondaryCategory || 'general').toLowerCase().trim()
        const confidence = tab.confidence || 0.5
        const autoCategorizedAt =
          tab.primaryCategory && primaryCategory !== 'uncategorized'
            ? new Date().toISOString()
            : null

        const tagNames = Array.from(new Set(tab.tags || []))

        const { data, error } = await supabase.rpc('save_tab_with_tags', {
          p_url: tab.url,
          p_title: tab.title || null,
          p_description: tab.description || null,
          p_image: tab.image || null,
          p_favicon: tab.favicon || null,
          p_content: tab.content || null,
          p_primary_category: primaryCategory,
          p_secondary_category: secondaryCategory,
          p_category_confidence: confidence,
          p_auto_categorized_at: autoCategorizedAt,
          p_tag_names: tagNames,
          p_user_id: user.id,
        })

        if (error || !data?.[0]?.success) {
          results.errors.push({
            url: tab.url,
            error: error?.message || data?.[0]?.error_message || 'Unknown error',
          })
          continue
        }

        results.saved.push({
          id: data[0].tab_id,
          url: tab.url,
          title: tab.title,
          is_duplicate: data[0].is_duplicate || false,
        })
      } catch (err: any) {
        results.errors.push({
          url: tab.url,
          error: err.message || 'Unknown error',
        })
      }
    }

    return NextResponse.json(
      {
        total: tabs.length,
        saved: results.saved.length,
        errors: results.errors.length,
        results: results.saved,
        failures: results.errors,
      },
      { headers }
    )
  } catch (error) {
    console.error('Error in POST /api/tabs/bulk:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    )
  }
}
