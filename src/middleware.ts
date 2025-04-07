import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { corsHeaders } from '@/app/_shared/cors'

export async function middleware(req: NextRequest) {
  console.log('Middleware called for path:', req.nextUrl.pathname)

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new NextResponse(null, { headers: corsHeaders })
  }

  const res = NextResponse.next()

  // Create a Supabase client with explicit cookie handling
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => {
          const cookie = req.cookies.get(name)
          console.log(`Getting cookie ${name}:`, cookie ? 'present' : 'absent')
          return cookie?.value
        },
        set: (name, value, options) => {
          console.log(`Setting cookie ${name}`)
          res.cookies.set({ name, value, ...options })
        },
        remove: (name, options) => {
          console.log(`Removing cookie ${name}`)
          res.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()
  
  // Log detailed session information
  console.log('Session check details:', {
    hasSession: !!session,
    sessionError: sessionError?.message,
    cookies: {
      'sb-access-token': !!req.cookies.get('sb-access-token'),
      'sb-refresh-token': !!req.cookies.get('sb-refresh-token')
    },
    path: req.nextUrl.pathname
  })
  
  if (session) {
    console.log('Session details:', {
      user: session.user.email,
      expiresAt: new Date(session.expires_at! * 1000).toISOString(),
      isExpired: Date.now() > session.expires_at! * 1000
    })

    // If session is expired, try to refresh it
    if (Date.now() > session.expires_at! * 1000) {
      console.log('Session expired, attempting refresh')
      const { data: { session: refreshedSession }, error: refreshError } = 
        await supabase.auth.refreshSession()
      
      if (refreshError) {
        console.error('Session refresh failed:', refreshError)
      } else if (refreshedSession) {
        console.log('Session refreshed successfully')
      }
    }
  }

  // Add CORS headers to all responses
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.headers.set(key, value)
  })

  // Get the pathname of the request
  const path = req.nextUrl.pathname

  // Define protected and public paths
  const isAuthPage = path.startsWith('/login') || path.startsWith('/signup')
  const isApiRoute = path.startsWith('/api')
  const isProtectedRoute = path.startsWith('/dashboard')
  const isAuthCallback = path.startsWith('/auth/callback')
  
  // If this is an auth callback, let it through
  if (isAuthCallback) {
    console.log('Allowing auth callback through')
    return res
  }

  // Redirect if accessing protected routes without session
  if (isProtectedRoute && !session) {
    console.log('Redirecting to login - no session for protected route')
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect if accessing auth pages with session
  if (isAuthPage && session) {
    console.log('Redirecting to dashboard - session present on auth page')
    const redirectUrl = new URL('/dashboard', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  return res
}

// Ensure the middleware is only called for relevant paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
    '/dashboard/:path*',
    '/login',
    '/signup',
    '/auth/callback',
  ],
} 