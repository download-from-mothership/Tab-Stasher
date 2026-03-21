import { createTabSchema, scrapeUrlSchema, analyzeContentSchema } from '../validation'

describe('createTabSchema', () => {
  it('should accept a valid tab with all fields', () => {
    const result = createTabSchema.safeParse({
      url: 'https://example.com',
      title: 'Example Page',
      description: 'A test page',
      tags: ['test', 'example'],
      primaryCategory: 'tech',
      secondaryCategory: 'web',
      confidence: 0.9,
    })
    expect(result.success).toBe(true)
  })

  it('should accept minimal valid tab (url only)', () => {
    const result = createTabSchema.safeParse({
      url: 'https://example.com',
    })
    expect(result.success).toBe(true)
  })

  it('should reject missing url', () => {
    const result = createTabSchema.safeParse({
      title: 'No URL',
    })
    expect(result.success).toBe(false)
  })

  it('should reject invalid url', () => {
    const result = createTabSchema.safeParse({
      url: 'not-a-url',
    })
    expect(result.success).toBe(false)
  })

  it('should reject url exceeding max length', () => {
    const result = createTabSchema.safeParse({
      url: 'https://example.com/' + 'a'.repeat(2048),
    })
    expect(result.success).toBe(false)
  })

  it('should reject title exceeding max length', () => {
    const result = createTabSchema.safeParse({
      url: 'https://example.com',
      title: 'a'.repeat(501),
    })
    expect(result.success).toBe(false)
  })

  it('should reject too many tags', () => {
    const result = createTabSchema.safeParse({
      url: 'https://example.com',
      tags: Array.from({ length: 21 }, (_, i) => `tag${i}`),
    })
    expect(result.success).toBe(false)
  })

  it('should reject confidence outside 0-1 range', () => {
    const low = createTabSchema.safeParse({ url: 'https://example.com', confidence: -0.1 })
    const high = createTabSchema.safeParse({ url: 'https://example.com', confidence: 1.1 })
    expect(low.success).toBe(false)
    expect(high.success).toBe(false)
  })

  it('should accept confidence at boundaries', () => {
    const zero = createTabSchema.safeParse({ url: 'https://example.com', confidence: 0 })
    const one = createTabSchema.safeParse({ url: 'https://example.com', confidence: 1 })
    expect(zero.success).toBe(true)
    expect(one.success).toBe(true)
  })

  it('should accept nullable image and favicon', () => {
    const result = createTabSchema.safeParse({
      url: 'https://example.com',
      image: null,
      favicon: null,
    })
    expect(result.success).toBe(true)
  })
})

describe('scrapeUrlSchema', () => {
  it('should accept a valid url', () => {
    const result = scrapeUrlSchema.safeParse({ url: 'https://example.com' })
    expect(result.success).toBe(true)
  })

  it('should reject missing url', () => {
    const result = scrapeUrlSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it('should reject invalid url', () => {
    const result = scrapeUrlSchema.safeParse({ url: 'not-valid' })
    expect(result.success).toBe(false)
  })
})

describe('analyzeContentSchema', () => {
  it('should accept valid url and content', () => {
    const result = analyzeContentSchema.safeParse({
      url: 'https://example.com',
      markdownContent: 'Some content here',
    })
    expect(result.success).toBe(true)
  })

  it('should reject empty markdownContent', () => {
    const result = analyzeContentSchema.safeParse({
      url: 'https://example.com',
      markdownContent: '',
    })
    expect(result.success).toBe(false)
  })

  it('should reject markdownContent exceeding max length', () => {
    const result = analyzeContentSchema.safeParse({
      url: 'https://example.com',
      markdownContent: 'a'.repeat(200_001),
    })
    expect(result.success).toBe(false)
  })

  it('should reject missing url', () => {
    const result = analyzeContentSchema.safeParse({
      markdownContent: 'Some content',
    })
    expect(result.success).toBe(false)
  })
})
