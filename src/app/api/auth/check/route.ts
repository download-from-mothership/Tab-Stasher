import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
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

    // Create Supabase client
    const cookieStore = await cookies()
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
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
      }
    )

    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers })
    }

    // Check authentication
    const { data: { user }, error } = await supabase.auth.getUser()

    if (error || !user) {
      console.log('Auth check failed:', error?.message)
      return NextResponse.json(
        {
          isAuthenticated: false,
          user: null
        },
        { status: 200, headers }
      )
    }

    console.log('Auth check successful for user:', user.email)
    return NextResponse.json(
      {
        isAuthenticated: true,
        user: {
          id: user.id,
          email: user.email,
        }
      },
      { status: 200, headers }
    )
  } catch (error) {
    console.error('Error in auth check:', error)
    return NextResponse.json(
      {
        isAuthenticated: false,
        error: 'Internal server error'
      },
      { status: 500 }
    )
  }
}
