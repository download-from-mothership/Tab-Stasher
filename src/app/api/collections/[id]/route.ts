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

// GET /api/collections/:id — get a single collection with its tabs
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: collection, error } = await supabase
      .from('collections')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    // Get tabs in this collection
    const { data: tabLinks } = await supabase
      .from('tabs_collections')
      .select(`
        position,
        tabs (
          *,
          tabs_tags (
            tags ( name )
          )
        )
      `)
      .eq('collection_id', id)
      .order('position', { ascending: true })

    const tabs = (tabLinks || []).map((link: any) => {
      if (!link.tabs) return null
      const { tabs_tags, ...tabData } = link.tabs
      const tags = (tabs_tags || []).flatMap((r: any) => {
        const arr = Array.isArray(r.tags) ? r.tags : r.tags ? [r.tags] : []
        return arr.map((t: any) => t?.name).filter(Boolean)
      })
      return { ...tabData, tags, position: link.position }
    }).filter(Boolean)

    return NextResponse.json({ ...collection, tabs, tab_count: tabs.length })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/collections/:id — update collection name/description/icon
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const updates: Record<string, any> = {}
    if (body.name !== undefined) updates.name = body.name.trim()
    if (body.description !== undefined) updates.description = body.description?.trim() || null
    if (body.icon !== undefined) updates.icon = body.icon

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    const { data: collection, error } = await supabase
      .from('collections')
      .update(updates)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'A collection with this name already exists' }, { status: 409 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(collection)
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/collections/:id — delete a collection (does not delete tabs)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('collections')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
