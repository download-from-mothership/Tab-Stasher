import { NextResponse } from 'next/server'
import { getCorsHeaders } from '@/app/_shared/cors'
import { SWRCache, dedupRequest } from '@/lib/cache'
import { trackedQuery } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

// Analytics cache: fresh for 30s, serve stale up to 5min while revalidating
const analyticsCache = new SWRCache<any>({
  freshMs: 30_000,
  staleMs: 5 * 60_000,
  maxEntries: 50,
})

async function fetchAnalytics(userId: string, supabase: any) {
  // Fetch all active tabs with tags — tracked for slow query detection
  const { data: tabs, error: tabsError } = await trackedQuery(
    'analytics:fetch-tabs',
    () =>
      supabase
        .from('tabs')
        .select(`
          id, url, title, primary_category, secondary_category, created_at, status,
          is_read, reading_list_added_at, summary,
          tabs_tags ( tags ( name ) )
        `)
        .eq('user_id', userId)
        .eq('status', 'active')
        .order('created_at', { ascending: true }),
    2000 // analytics queries can be slower
  )

  if (tabsError) throw tabsError

  const allTabs = tabs || []

  // --- Category distribution ---
  const categoryMap: Record<string, number> = {}
  for (const tab of allTabs) {
    const cat = tab.primary_category || 'Uncategorized'
    categoryMap[cat] = (categoryMap[cat] || 0) + 1
  }
  const categories = Object.entries(categoryMap)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  // --- Top domains ---
  const domainMap: Record<string, number> = {}
  for (const tab of allTabs) {
    try {
      const hostname = new URL(tab.url).hostname.replace(/^www\./, '')
      domainMap[hostname] = (domainMap[hostname] || 0) + 1
    } catch {}
  }
  const topDomains = Object.entries(domainMap)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // --- Saves over time (daily, last 30 days) ---
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
  const dailySaves: Record<string, number> = {}

  for (let i = 0; i < 30; i++) {
    const d = new Date(thirtyDaysAgo.getTime() + i * 24 * 60 * 60 * 1000)
    const key = d.toISOString().split('T')[0]
    dailySaves[key] = 0
  }

  for (const tab of allTabs) {
    const date = new Date(tab.created_at)
    if (date >= thirtyDaysAgo) {
      const key = date.toISOString().split('T')[0]
      dailySaves[key] = (dailySaves[key] || 0) + 1
    }
  }

  const savesOverTime = Object.entries(dailySaves)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  // --- Weekly saves (last 12 weeks) ---
  const twelveWeeksAgo = new Date(now.getTime() - 12 * 7 * 24 * 60 * 60 * 1000)
  const weeklySaves: Record<string, number> = {}
  for (const tab of allTabs) {
    const date = new Date(tab.created_at)
    if (date >= twelveWeeksAgo) {
      const d = new Date(date)
      d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
      const key = d.toISOString().split('T')[0]
      weeklySaves[key] = (weeklySaves[key] || 0) + 1
    }
  }
  const savesByWeek = Object.entries(weeklySaves)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStart, count]) => ({ weekStart, count }))

  // --- Top tags ---
  const tagMap: Record<string, number> = {}
  for (const tab of allTabs) {
    const tabTags = (tab.tabs_tags || []).flatMap((rel: any) => {
      const t = Array.isArray(rel.tags) ? rel.tags : rel.tags ? [rel.tags] : []
      return t.map((tag: any) => tag?.name as string).filter(Boolean)
    })
    for (const tag of tabTags) {
      tagMap[tag] = (tagMap[tag] || 0) + 1
    }
  }
  const topTags = Object.entries(tagMap)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15)

  // --- Summary stats ---
  const totalTabs = allTabs.length
  const summarizedCount = allTabs.filter((t: any) => t.summary).length
  const readingListCount = allTabs.filter((t: any) => t.reading_list_added_at).length
  const readCount = allTabs.filter((t: any) => t.is_read).length
  const uniqueDomains = Object.keys(domainMap).length
  const uniqueCategories = Object.keys(categoryMap).length

  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
  const thisWeekSaves = allTabs.filter((t: any) => new Date(t.created_at) >= oneWeekAgo).length
  const lastWeekSaves = allTabs.filter((t: any) => {
    const d = new Date(t.created_at)
    return d >= twoWeeksAgo && d < oneWeekAgo
  }).length

  return {
    stats: {
      totalTabs,
      summarizedCount,
      readingListCount,
      readCount,
      uniqueDomains,
      uniqueCategories,
      thisWeekSaves,
      lastWeekSaves,
    },
    categories,
    topDomains,
    topTags,
    savesOverTime,
    savesByWeek,
  }
}

export async function GET(request: Request) {
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')

  const headers = getCorsHeaders(request.headers.get('origin'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: 'Supabase configuration is not complete' }, { status: 500, headers })
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) { return cookieStore.get(name)?.value },
      set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
      remove(name: string, options: any) { cookieStore.delete({ name, ...options }) },
    },
  })

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers })
    }

    const cacheKey = `analytics:${user.id}`

    // Try SWR cache first — dedup concurrent requests for the same user
    const revalidate = () => fetchAnalytics(user.id, supabase)
    const cached = await analyticsCache.get(cacheKey, revalidate)

    let result: any
    if (cached) {
      result = cached
    } else {
      // Cache miss — deduplicate concurrent requests
      result = await dedupRequest(cacheKey, revalidate)
      analyticsCache.set(cacheKey, result)
    }

    return NextResponse.json(result, {
      headers: {
        ...headers,
        // Allow browsers / CDN to cache for 30s, serve stale up to 5min
        'Cache-Control': 'private, max-age=30, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('Error in GET /api/tabs/analytics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers })
  }
}
