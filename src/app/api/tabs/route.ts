import { NextResponse } from 'next/server'
import { timeOperation } from '@/lib/performance-monitor'
import { getCorsHeaders } from '@/app/_shared/cors'
import { parseBody, isErrorResponse, createTabSchema } from '@/lib/validation'
import { trackedQuery } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const { createServerClient } = await import('@supabase/ssr')
  const { cookies } = await import('next/headers')

  const headers = getCorsHeaders(request.headers.get('origin'))

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json(
      { error: 'Supabase configuration is not complete' },
      { status: 500, headers }
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

  try {
    // Check for Instagram DM authentication header
    const instagramUserId = request.headers.get('X-TabStasher-User-ID')
    const source = request.headers.get('X-Source')
    
    let user = null
    let authError = null
    
    if (instagramUserId && source === 'instagram_dm') {
      // Instagram DM authentication - use the provided user ID
      user = { id: instagramUserId }
    } else {
      // Regular authentication
      const authResult = await supabase.auth.getUser()
      user = authResult.data.user
      authError = authResult.error
    }
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401, headers }
      )
    }

    const parsed = await parseBody(request, createTabSchema)
    if (isErrorResponse(parsed)) return parsed
    const body = parsed

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

    // Use provided categorization data, or default to 'uncategorized' if missing
    // This allows tabs to be saved immediately even if categorization fails
    // They can be batch processed later via /api/tabs/reprocess-categories
    const primaryCategory = (body.primaryCategory || 'uncategorized').toLowerCase().trim()
    const secondaryCategory = (body.secondaryCategory || 'general').toLowerCase().trim()
    const confidence = body.confidence || 0.5
    // Only set auto_categorized_at if we actually have a real category (not 'uncategorized')
    const autoCategorizedAt = (body.primaryCategory && primaryCategory !== 'uncategorized') 
      ? new Date().toISOString() 
      : null

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

    const isDuplicate = result.data[0].is_duplicate || false
    const tabId = result.data[0].tab_id

    // Fetch the actual tab data to get accurate timestamps and metadata
    const { data: tabData, error: fetchError } = await supabase
      .from('tabs')
      .select('id, url, title, description, image, favicon, content, primary_category, secondary_category, category_confidence, auto_categorized_at, created_at, updated_at, status')
      .eq('id', tabId)
      .single()

    if (fetchError || !tabData) {
      console.warn('Could not fetch tab data after save, using provided data:', fetchError)
    }

    // Get tags for the tab
    const { data: tabTags } = await supabase
      .from('tabs_tags')
      .select('tag_id, tags(name)')
      .eq('tab_id', tabId)

    const tagNamesFromDb = tabTags?.map((tt: any) => tt.tags?.name).filter(Boolean) || tagNames

    // Return the tab with duplicate status
    const savedTab = {
      id: tabId,
      url: tabData?.url || body.url,
      title: tabData?.title || body.title,
      description: tabData?.description || body.description,
      image: tabData?.image || body.image,
      favicon: tabData?.favicon || body.favicon,
      content: tabData?.content || body.content,
      primary_category: tabData?.primary_category || primaryCategory,
      secondary_category: tabData?.secondary_category || secondaryCategory,
      category_confidence: tabData?.category_confidence || confidence,
      auto_categorized_at: tabData?.auto_categorized_at || autoCategorizedAt,
      user_id: user.id,
      status: tabData?.status || 'active',
      created_at: tabData?.created_at || new Date().toISOString(),
      updated_at: tabData?.updated_at || new Date().toISOString(),
      tags: tagNamesFromDb,
      is_duplicate: isDuplicate
    }

    if (isDuplicate) {
      console.log('Updated existing tab (duplicate detected):', savedTab.id)
    } else {
      console.log('Successfully created new tab:', savedTab.id)
    }
    
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