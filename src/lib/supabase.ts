import { createBrowserClient } from '@supabase/ssr'
import { config } from './config'
import { corsHeaders } from '@/app/_shared/cors'

export const supabase = createBrowserClient(
  config.supabase.url,
  config.supabase.anonKey,
  {
    cookies: {
      get(name: string) {
        return document.cookie
          .split('; ')
          .find((row) => row.startsWith(`${name}=`))
          ?.split('=')[1]
      },
      set(name: string, value: string, options: { path?: string; maxAge?: number; domain?: string; secure?: boolean }) {
        document.cookie = `${name}=${value}${options.path ? `; path=${options.path}` : ''}${options.maxAge ? `; max-age=${options.maxAge}` : ''}${options.domain ? `; domain=${options.domain}` : ''}${options.secure ? '; secure' : ''}`
      },
      remove(name: string, options: { path?: string; domain?: string }) {
        document.cookie = `${name}=; max-age=0${options.path ? `; path=${options.path}` : ''}${options.domain ? `; domain=${options.domain}` : ''}`
      }
    }
  }
)

export interface Tab {
  id: string
  url: string
  title: string | null
  description: string | null
  image: string | null
  favicon: string | null
  content: string | null
  created_at: string
  user_id: string | null
  tags: string[]
  primary_category: string | null
  secondary_category: string | null
  category_confidence: number | null
  auto_categorized_at: string | null
}

export interface Category {
  id: string
  name: string
  parent_id: string | null
  level: number
  tab_count: number
  max_tabs_before_split: number
  user_id: string
  created_at: string
  updated_at: string
}

export async function createTab(data: Omit<Tab, 'id' | 'created_at' | 'user_id'>) {
  const { data: tab, error } = await supabase
    .from('tabs')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return tab
}

export async function getTabs() {
  // First get all tabs
  const { data: tabs, error } = await supabase
    .from('tabs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error

  // Then get tags for each tab
  const tabsWithTags = await Promise.all(
    (tabs || []).map(async (tab) => {
      const { data: tagRelations } = await supabase
        .from('tabs_tags')
        .select(`
          tags (
            name
          )
        `)
        .eq('tab_id', tab.id)

      const tags = (tagRelations || [])
        .map(relation => relation.tags?.name)
        .filter(Boolean) as string[]

      return {
        ...tab,
        tags
      }
    })
  )

  return tabsWithTags
}

export async function deleteTab(id: string) {
  const { error } = await supabase
    .from('tabs')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// Category management functions
export async function createCategory(data: Omit<Category, 'id' | 'created_at' | 'updated_at'>) {
  const { data: category, error } = await supabase
    .from('categories')
    .insert([data])
    .select()
    .single()

  if (error) throw error
  return category
}

export async function getCategories() {
  const { data: categories, error } = await supabase
    .from('categories')
    .select('*')
    .order('name', { ascending: true })

  if (error) throw error
  return categories
}

export async function getCategoryById(id: string) {
  const { data: category, error } = await supabase
    .from('categories')
    .select('*')
    .eq('id', id)
    .single()

  if (error) throw error
  return category
}

export async function updateCategory(id: string, updates: Partial<Category>) {
  const { data: category, error } = await supabase
    .from('categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return category
}

export async function deleteCategory(id: string) {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id)

  if (error) throw error
}

export async function updateTabCategories(tabId: string, categories: {
  primary_category?: string | null
  secondary_category?: string | null
  category_confidence?: number | null
  auto_categorized_at?: string | null
}) {
  const { data: tab, error } = await supabase
    .from('tabs')
    .update(categories)
    .eq('id', tabId)
    .select()
    .single()

  if (error) throw error
  return tab
} 