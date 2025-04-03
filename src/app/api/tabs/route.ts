import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
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
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // Get the current user's session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get the request body
    const body = await request.json()
    
    // Insert the tab with the user's ID
    const { data: tab, error } = await supabase
      .from('tabs')
      .insert([{
        ...body,
        user_id: session.user.id
      }])
      .select()
      .single()

    if (error) {
      console.error('Error creating tab:', error)
      return NextResponse.json(
        { error: 'Failed to create tab' },
        { status: 500 }
      )
    }

    return NextResponse.json(tab)
  } catch (error) {
    console.error('Error in POST /api/tabs:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 