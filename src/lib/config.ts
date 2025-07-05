export const config = {
  firecrawl: {
    baseUrl: 'https://api.firecrawl.dev',
    apiKey: process.env.FIRECRAWL_API_KEY || '',
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
} as const 