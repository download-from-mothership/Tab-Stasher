import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

// Get allowed origins from environment or use default
const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
  process.env.ALLOWED_ORIGINS.split(',') : 
  ['http://localhost:3000']

// Helper to get CORS headers
function getCorsHeaders(origin: string | null) {
  // Check if the origin is allowed
  const isAllowedOrigin = origin && allowedOrigins.includes(origin)
  
  return {
    'Access-Control-Allow-Origin': isAllowedOrigin ? origin : allowedOrigins[0],
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Credentials': 'true',
  }
}

// Handle CORS preflight requests
export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin')
  return NextResponse.json({}, {
    headers: getCorsHeaders(origin)
  })
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get('origin')
    const headers = getCorsHeaders(origin)

    console.log('Starting POST request handler')

    // Create a Supabase client with server-side auth context
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

    console.log('Supabase client created')

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    console.log('Auth check result:', { 
      hasUser: !!user, 
      userId: user?.id,
      authError 
    })
    
    if (authError) {
      console.error('Authentication error:', authError)
      return NextResponse.json(
        { error: `Authentication failed: ${authError.message}` },
        { status: 401, headers }
      )
    }

    if (!user) {
      console.log('No user found')
      return NextResponse.json(
        { error: 'Unauthorized - No user found' },
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
      console.log('Attempting to insert tab with data:', {
        ...body,
        user_id: user.id,
        status: 'active'
      })

      // Start a Supabase transaction
      const { data: tab, error: tabError } = await supabase
        .from('tabs')
        .insert([{
          url: body.url,
          title: body.title,
          description: body.description,
          image: body.image,
          favicon: body.favicon,
          content: body.content,
          user_id: user.id,
          status: 'active'
        }])
        .select()
        .single()

      if (tabError) {
        console.error('Error creating tab:', tabError)
        return NextResponse.json(
          { error: `Failed to create tab: ${tabError.message}` },
          { status: 500, headers }
        )
      }

      // If we have tags, create them and associate with the tab
      if (body.tags && body.tags.length > 0) {
        console.log('Processing tags:', body.tags)

        // Create tags if they don't exist
        for (const tagName of body.tags) {
          const { data: existingTag, error: findTagError } = await supabase
            .from('tags')
            .select('id')
            .eq('name', tagName)
            .eq('user_id', user.id)
            .single()

          if (findTagError && findTagError.code !== 'PGRST116') { // PGRST116 is "not found" error
            console.error('Error finding tag:', findTagError)
            continue
          }

          let tagId
          if (!existingTag) {
            // Create new tag
            const { data: newTag, error: createTagError } = await supabase
              .from('tags')
              .insert([{
                name: tagName,
                user_id: user.id
              }])
              .select('id')
              .single()

            if (createTagError) {
              console.error('Error creating tag:', createTagError)
              continue
            }
            tagId = newTag.id
          } else {
            tagId = existingTag.id
          }

          // Associate tag with tab
          const { error: linkError } = await supabase
            .from('tabs_tags')
            .insert([{
              tab_id: tab.id,
              tag_id: tagId
            }])

          if (linkError) {
            console.error('Error linking tag to tab:', linkError)
          }
        }
      }

      console.log('Successfully created tab:', tab)
      return NextResponse.json(tab, { headers })
    } catch (supabaseError) {
      console.error('Supabase operation error:', supabaseError)
      return NextResponse.json(
        { error: 'Failed to perform database operation', details: supabaseError instanceof Error ? supabaseError.message : String(supabaseError) },
        { status: 500, headers }
      )
    }
  } catch (error) {
    console.error('Detailed error in POST /api/tabs:', error)
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      },
      { 
        status: 500, 
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        } 
      }
    )
  }
} 