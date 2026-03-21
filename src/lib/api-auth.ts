import { createClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import crypto from 'crypto'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

function getServiceClient() {
  return createClient(supabaseUrl, supabaseServiceKey)
}

export function hashApiKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export function generateApiKey(): { key: string; prefix: string; hash: string } {
  const raw = crypto.randomBytes(32).toString('base64url')
  const key = `ts_live_${raw}`
  const prefix = key.substring(0, 16)
  const hash = hashApiKey(key)
  return { key, prefix, hash }
}

export interface ApiAuthResult {
  userId: string
  scopes: string[]
  keyId: string
}

/**
 * Authenticate a request using a Bearer API key.
 * Returns user info or null if invalid.
 */
export async function authenticateApiKey(request: Request): Promise<ApiAuthResult | null> {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ts_live_')) {
    return null
  }

  const apiKey = authHeader.replace('Bearer ', '')
  const keyHash = hashApiKey(apiKey)

  const supabase = getServiceClient()
  const { data, error } = await supabase
    .from('api_keys')
    .select('id, user_id, scopes, expires_at, revoked_at')
    .eq('key_hash', keyHash)
    .is('revoked_at', null)
    .single()

  if (error || !data) return null

  // Check expiration
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return null
  }

  // Update last_used_at (fire and forget)
  supabase
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then(() => {})

  return {
    userId: data.user_id,
    scopes: data.scopes,
    keyId: data.id,
  }
}

/**
 * Require specific scopes. Returns 403 response if insufficient.
 */
export function requireScopes(auth: ApiAuthResult, required: string[]): NextResponse | null {
  const missing = required.filter(s => !auth.scopes.includes(s))
  if (missing.length > 0) {
    return NextResponse.json(
      { error: 'Insufficient permissions', missing_scopes: missing },
      { status: 403 }
    )
  }
  return null
}

export const apiCorsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}
