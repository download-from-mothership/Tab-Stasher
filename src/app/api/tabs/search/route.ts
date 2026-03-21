import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(request.url)
  const q = url.searchParams.get('q') || ''
  const category = url.searchParams.get('category') || ''
  const domain = url.searchParams.get('domain') || ''
  const tag = url.searchParams.get('tag') || ''
  const dateFrom = url.searchParams.get('dateFrom') || ''
  const dateTo = url.searchParams.get('dateTo') || ''
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 200)
  const offset = parseInt(url.searchParams.get('offset') || '0', 10)

  try {
    let query = supabase
      .from('tabs')
      .select(`
        *,
        tabs_tags (
          tags (
            name
          )
        )
      `)
      .eq('status', 'active')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Full-text search across title, description, url, content
    if (q.trim()) {
      // Use PostgreSQL ilike for flexible matching across multiple columns
      // Build OR filter for multi-column search
      const searchTerm = `%${q.trim()}%`
      query = query.or(
        `title.ilike.${searchTerm},description.ilike.${searchTerm},url.ilike.${searchTerm},content.ilike.${searchTerm}`
      )
    }

    // Category filter
    if (category) {
      query = query.eq('primary_category', category.toLowerCase())
    }

    // Domain filter — match against the url column
    if (domain) {
      query = query.ilike('url', `%${domain}%`)
    }

    // Date range filters
    if (dateFrom) {
      query = query.gte('created_at', new Date(dateFrom).toISOString())
    }
    if (dateTo) {
      // Set to end of day
      const endDate = new Date(dateTo)
      endDate.setHours(23, 59, 59, 999)
      query = query.lte('created_at', endDate.toISOString())
    }

    // Pagination
    query = query.range(offset, offset + limit - 1)

    const { data: tabsWithTags, error: queryError } = await query

    if (queryError) {
      console.error('Search query error:', queryError)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    // Process tags from joined data
    const results = (tabsWithTags || []).map((tab: any) => {
      const tags = (tab.tabs_tags || []).flatMap((relation: any) => {
        const tagsArr = Array.isArray(relation.tags)
          ? relation.tags
          : relation.tags
            ? [relation.tags]
            : []
        return tagsArr.map((t: any) => t?.name as string).filter(Boolean)
      })
      const { tabs_tags, ...tabData } = tab
      return { ...tabData, tags }
    })

    // Post-filter by tag if specified (tags are in a junction table, can't filter in main query)
    const filtered = tag
      ? results.filter((tab: any) =>
          tab.tags.some((t: string) => t.toLowerCase() === tag.toLowerCase())
        )
      : results

    // Get all distinct categories for filter options (separate lightweight query)
    const { data: catRows } = await supabase
      .from('tabs')
      .select('primary_category')
      .eq('status', 'active')
      .eq('user_id', user.id)
      .not('primary_category', 'is', null)

    const categories = [...new Set((catRows || []).map((r: any) => r.primary_category).filter(Boolean))].sort()

    // Get all distinct tags for filter options
    const { data: tagRows } = await supabase
      .from('tags')
      .select('name')
      .eq('user_id', user.id)
      .order('name')

    const allTags = (tagRows || []).map((r: any) => r.name).filter(Boolean)

    return NextResponse.json({
      results: filtered,
      total: filtered.length,
      categories,
      tags: allTags,
      hasMore: (tabsWithTags || []).length === limit,
    })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
