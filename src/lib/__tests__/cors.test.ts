describe('getCorsHeaders', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function loadCors() {
    return require('@/app/_shared/cors')
  }

  it('returns empty origin when no allowed origins configured', () => {
    process.env.CORS_ALLOWED_ORIGINS = ''
    const { getCorsHeaders } = loadCors()
    const headers = getCorsHeaders('https://evil.com')
    expect(headers['Access-Control-Allow-Origin']).toBe('')
  })

  it('returns matching origin when it is in the allowlist', () => {
    process.env.CORS_ALLOWED_ORIGINS =
      'https://tab-stasher.com,chrome-extension://abc123'
    const { getCorsHeaders } = loadCors()
    const headers = getCorsHeaders('https://tab-stasher.com')
    expect(headers['Access-Control-Allow-Origin']).toBe(
      'https://tab-stasher.com'
    )
  })

  it('returns empty origin for non-matching request', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://tab-stasher.com'
    const { getCorsHeaders } = loadCors()
    const headers = getCorsHeaders('https://evil.com')
    expect(headers['Access-Control-Allow-Origin']).toBe('')
  })

  it('handles chrome extension origins', () => {
    process.env.CORS_ALLOWED_ORIGINS =
      'https://tab-stasher.com,chrome-extension://abc123def'
    const { getCorsHeaders } = loadCors()
    const headers = getCorsHeaders('chrome-extension://abc123def')
    expect(headers['Access-Control-Allow-Origin']).toBe(
      'chrome-extension://abc123def'
    )
  })

  it('returns empty origin when request origin is null', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://tab-stasher.com'
    const { getCorsHeaders } = loadCors()
    const headers = getCorsHeaders(null)
    expect(headers['Access-Control-Allow-Origin']).toBe('')
  })

  it('returns empty origin when request origin is undefined', () => {
    process.env.CORS_ALLOWED_ORIGINS = 'https://tab-stasher.com'
    const { getCorsHeaders } = loadCors()
    const headers = getCorsHeaders(undefined)
    expect(headers['Access-Control-Allow-Origin']).toBe('')
  })

  it('always includes credentials and methods headers', () => {
    process.env.CORS_ALLOWED_ORIGINS = ''
    const { getCorsHeaders } = loadCors()
    const headers = getCorsHeaders('https://example.com')
    expect(headers['Access-Control-Allow-Credentials']).toBe('true')
    expect(headers['Access-Control-Allow-Methods']).toContain('POST')
    expect(headers['Access-Control-Allow-Methods']).toContain('GET')
    expect(headers['Access-Control-Allow-Headers']).toContain('authorization')
  })

  it('trims whitespace from allowed origins', () => {
    process.env.CORS_ALLOWED_ORIGINS =
      '  https://tab-stasher.com , https://other.com  '
    const { getCorsHeaders } = loadCors()
    const headers = getCorsHeaders('https://tab-stasher.com')
    expect(headers['Access-Control-Allow-Origin']).toBe(
      'https://tab-stasher.com'
    )
  })
})
