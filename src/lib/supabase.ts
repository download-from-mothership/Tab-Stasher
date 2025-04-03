import { createClient } from '@supabase/supabase-js'
import { config } from './config'

export const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
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