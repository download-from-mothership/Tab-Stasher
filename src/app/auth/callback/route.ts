import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  console.log('Auth callback called with URL:', requestUrl.toString())
  console.log('Code present:', !!code)

  if (code) {
    const supabase = createRouteHandlerClient({ cookies })
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    console.log('Session exchange result:', { data, error })
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/login', requestUrl.origin))
    }

    // Get the session to verify it worked
    const { data: { session } } = await supabase.auth.getSession()
    console.log('Session after exchange:', session)
  }

  // URL to redirect to after sign in process completes
  const redirectUrl = new URL('/dashboard', requestUrl.origin)
  console.log('Redirecting to:', redirectUrl.toString())
  return NextResponse.redirect(redirectUrl)
} 