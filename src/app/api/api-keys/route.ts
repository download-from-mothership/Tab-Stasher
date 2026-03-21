import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'
import { generateApiKey, hashApiKey } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

// GET /api/api-keys — List user's API keys
export async function GET() {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, scopes, last_used_at, expires_at, revoked_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ api_keys: data })
}

// POST /api/api-keys — Create a new API key
export async function POST(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const name = body.name || 'Default API Key'
  const scopes = body.scopes || ['read']
  const expiresInDays = body.expires_in_days || null

  // Validate scopes
  const validScopes = ['read', 'write', 'delete']
  if (!scopes.every((s: string) => validScopes.includes(s))) {
    return NextResponse.json(
      { error: 'Invalid scopes. Valid: read, write, delete' },
      { status: 400 }
    )
  }

  const { key, prefix, hash } = generateApiKey()
  const expiresAt = expiresInDays
    ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
    : null

  const { data, error } = await supabase
    .from('api_keys')
    .insert({
      user_id: user.id,
      name,
      key_hash: hash,
      key_prefix: prefix,
      scopes,
      expires_at: expiresAt,
    })
    .select('id, name, key_prefix, scopes, expires_at, created_at')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return the full key only on creation — it can never be retrieved again
  return NextResponse.json({
    api_key: { ...data, key },
    message: 'Save this key — it will not be shown again.',
  })
}

// DELETE /api/api-keys — Revoke an API key
export async function DELETE(request: Request) {
  const supabase = await createSupabaseServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const keyId = searchParams.get('id')
  if (!keyId) {
    return NextResponse.json({ error: 'id query parameter required' }, { status: 400 })
  }

  const { error } = await supabase
    .from('api_keys')
    .update({ revoked_at: new Date().toISOString() })
    .eq('id', keyId)
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ message: 'API key revoked' })
}
