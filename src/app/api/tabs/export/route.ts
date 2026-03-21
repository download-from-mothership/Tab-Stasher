import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')

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

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const format = searchParams.get('format') || 'json'
    const category = searchParams.get('category')
    const ids = searchParams.get('ids') // comma-separated tab IDs

    let query = supabase
      .from('tabs')
      .select(`
        id, url, title, description, primary_category, secondary_category,
        created_at, summary, is_read, reading_list_added_at,
        tabs_tags ( tags ( name ) )
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })

    if (category) {
      query = query.eq('primary_category', category)
    }
    if (ids) {
      query = query.in('id', ids.split(','))
    }

    const { data: tabs, error: tabsError } = await query

    if (tabsError) {
      return NextResponse.json({ error: tabsError.message }, { status: 500 })
    }

    const exportTabs = (tabs || []).map((tab: any) => {
      const tags = (tab.tabs_tags || []).flatMap((rel: any) => {
        const t = Array.isArray(rel.tags) ? rel.tags : rel.tags ? [rel.tags] : []
        return t.map((tag: any) => tag?.name as string).filter(Boolean)
      })
      const { tabs_tags, ...rest } = tab
      return { ...rest, tags }
    })

    if (format === 'csv') {
      const csvHeader = 'Title,URL,Category,Tags,Created At,Summary'
      const csvRows = exportTabs.map((t: any) => {
        const escape = (s: string) => `"${(s || '').replace(/"/g, '""')}"`
        return [
          escape(t.title || ''),
          escape(t.url),
          escape(t.primary_category || ''),
          escape(t.tags.join(', ')),
          escape(t.created_at),
          escape(t.summary || ''),
        ].join(',')
      })
      const csv = [csvHeader, ...csvRows].join('\n')
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="tab-stasher-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      })
    }

    if (format === 'markdown') {
      const grouped: Record<string, any[]> = {}
      for (const tab of exportTabs) {
        const cat = tab.primary_category || 'Uncategorized'
        if (!grouped[cat]) grouped[cat] = []
        grouped[cat].push(tab)
      }

      const lines = [`# Tab Stasher Export`, ``, `Exported on ${new Date().toLocaleDateString()}`, `Total: ${exportTabs.length} tabs`, ``]
      for (const [category, catTabs] of Object.entries(grouped).sort()) {
        lines.push(`## ${category}`, ``)
        for (const tab of catTabs) {
          lines.push(`- [${tab.title || tab.url}](${tab.url})`)
          if (tab.tags.length > 0) lines.push(`  Tags: ${tab.tags.join(', ')}`)
          if (tab.summary) lines.push(`  > ${tab.summary}`)
          lines.push(``)
        }
      }
      const md = lines.join('\n')
      return new Response(md, {
        headers: {
          'Content-Type': 'text/markdown',
          'Content-Disposition': `attachment; filename="tab-stasher-export-${new Date().toISOString().split('T')[0]}.md"`,
        },
      })
    }

    if (format === 'bookmarks') {
      const grouped: Record<string, any[]> = {}
      for (const tab of exportTabs) {
        const cat = tab.primary_category || 'Uncategorized'
        if (!grouped[cat]) grouped[cat] = []
        grouped[cat].push(tab)
      }

      const lines = [
        '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
        '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
        '<TITLE>Tab Stasher Bookmarks</TITLE>',
        '<H1>Tab Stasher Bookmarks</H1>',
        '<DL><p>',
      ]
      for (const [category, catTabs] of Object.entries(grouped).sort()) {
        lines.push(`  <DT><H3>${escapeHtml(category)}</H3>`)
        lines.push('  <DL><p>')
        for (const tab of catTabs) {
          const addDate = Math.floor(new Date(tab.created_at).getTime() / 1000)
          lines.push(`    <DT><A HREF="${escapeHtml(tab.url)}" ADD_DATE="${addDate}">${escapeHtml(tab.title || tab.url)}</A>`)
        }
        lines.push('  </DL><p>')
      }
      lines.push('</DL><p>')
      const html = lines.join('\n')
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="tab-stasher-bookmarks-${new Date().toISOString().split('T')[0]}.html"`,
        },
      })
    }

    // Default: JSON
    return NextResponse.json({ tabs: exportTabs, count: exportTabs.length })

  } catch (error) {
    console.error('Error in GET /api/tabs/export:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
