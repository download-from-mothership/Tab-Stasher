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

  // Get authenticated user - this is the secure way to check authentication
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  // Log detailed authentication information
  console.log('Authentication check details:', {
    hasUser: !!user,
    userError: userError?.message,
    cookies: {
      'sb-access-token': !!req.cookies.get('sb-access-token'),
      'sb-refresh-token': !!req.cookies.get('sb-refresh-token')
    },
    path: req.nextUrl.pathname
  })
  
  if (user) {
    console.log('User details:', {
      user: user.email,
      userId: user.id
    })
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

  // Redirect if accessing protected routes without authenticated user
  if (isProtectedRoute && !user) {
    console.log('Redirecting to login - no authenticated user for protected route')
    const redirectUrl = new URL('/login', req.url)
    return NextResponse.redirect(redirectUrl)
  }

  // Redirect if accessing auth pages with authenticated user
  if (isAuthPage && user) {
    console.log('Redirecting to dashboard - authenticated user present on auth page')
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