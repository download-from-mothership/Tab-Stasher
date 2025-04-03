export const config = {
  gemini: {
    apiKey: process.env.NEXT_PUBLIC_GEMINI_API_KEY || '',
    model: 'gemini-pro',
  },
  firecrawl: {
    apiKey: process.env.NEXT_PUBLIC_FIRECRAWL_API_KEY || '',
    baseUrl: 'https://api.firecrawl.dev',
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
} as const 