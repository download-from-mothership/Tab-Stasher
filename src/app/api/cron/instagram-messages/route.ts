/**
 * Cloudflare Cron Trigger Handler for Instagram Message Processing
 * 
 * This endpoint is called automatically by Cloudflare Workers cron triggers
 * to process incoming Instagram DMs.
 * 
 * Configured in wrangler.toml to run every 2 minutes
 */

import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  // Verify this is a cron request from Cloudflare
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET
  
  // Optional: Add basic auth protection
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // Forward to the Instagram message processing endpoint
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 
                 request.nextUrl.origin ||
                 'https://tabstasher.com'
  
  try {
    const response = await fetch(`${baseUrl}/api/instagram/process-messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const data = await response.json()

    return NextResponse.json({
      success: true,
      cron_triggered: true,
      timestamp: new Date().toISOString(),
      result: data
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

// Also support POST for manual triggers
export async function POST(request: NextRequest) {
  return GET(request)
}

