import { installSupabaseMocks, createMockSupabaseClient, makeRequest } from './helpers'

const ref = installSupabaseMocks()

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'

import { GET } from '../tabs/export/route'

const testUser = { id: 'user-1', email: 'alice@example.com' }

const sampleTabs = [
  {
    id: 't1',
    url: 'https://example.com/page1',
    title: 'Example Page',
    description: 'A test page',
    primary_category: 'technology',
    secondary_category: 'web',
    created_at: '2025-06-15T10:00:00Z',
    summary: 'A brief summary',
    is_read: false,
    reading_list_added_at: null,
    tabs_tags: [{ tags: { name: 'javascript' } }, { tags: { name: 'react' } }],
  },
  {
    id: 't2',
    url: 'https://example.com/page2',
    title: 'Another Page',
    description: null,
    primary_category: 'design',
    secondary_category: 'ui',
    created_at: '2025-06-14T08:00:00Z',
    summary: null,
    is_read: true,
    reading_list_added_at: null,
    tabs_tags: [],
  },
]

describe('GET /api/tabs/export', () => {
  beforeEach(() => jest.clearAllMocks())

  it('returns 401 when not authenticated', async () => {
    ref.client = createMockSupabaseClient({ user: null })
    const res = await GET(makeRequest('http://localhost/api/tabs/export'))
    expect(res.status).toBe(401)
  })

  it('exports as JSON by default', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { tabs: { data: sampleTabs, error: null } },
    })

    const res = await GET(makeRequest('http://localhost/api/tabs/export'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.count).toBe(2)
    expect(body.tabs).toHaveLength(2)
    expect(body.tabs[0].tags).toEqual(['javascript', 'react'])
    // tabs_tags should be removed from output
    expect(body.tabs[0]).not.toHaveProperty('tabs_tags')
  })

  it('exports as CSV', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { tabs: { data: sampleTabs, error: null } },
    })

    const res = await GET(makeRequest('http://localhost/api/tabs/export?format=csv'))
    const text = await res.text()

    expect(res.headers.get('Content-Type')).toBe('text/csv')
    expect(res.headers.get('Content-Disposition')).toMatch(/tab-stasher-export.*\.csv/)
    expect(text).toContain('Title,URL,Category,Tags,Created At,Summary')
    expect(text).toContain('Example Page')
    expect(text).toContain('javascript, react')
  })

  it('exports as Markdown', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { tabs: { data: sampleTabs, error: null } },
    })

    const res = await GET(makeRequest('http://localhost/api/tabs/export?format=markdown'))
    const text = await res.text()

    expect(res.headers.get('Content-Type')).toBe('text/markdown')
    expect(text).toContain('# Tab Stasher Export')
    expect(text).toContain('## design')
    expect(text).toContain('## technology')
    expect(text).toContain('[Example Page](https://example.com/page1)')
    expect(text).toContain('Tags: javascript, react')
    expect(text).toContain('> A brief summary')
  })

  it('exports as Bookmarks HTML', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { tabs: { data: sampleTabs, error: null } },
    })

    const res = await GET(makeRequest('http://localhost/api/tabs/export?format=bookmarks'))
    const text = await res.text()

    expect(res.headers.get('Content-Type')).toBe('text/html')
    expect(text).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
    expect(text).toContain('<H3>technology</H3>')
    expect(text).toContain('HREF="https://example.com/page1"')
    expect(text).toContain('ADD_DATE=')
  })

  it('escapes HTML entities in bookmarks export', async () => {
    const tabsWithHtml = [
      {
        ...sampleTabs[0],
        title: 'Test <script>alert("xss")</script>',
        url: 'https://example.com/page?a=1&b=2',
        primary_category: 'cat & dog',
      },
    ]
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { tabs: { data: tabsWithHtml, error: null } },
    })

    const res = await GET(makeRequest('http://localhost/api/tabs/export?format=bookmarks'))
    const text = await res.text()

    expect(text).toContain('&lt;script&gt;')
    expect(text).toContain('a=1&amp;b=2')
    expect(text).toContain('cat &amp; dog')
  })

  it('returns empty JSON export when user has no tabs', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { tabs: { data: [], error: null } },
    })

    const res = await GET(makeRequest('http://localhost/api/tabs/export'))
    const body = await res.json()

    expect(body.count).toBe(0)
    expect(body.tabs).toEqual([])
  })

  it('returns 500 on database error', async () => {
    ref.client = createMockSupabaseClient({
      user: testUser,
      queryResults: { tabs: { data: null, error: { message: 'query failed' } } },
    })

    const res = await GET(makeRequest('http://localhost/api/tabs/export'))
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(body.error).toBe('query failed')
  })
})
