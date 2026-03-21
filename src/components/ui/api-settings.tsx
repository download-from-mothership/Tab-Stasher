'use client'

import { useState, useEffect, useCallback } from 'react'
import { Key, Plus, Trash2, Copy, Check, Webhook, ExternalLink } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  key_prefix: string
  scopes: string[]
  last_used_at: string | null
  expires_at: string | null
  revoked_at: string | null
  created_at: string
}

interface WebhookItem {
  id: string
  url: string
  events: string[]
  is_active: boolean
  last_triggered_at: string | null
  failure_count: number
  created_at: string
}

export function ApiSettings() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read', 'write'])
  const [showCreateKey, setShowCreateKey] = useState(false)
  const [createdKey, setCreatedKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [newWebhookUrl, setNewWebhookUrl] = useState('')
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>(['tab.created'])
  const [showCreateWebhook, setShowCreateWebhook] = useState(false)
  const [createdSecret, setCreatedSecret] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [keysRes, webhooksRes] = await Promise.all([
        fetch('/api/api-keys'),
        fetch('/api/webhooks'),
      ])
      if (keysRes.ok) {
        const keysData = await keysRes.json()
        setApiKeys(keysData.api_keys || [])
      }
      if (webhooksRes.ok) {
        const webhooksData = await webhooksRes.json()
        setWebhooks(webhooksData.webhooks || [])
      }
    } catch (err) {
      console.error('Failed to fetch API settings:', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const createApiKey = async () => {
    const res = await fetch('/api/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newKeyName || 'API Key', scopes: newKeyScopes }),
    })
    if (res.ok) {
      const data = await res.json()
      setCreatedKey(data.api_key.key)
      setNewKeyName('')
      setShowCreateKey(false)
      fetchData()
    }
  }

  const revokeApiKey = async (id: string) => {
    const res = await fetch(`/api/api-keys?id=${id}`, { method: 'DELETE' })
    if (res.ok) fetchData()
  }

  const copyKey = () => {
    if (createdKey) {
      navigator.clipboard.writeText(createdKey)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const createWebhook = async () => {
    const res = await fetch('/api/webhooks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: newWebhookUrl, events: newWebhookEvents }),
    })
    if (res.ok) {
      const data = await res.json()
      setCreatedSecret(data.webhook.secret)
      setNewWebhookUrl('')
      setShowCreateWebhook(false)
      fetchData()
    }
  }

  const deleteWebhook = async (id: string) => {
    const res = await fetch(`/api/webhooks?id=${id}`, { method: 'DELETE' })
    if (res.ok) fetchData()
  }

  const toggleScope = (scope: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(scope) ? list.filter(s => s !== scope) : [...list, scope])
  }

  const allEvents = ['tab.created', 'tab.deleted', 'tab.updated', 'collection.created', 'collection.updated']

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    )
  }

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Created Key Banner */}
      {createdKey && (
        <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4">
          <p className="text-sm text-green-400 font-medium mb-2">API key created — save it now, it won't be shown again:</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-black/30 rounded px-3 py-2 text-green-300 font-mono break-all">
              {createdKey}
            </code>
            <button onClick={copyKey} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-white/60" />}
            </button>
          </div>
          <button onClick={() => setCreatedKey(null)} className="mt-2 text-xs text-white/40 hover:text-white/60">
            Dismiss
          </button>
        </div>
      )}

      {/* Created Webhook Secret Banner */}
      {createdSecret && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
          <p className="text-sm text-blue-400 font-medium mb-2">Webhook secret — save it now for signature verification:</p>
          <code className="block text-xs bg-black/30 rounded px-3 py-2 text-blue-300 font-mono break-all">
            {createdSecret}
          </code>
          <button onClick={() => setCreatedSecret(null)} className="mt-2 text-xs text-white/40 hover:text-white/60">
            Dismiss
          </button>
        </div>
      )}

      {/* API Keys Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Key className="w-5 h-5 text-purple-400" /> API Keys
          </h2>
          <button
            onClick={() => setShowCreateKey(!showCreateKey)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Key
          </button>
        </div>

        {showCreateKey && (
          <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-3">
            <input
              type="text"
              placeholder="Key name (e.g., Zapier Integration)"
              value={newKeyName}
              onChange={e => setNewKeyName(e.target.value)}
              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-purple-500"
            />
            <div className="flex gap-2">
              {['read', 'write', 'delete'].map(scope => (
                <button
                  key={scope}
                  onClick={() => toggleScope(scope, newKeyScopes, setNewKeyScopes)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    newKeyScopes.includes(scope)
                      ? 'bg-purple-500/20 border-purple-500/50 text-purple-300'
                      : 'bg-transparent border-white/10 text-white/40'
                  }`}
                >
                  {scope}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={createApiKey} className="px-4 py-1.5 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors">
                Create
              </button>
              <button onClick={() => setShowCreateKey(false)} className="px-4 py-1.5 text-sm text-white/40 hover:text-white/60">
                Cancel
              </button>
            </div>
          </div>
        )}

        {apiKeys.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            No API keys yet. Create one to start using the REST API.
          </div>
        ) : (
          <div className="space-y-2">
            {apiKeys.map(key => (
              <div key={key.id} className={`flex items-center justify-between bg-white/5 rounded-xl px-4 py-3 ${key.revoked_at ? 'opacity-50' : ''}`}>
                <div>
                  <p className="text-sm text-white font-medium">{key.name}</p>
                  <p className="text-xs text-white/40 font-mono">{key.key_prefix}...</p>
                  <div className="flex gap-1 mt-1">
                    {key.scopes.map(s => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/50">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {key.last_used_at && (
                    <span className="text-xs text-white/30">
                      Last used {new Date(key.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                  {key.revoked_at ? (
                    <span className="text-xs text-red-400">Revoked</span>
                  ) : (
                    <button onClick={() => revokeApiKey(key.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors text-white/30 hover:text-red-400">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Webhooks Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Webhook className="w-5 h-5 text-blue-400" /> Webhooks
          </h2>
          <button
            onClick={() => setShowCreateWebhook(!showCreateWebhook)}
            className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-500/20 text-blue-300 rounded-lg hover:bg-blue-500/30 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Webhook
          </button>
        </div>

        {showCreateWebhook && (
          <div className="bg-white/5 rounded-xl p-4 mb-4 space-y-3">
            <input
              type="url"
              placeholder="https://your-app.com/webhook"
              value={newWebhookUrl}
              onChange={e => setNewWebhookUrl(e.target.value)}
              className="w-full px-3 py-2 bg-black/30 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <div className="flex flex-wrap gap-2">
              {allEvents.map(event => (
                <button
                  key={event}
                  onClick={() => toggleScope(event, newWebhookEvents, setNewWebhookEvents)}
                  className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                    newWebhookEvents.includes(event)
                      ? 'bg-blue-500/20 border-blue-500/50 text-blue-300'
                      : 'bg-transparent border-white/10 text-white/40'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={createWebhook} className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors">
                Create
              </button>
              <button onClick={() => setShowCreateWebhook(false)} className="px-4 py-1.5 text-sm text-white/40 hover:text-white/60">
                Cancel
              </button>
            </div>
          </div>
        )}

        {webhooks.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            No webhooks configured. Create one to receive events when tabs are saved.
          </div>
        ) : (
          <div className="space-y-2">
            {webhooks.map(wh => (
              <div key={wh.id} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm text-white font-mono flex items-center gap-1">
                    <ExternalLink className="w-3 h-3 text-white/30" />
                    {wh.url}
                  </p>
                  <div className="flex gap-1 mt-1">
                    {wh.events.map(e => (
                      <span key={e} className="text-[10px] px-1.5 py-0.5 bg-white/10 rounded text-white/50">{e}</span>
                    ))}
                  </div>
                  {wh.failure_count > 0 && (
                    <span className="text-xs text-yellow-400 mt-1">
                      {wh.failure_count} failures
                    </span>
                  )}
                </div>
                <button onClick={() => deleteWebhook(wh.id)} className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors text-white/30 hover:text-red-400">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* API Documentation Quick Reference */}
      <div className="bg-white/5 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-white mb-3">API Quick Reference</h3>
        <div className="space-y-2 text-xs font-mono text-white/50">
          <div><span className="text-green-400">GET</span> /api/v1/tabs — List your tabs</div>
          <div><span className="text-blue-400">POST</span> /api/v1/tabs — Save a new tab</div>
          <div><span className="text-green-400">GET</span> /api/v1/tabs/:id — Get a tab</div>
          <div><span className="text-yellow-400">PATCH</span> /api/v1/tabs/:id — Update a tab</div>
          <div><span className="text-red-400">DELETE</span> /api/v1/tabs/:id — Delete a tab</div>
          <div><span className="text-green-400">GET</span> /api/v1/search?q=... — Search tabs</div>
          <div><span className="text-green-400">GET</span> /api/v1/collections — List collections</div>
          <div><span className="text-blue-400">POST</span> /api/v1/collections — Create collection</div>
          <div><span className="text-green-400">GET</span> /api/v1/tags — List tags</div>
          <div><span className="text-blue-400">POST</span> /api/v1/import — Import bookmarks (Pocket, Raindrop, HTML)</div>
        </div>
        <p className="text-xs text-white/30 mt-3">
          Authenticate with: <code className="text-white/50">Authorization: Bearer ts_live_...</code>
        </p>
      </div>
    </div>
  )
}
