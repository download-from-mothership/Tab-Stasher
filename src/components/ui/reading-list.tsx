"use client"

import * as React from "react"
import { useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, MoreVertical, BookOpen, Check, Circle, Filter } from "lucide-react"
import { CategoryBadge } from "@/components/ui/category-badge"
import "@/styles/silk-card.css"
import { SilkCard } from "@/components/ui/silk-card"

interface Tab {
  id: string
  url: string
  title: string | null
  description: string | null
  image: string | null
  favicon: string | null
  content: string | null
  created_at: string
  user_id: string | null
  tags: string[]
  primary_category: string | null
  secondary_category: string | null
  category_confidence: number | null
  auto_categorized_at: string | null
  is_read: boolean
  read_at: string | null
  reading_list_added_at: string | null
}

type FilterMode = 'all' | 'unread' | 'read'

export const ReadingList = React.memo(function ReadingList() {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<FilterMode>('all')
  const [totalCount, setTotalCount] = useState(0)
  const [unreadCount, setUnreadCount] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [actionLoading, setActionLoading] = useState<Set<string>>(new Set())

  const fetchReadingList = useCallback(async (filterMode: FilterMode = filter, reset = true) => {
    try {
      if (reset) setIsLoading(true)
      setError(null)

      const offset = reset ? 0 : tabs.length
      const res = await fetch(`/api/tabs/reading-list?filter=${filterMode}&limit=50&offset=${offset}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load reading list')
      }

      const data = await res.json()
      if (reset) {
        setTabs(data.results)
      } else {
        setTabs(prev => [...prev, ...data.results])
      }
      setTotalCount(data.total)
      setUnreadCount(data.unread)
      setHasMore(data.hasMore)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [filter, tabs.length])

  useEffect(() => {
    fetchReadingList(filter, true)
  }, [filter])

  const handleAction = useCallback(async (ids: string[], action: string) => {
    setActionLoading(prev => {
      const next = new Set(prev)
      ids.forEach(id => next.add(id))
      return next
    })

    try {
      const res = await fetch('/api/tabs/reading-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, action }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Action failed')
      }

      // Update local state optimistically
      if (action === 'mark_read') {
        setTabs(prev => prev.map(t =>
          ids.includes(t.id) ? { ...t, is_read: true, read_at: new Date().toISOString() } : t
        ))
        setUnreadCount(prev => Math.max(0, prev - ids.length))
      } else if (action === 'mark_unread') {
        setTabs(prev => prev.map(t =>
          ids.includes(t.id) ? { ...t, is_read: false, read_at: null } : t
        ))
        setUnreadCount(prev => prev + ids.length)
      } else if (action === 'remove') {
        setTabs(prev => prev.filter(t => !ids.includes(t.id)))
        setTotalCount(prev => prev - ids.length)
        setUnreadCount(prev => {
          const removedUnread = ids.filter(id => {
            const tab = tabs.find(t => t.id === id)
            return tab && !tab.is_read
          }).length
          return Math.max(0, prev - removedUnread)
        })
      }
    } catch (err: any) {
      setError(err.message)
      // Refresh on error to get correct state
      fetchReadingList(filter, true)
    } finally {
      setActionLoading(prev => {
        const next = new Set(prev)
        ids.forEach(id => next.delete(id))
        return next
      })
    }
  }, [tabs, filter, fetchReadingList])

  if (isLoading && tabs.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Error loading reading list: {error}</p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchReadingList(filter, true)}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold">Reading List</h2>
          <span className="text-sm text-muted-foreground">
            ({unreadCount} unread of {totalCount})
          </span>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
          {(['all', 'unread', 'read'] as FilterMode[]).map(mode => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1 text-sm rounded-md transition-colors capitalize ${
                filter === mode
                  ? 'bg-background shadow-sm font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State */}
      {tabs.length === 0 && (
        <div className="text-center p-8">
          <div className="flex flex-col items-center gap-4">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-semibold text-foreground">
                {filter === 'all' ? 'No tabs in reading list' :
                 filter === 'unread' ? 'All caught up!' :
                 'No read tabs yet'}
              </h3>
              <p className="text-muted-foreground">
                {filter === 'all'
                  ? 'Add tabs to your reading list from the tab detail view'
                  : filter === 'unread'
                  ? 'All your reading list tabs have been read'
                  : 'Mark tabs as read to see them here'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Tabs Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {tabs.map((tab) => {
          const isActionLoading = actionLoading.has(tab.id)
          return (
            <div key={tab.id} className="relative group">
              {/* Read/Unread toggle button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleAction([tab.id], tab.is_read ? 'mark_unread' : 'mark_read')
                }}
                disabled={isActionLoading}
                className={`absolute top-2 left-2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                  tab.is_read
                    ? 'bg-green-500 text-white'
                    : 'bg-white/90 border-2 border-gray-300 text-gray-400 opacity-0 group-hover:opacity-100'
                }`}
                title={tab.is_read ? 'Mark as unread' : 'Mark as read'}
              >
                {tab.is_read ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Circle className="h-3 w-3" />
                )}
              </button>

              <SilkCard
                presentTrigger={
                  <div className={`w-full h-[420px] flex flex-col justify-between bg-white rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group-hover:shadow-2xl ${
                    tab.is_read ? 'opacity-70' : ''
                  }`}>
                    {tab.image && (
                      <div className="flex items-center justify-center py-6">
                        <div className="w-72 h-72 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                          <img
                            src={tab.image}
                            alt={tab.title || "Tab preview"}
                            className="object-contain w-full h-full rounded-xl"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none'
                            }}
                          />
                        </div>
                      </div>
                    )}
                    <div className="flex flex-col justify-end h-24 p-4">
                      <h3 className={`text-lg font-bold leading-tight w-full line-clamp-2 ${
                        tab.is_read ? 'text-muted-foreground' : ''
                      }`}>
                        {tab.title || "Untitled"}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Added to reading list {tab.reading_list_added_at
                          ? new Date(tab.reading_list_added_at).toLocaleDateString()
                          : ''}
                      </p>
                    </div>
                  </div>
                }
                sheetContent={
                  <div className="p-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold">{tab.title || "Untitled"}</h2>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleAction([tab.id], tab.is_read ? 'mark_unread' : 'mark_read')}
                          disabled={isActionLoading}
                        >
                          {tab.is_read ? (
                            <><Circle className="h-4 w-4 mr-2" /> Mark Unread</>
                          ) : (
                            <><Check className="h-4 w-4 mr-2" /> Mark Read</>
                          )}
                        </Button>
                        <Button variant="outline" size="sm" asChild>
                          <a href={tab.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4 mr-2" />
                            Open
                          </a>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleAction([tab.id], 'remove')}
                          disabled={isActionLoading}
                          title="Remove from reading list"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {tab.primary_category && (
                        <CategoryBadge
                          primaryCategory={tab.primary_category}
                          secondaryCategory={tab.secondary_category || undefined}
                          confidence={tab.category_confidence || undefined}
                        />
                      )}
                    </div>
                    {tab.tags && Array.isArray(tab.tags) && tab.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {tab.tags.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {tab.description && (
                      <p className="text-sm text-muted-foreground">{tab.description}</p>
                    )}
                    {tab.read_at && (
                      <p className="text-xs text-green-600">
                        Read on {new Date(tab.read_at).toLocaleDateString()} at {new Date(tab.read_at).toLocaleTimeString()}
                      </p>
                    )}
                    <div className="text-xs text-muted-foreground">
                      Saved on {new Date(tab.created_at).toLocaleDateString()}
                    </div>
                  </div>
                }
              />
            </div>
          )
        })}
      </div>

      {/* Load More */}
      {hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={() => fetchReadingList(filter, false)}
            disabled={isLoading}
            variant="outline"
            className="min-w-32"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-900 mr-2" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
      )}
    </div>
  )
})
