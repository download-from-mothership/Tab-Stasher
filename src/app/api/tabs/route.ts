import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Handle CORS preflight requests
export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}

export async function POST(request: Request) {
  try {
    // Add CORS headers to the response
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    }

    // Create a Supabase client with auth context
    const supabase = createRouteHandlerClient({ cookies })

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized - Please log in' },
        { status: 401, headers }
      )
    }

    // Log request details for debugging
    console.log('Request URL:', request.url)
    console.log('Request method:', request.method)
    console.log('Request headers:', Object.fromEntries(request.headers))

    // Parse and validate the request body
    const body = await request.json()
    console.log('Received request body:', body)
    
    try {
      // Insert the tab with the user's ID
      const { data: tab, error } = await supabase
        .from('tabs')
        .insert([{
          ...body,
          user_id: user.id,
          status: 'active'
        }])
        .select()
        .single()

      if (error) {
        console.error('Supabase error details:', {
          code: error.code,
          message: error.message,
          details: error.details
        })
        return NextResponse.json(
          { error: `Failed to create tab: ${error.message}` },
          { status: 500, headers }
        )
      }

      console.log('Successfully created tab:', tab)
      return NextResponse.json(tab, { headers })
    } catch (supabaseError) {
      console.error('Supabase operation error:', supabaseError)
      return NextResponse.json(
        { error: 'Failed to perform database operation' },
        { status: 500, headers }
      )
    }
  } catch (error) {
    console.error('Detailed error in POST /api/tabs:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      } }
    )
  }
} 