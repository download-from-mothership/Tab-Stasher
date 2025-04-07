export const config = {
  firecrawl: {
    baseUrl: 'https://api.firecrawl.dev',
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
} as const 