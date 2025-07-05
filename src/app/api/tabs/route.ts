import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { timeOperation } from '@/lib/performance-monitor'
import { GoogleGenerativeAI } from '@google/generative-ai'

export const dynamic = 'force-dynamic'

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)

export async function POST(request: Request) {
  // Create Supabase client inside the request handler
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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

    // Get AI categorization if not provided (defer expensive operations)
    let primaryCategory = body.primaryCategory
    let secondaryCategory = body.secondaryCategory
    let confidence = body.confidence
    let autoCategorizedAt = body.primaryCategory ? new Date().toISOString() : null

    // Only do AI categorization if not provided and content exists
    if (!primaryCategory && body.content) {
      try {
        // Use a simpler categorization approach for better performance
        const categorization = await timeOperation(
          'AI Categorization',
          () => getSimpleCategorization(body.content, body.url),
          2000 // 2 second threshold
        )
        primaryCategory = categorization.primaryCategory
        secondaryCategory = categorization.secondaryCategory
        confidence = categorization.confidence
        autoCategorizedAt = new Date().toISOString()
      } catch (error) {
        console.warn('Failed to categorize tab:', error)
        // Use defaults instead of failing
        primaryCategory = 'uncategorized'
        secondaryCategory = 'general'
        confidence = 0.5
      }
    }

    // Prepare tags for batch processing
    const tagsToProcess = body.tags || []
    const tagNames = Array.from(new Set(tagsToProcess as string[])) // Remove duplicates

    // Try to use the optimized database function first, fallback to direct insertion
    let saveResult: any = null
    let saveError: any = null

    try {
      const result = await timeOperation(
        'Database Insert',
        async () => supabase.rpc('save_tab_with_tags', {
          p_url: body.url,
          p_title: body.title,
          p_description: body.description,
          p_image: body.image,
          p_favicon: body.favicon,
          p_content: body.content,
          p_primary_category: primaryCategory || null,
          p_secondary_category: secondaryCategory || null,
          p_category_confidence: confidence || null,
          p_auto_categorized_at: autoCategorizedAt,
          p_tag_names: tagNames,
          p_user_id: user.id
        }),
        1000 // 1 second threshold
      )
      
      saveResult = result.data
      saveError = result.error
    } catch (functionError) {
      console.warn('save_tab_with_tags function not available, using direct insertion:', functionError)
      
      // Fallback: Insert tab directly
      const { data: tab, error: tabError } = await supabase
        .from('tabs')
        .insert([{
          url: body.url,
          title: body.title,
          description: body.description,
          image: body.image,
          favicon: body.favicon,
          content: body.content,
          primary_category: primaryCategory || null,
          secondary_category: secondaryCategory || null,
          category_confidence: confidence || null,
          auto_categorized_at: autoCategorizedAt,
          user_id: user.id,
          status: 'active'
        }])
        .select()
        .single()

      if (tabError) {
        saveError = tabError
      } else {
        // Process tags manually
        if (tagNames.length > 0) {
          for (const tagName of tagNames) {
            try {
              // Check if tag exists
              const { data: existingTag } = await supabase
                .from('tags')
                .select('id')
                .eq('name', tagName)
                .eq('user_id', user.id)
                .single()

              let tagId: string

              if (existingTag) {
                tagId = existingTag.id
              } else {
                // Create new tag
                const { data: newTag, error: createTagError } = await supabase
                  .from('tags')
                  .insert([{ name: tagName, user_id: user.id }])
                  .select()
                  .single()

                if (createTagError) {
                  console.warn('Failed to create tag:', createTagError)
                  continue
                }
                tagId = newTag.id
              }

              // Create tab-tag relationship
              await supabase
                .from('tabs_tags')
                .insert([{ tab_id: tab.id, tag_id: tagId }])
                .select()
            } catch (tagError) {
              console.warn('Failed to process tag:', tagName, tagError)
            }
          }
        }

        saveResult = [{ tab_id: tab.id, success: true, error_message: null }]
      }
    }

    if (saveError) {
      console.error('Error creating tab:', saveError)
      return NextResponse.json(
        { error: `Failed to create tab: ${saveError.message}` },
        { status: 500, headers }
      )
    }

    // Check if the save was successful
    if (!saveResult || saveResult.length === 0 || !saveResult[0].success) {
      const errorMsg = saveResult?.[0]?.error_message || 'Unknown error occurred'
      console.error('Error in save_tab_with_tags:', errorMsg)
      return NextResponse.json(
        { error: `Failed to create tab: ${errorMsg}` },
        { status: 500, headers }
      )
    }

    // Get the created tab
    const { data: tab, error: tabError } = await supabase
      .from('tabs')
      .select('*')
      .eq('id', saveResult[0].tab_id)
      .single()

    if (tabError) {
      console.error('Error fetching created tab:', tabError)
      return NextResponse.json(
        { error: `Failed to fetch created tab: ${tabError.message}` },
        { status: 500, headers }
      )
    }

    console.log('Successfully created tab:', tab)
    return NextResponse.json(tab, { headers })
  } catch (error) {
    console.error('Error in POST /api/tabs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500, headers }
    )
  }
}

// Simplified categorization function for better performance
async function getSimpleCategorization(content: string, url: string): Promise<{
  primaryCategory: string
  secondaryCategory: string
  confidence: number
}> {
  try {
    const prompt = `Analyze the following content and categorize it into a hierarchical structure.

Content: ${content}
URL: ${url}

Return a JSON object with:
1. Primary category (e.g., "clothing", "shoes", "homegoods", "electronics", "books", "food", "beauty", "sports", "automotive", "pets", "garden", "office", "toys", "health", "jewelry", "art", "music", "tools", "outdoor", "kitchen")
2. Secondary category (e.g., "dresses", "tops", "bottoms" for clothing)
3. Confidence score (0-1)

Format:
{
  "primaryCategory": "clothing",
  "secondaryCategory": "dresses",
  "confidence": 0.92
}`

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-lite' })
    const result = await model.generateContent(prompt)
    const responseText = result.response?.text()

    if (!responseText) {
      throw new Error('Failed to get response from Gemini')
    }

    // Parse the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Could not extract JSON from response')
    }

    const analysis = JSON.parse(jsonMatch[0])

    return {
      primaryCategory: analysis.primaryCategory || 'uncategorized',
      secondaryCategory: analysis.secondaryCategory || 'general',
      confidence: analysis.confidence || 0.5
    }
  } catch (error) {
    console.error('Error in getSimpleCategorization:', error)
    return {
      primaryCategory: 'uncategorized',
      secondaryCategory: 'general',
      confidence: 0.5
    }
  }
}

// Note: Tag processing is now handled by the optimized database function save_tab_with_tags 