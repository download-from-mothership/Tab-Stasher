import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { corsHeaders } from '@/app/_shared/cors'

const INSTAGRAM_CONFIG = {
  clientId: process.env.INSTAGRAM_APP_ID!,
  clientSecret: process.env.INSTAGRAM_APP_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_SITE_URL}/api/instagram/callback`
}

// Validate configuration
if (!INSTAGRAM_CONFIG.clientId || !INSTAGRAM_CONFIG.clientSecret) {
  console.warn('Instagram OAuth not configured. INSTAGRAM_APP_ID and INSTAGRAM_APP_SECRET must be set.')
}

export async function GET(request: NextRequest) {
  const { createServerClient } = await import('@supabase/ssr')
  
  // Helper to create redirect response
  const createRedirectResponse = (url: string) => {
    try {
      const redirectUrl = url.startsWith('http') ? new URL(url) : new URL(url, request.url)
      return NextResponse.redirect(redirectUrl, { headers: corsHeaders })
    } catch (error) {
      console.error('Error creating redirect URL:', error, url)
      // Fallback to settings page
      const fallbackUrl = new URL('/settings', request.url)
      return NextResponse.redirect(fallbackUrl, { headers: corsHeaders })
    }
  }
  
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
          // Cookies will be handled by the response
        },
        remove: (name: string, options: any) => {
          // Cookies will be handled by the response
        },
      },
    }
  )

  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (error) {
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?instagram_error=${encodeURIComponent(error)}`
      return createRedirectResponse(redirectUrl)
    }

    if (!code || !state) {
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?instagram_error=missing_params`
      return createRedirectResponse(redirectUrl)
    }

    // Verify state parameter
    const { data: stateData, error: stateError } = await supabase
      .from('instagram_oauth_states')
      .select('user_id')
      .eq('state', state)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (stateError || !stateData) {
      console.error('State verification failed:', stateError)
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?instagram_error=invalid_state`
      return createRedirectResponse(redirectUrl)
    }

    // Exchange code for access token via Facebook Graph API
    const tokenUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    tokenUrl.searchParams.set('client_id', INSTAGRAM_CONFIG.clientId)
    tokenUrl.searchParams.set('client_secret', INSTAGRAM_CONFIG.clientSecret)
    tokenUrl.searchParams.set('redirect_uri', INSTAGRAM_CONFIG.redirectUri)
    tokenUrl.searchParams.set('code', code)

    const tokenResponse = await fetch(tokenUrl.toString())
    const tokenData = await tokenResponse.json()

    if (!tokenResponse.ok || !tokenData.access_token) {
      console.error('Facebook token exchange failed:', tokenData)
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?instagram_error=token_exchange_failed`
      return createRedirectResponse(redirectUrl)
    }

    const shortLivedToken = tokenData.access_token

    // Exchange for long-lived token (60 days)
    const longLivedUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
    longLivedUrl.searchParams.set('grant_type', 'fb_exchange_token')
    longLivedUrl.searchParams.set('client_id', INSTAGRAM_CONFIG.clientId)
    longLivedUrl.searchParams.set('client_secret', INSTAGRAM_CONFIG.clientSecret)
    longLivedUrl.searchParams.set('fb_exchange_token', shortLivedToken)

    const longLivedResponse = await fetch(longLivedUrl.toString())
    const longLivedData = await longLivedResponse.json()

    const accessToken = longLivedData.access_token || shortLivedToken
    const expiresIn = longLivedData.expires_in || tokenData.expires_in

    // Get user's Facebook Pages (required to find Instagram Business Account)
    const pagesResponse = await fetch(
      `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`
    )
    const pagesData = await pagesResponse.json()

    if (!pagesResponse.ok) {
      console.error('Failed to fetch Facebook pages:', pagesData)
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?instagram_error=profile_fetch_failed`
      return createRedirectResponse(redirectUrl)
    }

    // Find the first page with an Instagram Business Account
    const pageWithIg = (pagesData.data || []).find(
      (page: any) => page.instagram_business_account?.id
    )

    if (!pageWithIg?.instagram_business_account?.id) {
      console.error('No Instagram Business Account found on any Facebook page')
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?instagram_error=no_business_account`
      return createRedirectResponse(redirectUrl)
    }

    const igBusinessAccountId = pageWithIg.instagram_business_account.id
    const pageAccessToken = pageWithIg.access_token || accessToken

    // Get Instagram Business Account profile
    const profileResponse = await fetch(
      `https://graph.facebook.com/v21.0/${igBusinessAccountId}?fields=id,username,name,profile_picture_url,media_count&access_token=${accessToken}`
    )
    const profileData = await profileResponse.json()

    if (!profileResponse.ok) {
      console.error('Instagram profile fetch failed:', profileData)
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?instagram_error=profile_fetch_failed`
      return createRedirectResponse(redirectUrl)
    }

    // Check if mapping already exists
    const { data: existingMapping } = await supabase
      .from('instagram_user_mappings')
      .select('id')
      .eq('instagram_username', profileData.username)
      .eq('tabstasher_user_id', stateData.user_id)
      .single()

    // Store Instagram connection in database
    const mappingData = {
      tabstasher_user_id: stateData.user_id,
      instagram_username: profileData.username,
      instagram_user_id: igBusinessAccountId,
      access_token: accessToken,
      token_expires_at: expiresIn
        ? new Date(Date.now() + expiresIn * 1000).toISOString()
        : null,
      is_active: true,
      verified_at: new Date().toISOString(),
      metadata: {
        account_type: 'BUSINESS',
        media_count: profileData.media_count,
        connected_via: 'graph_api_business',
        token_type: 'long_lived',
        page_id: pageWithIg.id,
        page_name: pageWithIg.name
      }
    }

    let insertError
    if (existingMapping) {
      // Update existing mapping
      const { error } = await supabase
        .from('instagram_user_mappings')
        .update(mappingData)
        .eq('id', existingMapping.id)
      insertError = error
    } else {
      // Insert new mapping
      const { error } = await supabase
        .from('instagram_user_mappings')
        .insert(mappingData)
      insertError = error
    }

    if (insertError) {
      console.error('Error storing Instagram connection:', insertError)
      const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?instagram_error=storage_failed`
      return createRedirectResponse(redirectUrl)
    }

    // Clean up state
    await supabase
      .from('instagram_oauth_states')
      .delete()
      .eq('state', state)

    // Redirect to settings with success
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?instagram_success=connected`
    return createRedirectResponse(redirectUrl)

  } catch (error) {
    console.error('Error in Instagram callback:', error)
    const redirectUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/settings?instagram_error=internal_error`
    return createRedirectResponse(redirectUrl)
  }
}


