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
  const { data: tabs, error } = await supabase
    .from('tabs')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return tabs
}

export async function deleteTab(id: string) {
  const { error } = await supabase
    .from('tabs')
    .delete()
    .eq('id', id)

  if (error) throw error
} 