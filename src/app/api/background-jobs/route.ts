import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { CategoryManager } from '@/lib/category-manager'

export const dynamic = 'force-dynamic'

// Create Supabase client
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

export async function POST(request: Request) {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { jobType, data } = body

    if (!jobType) {
      return NextResponse.json(
        { error: 'Job type is required' },
        { status: 400 }
      )
    }

    const categoryManager = new CategoryManager()

    switch (jobType) {
      case 'update_category_counts':
        await categoryManager.updateCategoryTabCountsBatch()
        break

      case 'check_category_splits':
        if (data?.categoryName) {
          await categoryManager.checkAndSplitCategoryAsync(data.categoryName)
        }
        break

      case 'process_category_splits':
        // Process all categories that might need splitting
        const stats = await categoryManager.getCategoryStats()
        for (const category of stats.categoriesNeedingSplit) {
          await categoryManager.checkAndSplitCategoryAsync(category.name)
        }
        break

      default:
        return NextResponse.json(
          { error: 'Unknown job type' },
          { status: 400 }
        )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in background job:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 