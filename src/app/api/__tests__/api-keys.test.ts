import { installSupabaseMocks, createMockSupabaseClient, makeRequest } from './helpers'

const ref = installSupabaseMocks()

jest.mock('@/lib/api-auth', () => ({
  generateApiKey: jest.fn(() => ({
    key: 'ts_live_abc123xyz',
    prefix: 'ts_live_abc123xy',
    hash: 'fakehash256',
  })),
  hashApiKey: jest.fn(() => 'fakehash256'),
}))

import { GET, POST, DELETE } from '../api-keys/route'

const testUser = { id: 'user-1', email: 'alice@example.com' }

describe('GET /api/api-keys', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ref.client = createMockSupabaseClient({ user: null })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns user api keys', async () => {
    const keys = [
      { id: 'k1', name: 'Default', key_prefix: 'ts_live_abc', scopes: ['read'], created_at: '2025-01-01' },
    ]
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { api_keys: { data: keys, error: null } },
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.api_keys).toHaveLength(1)
    expect(body.api_keys[0].name).toBe('Default')
  })

  it('returns 500 on db error', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { api_keys: { data: null, error: { message: 'timeout' } } },
    })

    const res = await GET()
    expect(res.status).toBe(500)
  })
})

describe('POST /api/api-keys', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ref.client = createMockSupabaseClient({ user: null })
    const req = makeRequest('http://localhost/api/api-keys', {
      method: 'POST',
      body: { name: 'Test Key' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates an API key with defaults', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: {
        api_keys: {
          data: {
            id: 'k-new',
            name: 'Default API Key',
            key_prefix: 'ts_live_abc123xy',
            scopes: ['read'],
            expires_at: null,
            created_at: '2025-01-01',
          },
          error: null,
        },
      },
    })

    const req = makeRequest('http://localhost/api/api-keys', {
      method: 'POST',
      body: {},
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.api_key.key).toBe('ts_live_abc123xyz')
    expect(body.message).toMatch(/Save this key/)
  })

  it('rejects invalid scopes', async () => {
    ref.client = createMockSupabaseClient({ user: testUser })

    const req = makeRequest('http://localhost/api/api-keys', {
      method: 'POST',
      body: { scopes: ['read', 'admin'] },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(400)
    expect(body.error).toMatch(/Invalid scopes/)
  })

  it('sets expiration when expires_in_days is provided', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: {
        api_keys: {
          data: {
            id: 'k2',
            name: 'Temp Key',
            key_prefix: 'ts_live_abc123xy',
            scopes: ['read'],
            expires_at: '2025-02-01',
            created_at: '2025-01-01',
          },
          error: null,
        },
      },
    })

    const req = makeRequest('http://localhost/api/api-keys', {
      method: 'POST',
      body: { name: 'Temp Key', scopes: ['read'], expires_in_days: 30 },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.api_key.name).toBe('Temp Key')
    expect(ref.client.from).toHaveBeenCalledWith('api_keys')
  })
})

describe('DELETE /api/api-keys', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ref.client = createMockSupabaseClient({ user: null })
    const req = makeRequest('http://localhost/api/api-keys?id=k1', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when id is missing', async () => {
    ref.client = createMockSupabaseClient({ user: testUser })
    const req = makeRequest('http://localhost/api/api-keys', { method: 'DELETE' })
    const res = await DELETE(req)
    expect(res.status).toBe(400)
  })

  it('revokes an API key', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { api_keys: { data: null, error: null } },
    })

    const req = makeRequest('http://localhost/api/api-keys?id=k1', { method: 'DELETE' })
    const res = await DELETE(req)
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.message).toBe('API key revoked')
  })
})
