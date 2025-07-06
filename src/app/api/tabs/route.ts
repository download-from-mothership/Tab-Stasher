import { NextResponse } from 'next/server'
import { timeOperation } from '@/lib/performance-monitor'

export const dynamic = 'force-dynamic'



export async function POST(request: Request) {
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

  // Create Supabase client inside the request handler
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  }

  if (request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 200, headers })
  }

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers }
      )
    }

    const body = await request.json()
    
    if (!body.url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400, headers }
      )
    }

    console.log('Attempting to insert tab with data:', {
      url: body.url,
      title: body.title,
      description: body.description,
      image: body.image,
      favicon: body.favicon,
      content: body.content ? `${body.content.substring(0, 100)}...` : null,
      tags: body.tags,
      primaryCategory: body.primaryCategory,
      secondaryCategory: body.secondaryCategory,
      confidence: body.confidence,
      user_id: user.id,
      status: 'active'
    })

    // Use provided categorization data - no need to re-categorize if already done
    const primaryCategory = body.primaryCategory || 'uncategorized'
    const secondaryCategory = body.secondaryCategory || 'general'
    const confidence = body.confidence || 0.5
    const autoCategorizedAt = body.primaryCategory ? new Date().toISOString() : null

    // Prepare tags for batch processing
    const tagsToProcess = body.tags || []
    const tagNames = Array.from(new Set(tagsToProcess as string[])) // Remove duplicates

    // Use the optimized database function for fast insertion
    const result = await timeOperation(
      'Database Insert',
      async () => supabase.rpc('save_tab_with_tags', {
        p_url: body.url,
        p_title: body.title,
        p_description: body.description,
        p_image: body.image,
        p_favicon: body.favicon,
        p_content: body.content,
        p_primary_category: primaryCategory,
        p_secondary_category: secondaryCategory,
        p_category_confidence: confidence,
        p_auto_categorized_at: autoCategorizedAt,
        p_tag_names: tagNames,
        p_user_id: user.id
      }),
      1000 // 1 second threshold
    )
    
    if (result.error) {
      console.error('Error creating tab:', result.error)
      return NextResponse.json(
        { error: `Failed to create tab: ${result.error.message}` },
        { status: 500, headers }
      )
    }

    // Check if the save was successful
    if (!result.data || result.data.length === 0 || !result.data[0].success) {
      const errorMsg = result.data?.[0]?.error_message || 'Unknown error occurred'
      console.error('Error in save_tab_with_tags:', errorMsg)
      return NextResponse.json(
        { error: `Failed to create tab: ${errorMsg}` },
        { status: 500, headers }
      )
    }

    // Return the tab ID and success status instead of fetching the entire tab
    const savedTab = {
      id: result.data[0].tab_id,
      url: body.url,
      title: body.title,
      description: body.description,
      image: body.image,
      favicon: body.favicon,
      content: body.content,
      primary_category: primaryCategory,
      secondary_category: secondaryCategory,
      category_confidence: confidence,
      auto_categorized_at: autoCategorizedAt,
      user_id: user.id,
      status: 'active',
      created_at: new Date().toISOString(),
      tags: tagNames
    }

    console.log('Successfully created tab:', savedTab.id)
    return NextResponse.json(savedTab, { headers })
  } catch (error) {
    console.error('Error in POST /api/tabs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    )
  }
}

// Note: Tag processing is now handled by the optimized database function save_tab_with_tags 