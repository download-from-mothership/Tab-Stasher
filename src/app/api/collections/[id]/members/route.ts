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

// GET /api/collections/:id/members — list members
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check user is owner or member
    const { data: collection } = await supabase
      .from('collections')
      .select('id, user_id')
      .eq('id', id)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 })
    }

    const isOwner = collection.user_id === user.id
    if (!isOwner) {
      const { data: membership } = await supabase
        .from('collection_members')
        .select('id')
        .eq('collection_id', id)
        .eq('user_id', user.id)
        .single()
      if (!membership) {
        return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
      }
    }

    const { data: members, error } = await supabase
      .from('collection_members')
      .select('*')
      .eq('collection_id', id)
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(members || [])
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/collections/:id/members — invite a user by email
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only owner can invite
    const { data: collection } = await supabase
      .from('collections')
      .select('id, user_id, name')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Collection not found or not owned' }, { status: 404 })
    }

    const body = await request.json()
    const { email, role = 'viewer' } = body

    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 })
    }
    if (!['viewer', 'editor', 'admin'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Look up user by email using admin-level query
    // Since we can't query auth.users directly, we store the invite with email in metadata
    // and the invited user claims it on login
    const { data: member, error: insertError } = await supabase
      .from('collection_members')
      .insert({
        collection_id: id,
        user_id: user.id, // Placeholder — will be updated when invited user accepts
        role,
        invited_by: user.id,
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({ error: 'User is already a member' }, { status: 409 })
      }
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Log activity
    await supabase.from('activity_log').insert({
      user_id: user.id,
      action: 'invited_member',
      entity_type: 'collection',
      entity_id: id,
      metadata: { email, role, collection_name: collection.name },
    })

    return NextResponse.json(member, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/collections/:id/members — remove a member
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await getSupabaseServer()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { memberId } = body

    if (!memberId) {
      return NextResponse.json({ error: 'memberId is required' }, { status: 400 })
    }

    // Only owner can remove members
    const { data: collection } = await supabase
      .from('collections')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (!collection) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error } = await supabase
      .from('collection_members')
      .delete()
      .eq('id', memberId)
      .eq('collection_id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
