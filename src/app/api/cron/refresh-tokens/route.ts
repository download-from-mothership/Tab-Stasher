/**
 * Cron job to refresh Instagram long-lived tokens before they expire.
 * Long-lived tokens last 60 days; this refreshes any expiring within 7 days.
 *
 * Should be called daily via cron or manually.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabase-server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  const authHeader = request.headers.get('authorization')

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = await createSupabaseServerClient()

  // Find tokens expiring within the next 7 days
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()

  const { data: expiringMappings, error } = await supabase
    .from('instagram_user_mappings')
    .select('id, instagram_username, access_token, token_expires_at')
    .eq('is_active', true)
    .not('access_token', 'is', null)
    .not('token_expires_at', 'is', null)
    .lt('token_expires_at', sevenDaysFromNow)

  if (error) {
    console.error('[refresh-tokens] Failed to query expiring tokens:', error)
    return NextResponse.json({ error: 'Query failed' }, { status: 500 })
  }

  if (!expiringMappings || expiringMappings.length === 0) {
    return NextResponse.json({ refreshed: 0, message: 'No tokens need refreshing' })
  }

  const results: Array<{ username: string; success: boolean; error?: string }> = []

  for (const mapping of expiringMappings) {
    try {
      // Refresh via Facebook Graph API long-lived token refresh
      const refreshUrl = new URL('https://graph.facebook.com/v21.0/oauth/access_token')
      refreshUrl.searchParams.set('grant_type', 'fb_exchange_token')
      refreshUrl.searchParams.set('client_id', process.env.INSTAGRAM_APP_ID || '')
      refreshUrl.searchParams.set('client_secret', process.env.INSTAGRAM_APP_SECRET || '')
      refreshUrl.searchParams.set('fb_exchange_token', mapping.access_token)

      const response = await fetch(refreshUrl.toString())
      const data = await response.json()

      if (!response.ok || !data.access_token) {
        results.push({
          username: mapping.instagram_username,
          success: false,
          error: data.error?.message || 'Token refresh failed'
        })
        continue
      }

      // Update the token in the database
      const newExpiresAt = data.expires_in
        ? new Date(Date.now() + data.expires_in * 1000).toISOString()
        : null

      await supabase
        .from('instagram_user_mappings')
        .update({
          access_token: data.access_token,
          token_expires_at: newExpiresAt
        })
        .eq('id', mapping.id)

      results.push({ username: mapping.instagram_username, success: true })
      console.log(`[refresh-tokens] Refreshed token for @${mapping.instagram_username}`)
    } catch (err) {
      results.push({
        username: mapping.instagram_username,
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error'
      })
    }
  }

  const refreshed = results.filter(r => r.success).length
  const failed = results.filter(r => !r.success).length

  return NextResponse.json({
    refreshed,
    failed,
    total: expiringMappings.length,
    results,
    timestamp: new Date().toISOString()
  })
}

export async function POST(request: NextRequest) {
  return GET(request)
}
