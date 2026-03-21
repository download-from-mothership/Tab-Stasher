import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function getSupabaseServer() {
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set({ name, value, ...options }) },
        remove(name: string, options: any) { cookieStore.delete({ name, ...options }) },
      },
    }
  )
}

// POST /api/collections/:id/tabs — add tabs to collection
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const tabIds: string[] = Array.isArray(body.tabIds) ? body.tabIds : [body.tabId].filter(Boolean)

    if (tabIds.length === 0) {
      return NextResponse.json({ error: 'tabIds required' }, { status: 400 })
    }

    // Get current max position
    const { data: maxPos } = await supabase
      .from('tabs_collections')
      .select('position')
      .eq('collection_id', id)
      .order('position', { ascending: false })
      .limit(1)

    let nextPosition = (maxPos?.[0]?.position ?? -1) + 1

    const rows = tabIds.map((tabId) => ({
      tab_id: tabId,
      collection_id: id,
      position: nextPosition++,
    }))

    const { error } = await supabase
      .from('tabs_collections')
      .upsert(rows, { onConflict: 'tab_id,collection_id' })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Touch collection updated_at
    await supabase
      .from('collections')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', id)

    return NextResponse.json({ added: tabIds.length })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/collections/:id/tabs — remove tabs from collection
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const tabIds: string[] = Array.isArray(body.tabIds) ? body.tabIds : [body.tabId].filter(Boolean)

    if (tabIds.length === 0) {
      return NextResponse.json({ error: 'tabIds required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('tabs_collections')
      .delete()
      .eq('collection_id', id)
      .in('tab_id', tabIds)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ removed: tabIds.length })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
