describe('config', () => {
  it('exports config object with expected service keys', () => {
    const { config } = require('@/lib/config')
    expect(config).toHaveProperty('supabase')
    expect(config).toHaveProperty('gemini')
    expect(config).toHaveProperty('firecrawl')
    expect(config).toHaveProperty('gcs')
    expect(config).toHaveProperty('redis')
    expect(config).toHaveProperty('vision')
  })

  it('defaults to empty strings when env vars are not set', () => {
    const { config } = require('@/lib/config')
    expect(typeof config.supabase.url).toBe('string')
    expect(typeof config.supabase.anonKey).toBe('string')
    expect(typeof config.gemini.apiKey).toBe('string')
  })
})
