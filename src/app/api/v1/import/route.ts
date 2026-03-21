import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { authenticateApiKey, requireScopes, apiCorsHeaders } from '@/lib/api-auth'

export const dynamic = 'force-dynamic'

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: apiCorsHeaders })
}

interface ImportItem {
  url: string
  title?: string
  description?: string
  tags?: string[]
  category?: string
  created_at?: string
}

function parsePocketExport(html: string): ImportItem[] {
  const items: ImportItem[] = []
  const linkRegex = /<a\s+href="([^"]+)"[^>]*(?:time_added="(\d+)")?[^>]*(?:tags="([^"]*)")?[^>]*>([^<]*)<\/a>/gi
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    items.push({
      url: match[1],
      title: match[4] || undefined,
      tags: match[3] ? match[3].split(',').map(t => t.trim()).filter(Boolean) : undefined,
      created_at: match[2] ? new Date(parseInt(match[2]) * 1000).toISOString() : undefined,
    })
  }
  return items
}

function parseBookmarksHtml(html: string): ImportItem[] {
  const items: ImportItem[] = []
  const linkRegex = /<a\s+href="([^"]+)"[^>]*(?:add_date="(\d+)")?[^>]*>([^<]*)<\/a>/gi
  let match
  while ((match = linkRegex.exec(html)) !== null) {
    const url = match[1]
    if (url.startsWith('http://') || url.startsWith('https://')) {
      items.push({
        url,
        title: match[3] || undefined,
        created_at: match[2] ? new Date(parseInt(match[2]) * 1000).toISOString() : undefined,
      })
    }
  }
  return items
}

function parseRaindropCsv(csv: string): ImportItem[] {
  const items: ImportItem[] = []
  const lines = csv.split('\n')
  if (lines.length < 2) return items

  // Find column indices from header
  const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
  const urlIdx = header.indexOf('url') !== -1 ? header.indexOf('url') : header.indexOf('link')
  const titleIdx = header.indexOf('title')
  const descIdx = header.indexOf('description') !== -1 ? header.indexOf('description') : header.indexOf('note')
  const tagsIdx = header.indexOf('tags')
  const folderIdx = header.indexOf('folder') !== -1 ? header.indexOf('folder') : header.indexOf('collection')
  const dateIdx = header.indexOf('created')

  if (urlIdx === -1) return items

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parse (handles basic quoting)
    const cols = parseCsvLine(line)
    const url = cols[urlIdx]?.replace(/"/g, '')
    if (!url || (!url.startsWith('http://') && !url.startsWith('https://'))) continue

    items.push({
      url,
      title: titleIdx >= 0 ? cols[titleIdx]?.replace(/"/g, '') : undefined,
      description: descIdx >= 0 ? cols[descIdx]?.replace(/"/g, '') : undefined,
      tags: tagsIdx >= 0 ? cols[tagsIdx]?.replace(/"/g, '').split(',').map(t => t.trim()).filter(Boolean) : undefined,
      category: folderIdx >= 0 ? cols[folderIdx]?.replace(/"/g, '').toLowerCase() : undefined,
      created_at: dateIdx >= 0 ? cols[dateIdx]?.replace(/"/g, '') : undefined,
    })
  }
  return items
}

function parseCsvLine(line: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQuotes = !inQuotes
    } else if (ch === ',' && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += ch
    }
  }
  result.push(current.trim())
  return result
}

function parseJsonImport(json: string): ImportItem[] {
  const parsed = JSON.parse(json)
  const items = Array.isArray(parsed) ? parsed : parsed.items || parsed.bookmarks || parsed.data || []
  return items
    .filter((item: any) => item.url || item.link || item.href)
    .map((item: any) => ({
      url: item.url || item.link || item.href,
      title: item.title || item.name,
      description: item.description || item.excerpt || item.note,
      tags: item.tags,
      category: item.category || item.folder,
    }))
}

// POST /api/v1/import — Import bookmarks from various sources
export async function POST(request: Request) {
  const auth = await authenticateApiKey(request)
  if (!auth) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401, headers: apiCorsHeaders })
  }

  const scopeErr = requireScopes(auth, ['write'])
  if (scopeErr) return scopeErr

  const contentType = request.headers.get('content-type') || ''
  let body: any
  let rawContent: string
  let format: string

  if (contentType.includes('application/json')) {
    body = await request.json()
    format = body.format || 'json'
    rawContent = body.data || ''
    if (!rawContent && body.items) {
      // Direct JSON array of items
      rawContent = JSON.stringify(body.items)
      format = 'json'
    }
  } else {
    rawContent = await request.text()
    // Auto-detect format
    if (rawContent.trim().startsWith('<!') || rawContent.trim().startsWith('<')) {
      format = rawContent.includes('time_added=') ? 'pocket' : 'bookmarks'
    } else if (rawContent.trim().startsWith('{') || rawContent.trim().startsWith('[')) {
      format = 'json'
    } else {
      format = 'raindrop'
    }
  }

  if (!rawContent) {
    return NextResponse.json(
      { error: 'No data provided. Send bookmarks as HTML, CSV, or JSON.' },
      { status: 400, headers: apiCorsHeaders }
    )
  }

  let items: ImportItem[]
  try {
    switch (format) {
      case 'pocket':
        items = parsePocketExport(rawContent)
        break
      case 'raindrop':
        items = parseRaindropCsv(rawContent)
        break
      case 'bookmarks':
        items = parseBookmarksHtml(rawContent)
        break
      case 'json':
        items = parseJsonImport(rawContent)
        break
      default:
        return NextResponse.json(
          { error: `Unknown format: ${format}. Supported: pocket, raindrop, bookmarks, json` },
          { status: 400, headers: apiCorsHeaders }
        )
    }
  } catch (e: any) {
    return NextResponse.json(
      { error: `Failed to parse import data: ${e.message}` },
      { status: 400, headers: apiCorsHeaders }
    )
  }

  if (items.length === 0) {
    return NextResponse.json(
      { error: 'No valid bookmarks found in the provided data' },
      { status: 400, headers: apiCorsHeaders }
    )
  }

  // Cap at 500 items per import
  const toImport = items.slice(0, 500)
  const supabase = getServiceClient()

  let imported = 0
  let duplicates = 0
  let errors = 0

  for (const item of toImport) {
    try {
      const tagNames = Array.from(new Set(item.tags || []))
      const { data, error } = await supabase.rpc('save_tab_with_tags', {
        p_url: item.url,
        p_title: item.title || null,
        p_description: item.description || null,
        p_image: null,
        p_favicon: null,
        p_content: null,
        p_primary_category: (item.category || 'uncategorized').toLowerCase().trim(),
        p_secondary_category: 'general',
        p_category_confidence: 0.5,
        p_auto_categorized_at: item.category ? new Date().toISOString() : null,
        p_tag_names: tagNames,
        p_user_id: auth.userId,
      })

      if (error) {
        errors++
      } else if (data?.[0]?.is_duplicate) {
        duplicates++
      } else {
        imported++
      }
    } catch {
      errors++
    }
  }

  return NextResponse.json({
    message: `Import complete: ${imported} new, ${duplicates} duplicates, ${errors} errors`,
    summary: {
      total_parsed: items.length,
      processed: toImport.length,
      imported,
      duplicates,
      errors,
      skipped: items.length - toImport.length,
    },
  }, { headers: apiCorsHeaders })
}
