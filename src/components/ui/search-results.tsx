"use client"

import * as React from "react"
import { useEffect, useState, useCallback, useRef } from "react"
import { Button } from "@/components/ui/button"
import { ExternalLink, MoreVertical, Loader2 } from "lucide-react"
import { CategoryBadge } from "@/components/ui/category-badge"
import "@/styles/silk-card.css"
import { SilkCard } from "@/components/ui/silk-card"
import type { SearchFilters } from "@/components/ui/search-filters"

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
}

interface SearchResponse {
  results: Tab[]
  total: number
  categories: string[]
  tags: string[]
  hasMore: boolean
}

interface SearchResultsProps {
  query: string
  filters: SearchFilters
  onResultsCountChange?: (count: number) => void
  onMetadata?: (meta: { categories: string[]; tags: string[] }) => void
}

export function SearchResults({
  query,
  filters,
  onResultsCountChange,
  onMetadata,
}: SearchResultsProps) {
  const [results, setResults] = useState<Tab[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(false)
  const offsetRef = useRef(0)
  const onResultsCountRef = useRef(onResultsCountChange)
  const onMetadataRef = useRef(onMetadata)

  onResultsCountRef.current = onResultsCountChange
  onMetadataRef.current = onMetadata

  const doSearch = useCallback(
    async (append: boolean) => {
      setIsLoading(true)
      setError(null)

      const params = new URLSearchParams()
      if (query) params.set("q", query)
      if (filters.category) params.set("category", filters.category)
      if (filters.domain) params.set("domain", filters.domain)
      if (filters.tag) params.set("tag", filters.tag)
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom)
      if (filters.dateTo) params.set("dateTo", filters.dateTo)
      params.set("limit", "50")
      const currentOffset = append ? offsetRef.current : 0
      params.set("offset", String(currentOffset))

      try {
        const res = await fetch(`/api/tabs/search?${params.toString()}`)
        if (!res.ok) throw new Error("Search request failed")
        const data: SearchResponse = await res.json()

        setResults((prev) => {
          const next = append ? [...prev, ...data.results] : data.results
          offsetRef.current = next.length
          onResultsCountRef.current?.(data.total)
          return next
        })
        setHasMore(data.hasMore)
        onMetadataRef.current?.({ categories: data.categories, tags: data.tags })
      } catch (err: any) {
        setError(err.message || "Search failed")
      } finally {
        setIsLoading(false)
      }
    },
    [query, filters.category, filters.domain, filters.tag, filters.dateFrom, filters.dateTo]
  )

  // Re-fetch when query or filters change
  useEffect(() => {
    offsetRef.current = 0
    doSearch(false)
  }, [doSearch])

  if (isLoading && results.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Search error: {error}</p>
      </div>
    )
  }

  if (results.length === 0 && !isLoading) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">
          No results found{query ? ` for "${query}"` : ""}. Try adjusting your search or filters.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {results.map((tab) => (
          <div key={tab.id} className="relative group">
            <SilkCard
              presentTrigger={
                <div className="w-full h-[420px] flex flex-col justify-between bg-white rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group-hover:shadow-2xl">
                  {tab.image && (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-72 h-72 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                        <img
                          src={tab.image}
                          alt={tab.title || "Tab preview"}
                          className="object-contain w-full h-full rounded-xl"
                          onError={(e) => {
                            e.currentTarget.style.display = "none"
                          }}
                        />
                      </div>
                    </div>
                  )}
                  <div className="flex flex-col justify-end h-24 p-4">
                    <h3 className="text-lg font-bold leading-tight w-full line-clamp-2">
                      {tab.title || "Untitled"}
                    </h3>
                  </div>
                </div>
              }
              sheetContent={
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{tab.title || "Untitled"}</h2>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" asChild>
                        <a href={tab.url} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Open
                        </a>
                      </Button>
                      <Button variant="ghost" size="sm">
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
                </div>
              }
            />
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="flex justify-center">
          <Button
            onClick={() => doSearch(true)}
            disabled={isLoading}
            variant="outline"
            className="min-w-32"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Loading...
              </>
            ) : (
              "Load More"
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
