import { installSupabaseMocks, createMockSupabaseClient, makeRequest } from './helpers'

const ref = installSupabaseMocks()

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

import { GET, POST } from '../collections/route'

const testUser = { id: 'user-1', email: 'alice@example.com' }

describe('GET /api/collections', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ref.client = createMockSupabaseClient({ user: null })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns collections with tab counts', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: {
        collections: {
          data: [
            { id: 'c1', name: 'Reading List', tabs_collections: [{ tab_id: 't1' }, { tab_id: 't2' }] },
            { id: 'c2', name: 'Empty', tabs_collections: [] },
          ],
          error: null,
        },
      },
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toHaveLength(2)
    expect(body[0].tab_count).toBe(2)
    expect(body[0].name).toBe('Reading List')
    expect(body[1].tab_count).toBe(0)
    // tabs_collections should be stripped
    expect(body[0]).not.toHaveProperty('tabs_collections')
  })

  it('returns empty array when user has no collections', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { collections: { data: [], error: null } },
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns 500 on database error', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { collections: { data: null, error: { message: 'db down' } } },
    })

    const res = await GET()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('db down')
  })
})

describe('POST /api/collections', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ref.client = createMockSupabaseClient({ user: null })
    const req = makeRequest('http://localhost/api/collections', {
      method: 'POST',
      body: { name: 'Test' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates a collection and returns 201', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: {
        collections: {
          data: { id: 'c-new', name: 'My Collection', description: null, icon: null, user_id: 'user-1' },
          error: null,
        },
      },
    })

    const req = makeRequest('http://localhost/api/collections', {
      method: 'POST',
      body: { name: 'My Collection' },
    })
    const res = await POST(req)
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.name).toBe('My Collection')
    expect(body.tab_count).toBe(0)
  })

  it('returns 400 when name is missing', async () => {
    ref.client = createMockSupabaseClient({ user: testUser })
    const req = makeRequest('http://localhost/api/collections', {
      method: 'POST',
      body: {},
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when name is blank', async () => {
    ref.client = createMockSupabaseClient({ user: testUser })
    const req = makeRequest('http://localhost/api/collections', {
      method: 'POST',
      body: { name: '   ' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 409 on duplicate name', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: {
        collections: {
          data: null,
          error: { code: '23505', message: 'unique violation' },
        },
      },
    })

    const req = makeRequest('http://localhost/api/collections', {
      method: 'POST',
      body: { name: 'Existing Name' },
    })
    const res = await POST(req)
    expect(res.status).toBe(409)
  })
})
