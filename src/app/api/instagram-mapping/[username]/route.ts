import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { corsHeaders } from '@/app/_shared/cors'
import { cache } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const { createServerClient } = await import('@supabase/ssr')
  
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name: string) => {
          const cookie = request.cookies.get(name)
          return cookie?.value
        },
        set: (name: string, value: string, options: any) => {
          // Handle cookie setting if needed
        },
        remove: (name: string, options: any) => {
          // Handle cookie removal if needed
        },
      },
    }
  )

  try {
    const { username } = await params

    if (!username) {
      return NextResponse.json(
        { error: 'Instagram username is required' },
        { status: 400, headers: corsHeaders }
      )
    }

    // Check cache first (5 minute TTL)
    const cacheKey = `instagram_mapping:${username}`
    const cached = cache.get<any>(cacheKey)
    if (cached) {
      return NextResponse.json(cached, { status: 200, headers: corsHeaders })
    }

    // Get Instagram mapping for the username
    const { data: mapping, error } = await supabase
      .from('instagram_user_mappings')
      .select('*')
      .eq('instagram_username', username)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return NextResponse.json(
          { error: 'Instagram username not found' },
          { status: 404, headers: corsHeaders }
        )
      }
      
      console.error('Error fetching Instagram mapping:', error)
      return NextResponse.json(
        { error: 'Failed to fetch mapping' },
        { status: 500, headers: corsHeaders }
      )
    }

    const response = {
      instagram_username: mapping.instagram_username,
      tabstasher_user_id: mapping.tabstasher_user_id,
      is_verified: !!mapping.verified_at,
      verified_at: mapping.verified_at,
      created_at: mapping.created_at
    }

    // Cache the result for 5 minutes
    cache.set(cacheKey, response, 5 * 60 * 1000)

    return NextResponse.json(response, { status: 200, headers: corsHeaders })
  } catch (error) {
    console.error('Error in Instagram mapping GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers: corsHeaders }
    )
  }
}
