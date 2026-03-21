import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateApiKey, requireScopes, apiCorsHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: apiCorsHeaders })
}

// GET /api/v1/tags — List all tags with usage counts
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401, headers: apiCorsHeaders })
  }

  const scopeErr = requireScopes(auth, ['read'])
  if (scopeErr) return scopeErr

  const supabase = getServiceClient()

  // Get tags that belong to this user's tabs
  const { data, error } = await supabase
    .from('tags')
    .select(`
      id, name,
      tabs_tags ( tab_id )
    `)
    .eq('user_id', auth.userId)
    .order('name', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500, headers: apiCorsHeaders })
  }

  const tags = (data || []).map((tag: any) => ({
    id: tag.id,
    name: tag.name,
    tab_count: (tag.tabs_tags || []).length,
  }))

  return NextResponse.json({ data: tags }, { headers: apiCorsHeaders })
}
