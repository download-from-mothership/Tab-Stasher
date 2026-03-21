"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Sheet } from "@silk-hq/components"
import { Button } from "@/components/ui/button"
import { ExternalLink, MoreVertical, Trash2, Archive, CheckSquare, XCircle } from "lucide-react"
import { CategoryBadge } from "@/components/ui/category-badge"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import "@/styles/silk-card.css"
import { SilkCard } from "@/components/ui/silk-card"
import { useTabs } from "@/components/ui/tabs-context"

interface TabListProps {
  searchQuery?: string
  onResultsCountChange?: (count: number) => void
}

// Define Tab type locally to avoid importing from supabase
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

export const TabList = React.memo(function TabList({ searchQuery = "", onResultsCountChange }: TabListProps) {
  const { tabs, isLoading, error, hasMore, loadMore } = useTabs()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">Error loading tabs: {error}</p>
      </div>
    )
  }

  // Filter tabs based on search query with safe null checks
  const filteredTabs = tabs.filter(tab => {
    if (!searchQuery.trim()) return true
    
    const query = searchQuery.toLowerCase()
    const title = tab.title?.toLowerCase() || ''
    const description = tab.description?.toLowerCase() || ''
    const url = tab.url?.toLowerCase() || ''
    const tags = Array.isArray(tab.tags) ? tab.tags : []
    const primaryCategory = tab.primary_category?.toLowerCase() || ''
    const secondaryCategory = tab.secondary_category?.toLowerCase() || ''
    
    return (
      title.includes(query) ||
      description.includes(query) ||
      url.includes(query) ||
      tags.some(tag => tag?.toLowerCase().includes(query)) ||
      primaryCategory.includes(query) ||
      secondaryCategory.includes(query)
    )
  })

  // Report results count
  useEffect(() => {
    try {
      if (onResultsCountChange) {
        onResultsCountChange(filteredTabs.length)
      }
    } catch (error) {
      console.error('Error reporting results count:', error)
    }
  }, [filteredTabs.length]) // Remove onResultsCountChange from dependencies to prevent infinite loop

  if (tabs.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No tabs saved yet. Add your first tab to get started!</p>
      </div>
    )
  }

  if (searchQuery && filteredTabs.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No tabs found matching "{searchQuery}"</p>
      </div>
    )
  }

  const hasSelection = selectedIds.size > 0

  return (
    <div className="space-y-6">
      {/* Bulk Action Bar */}
      {hasSelection && (
        <div className="sticky top-0 z-10 flex items-center gap-3 rounded-lg bg-primary/5 border border-primary/20 px-4 py-3">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" onClick={selectAll}>
              <CheckSquare className="h-4 w-4 mr-1" />
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => bulkAction('archive')}
              disabled={isBulkActionLoading}
            >
              <Archive className="h-4 w-4 mr-1" />
              Archive
            </Button>
            {showConfirmDelete ? (
              <div className="flex items-center gap-1">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => { bulkAction('delete'); setShowConfirmDelete(false) }}
                  disabled={isBulkActionLoading}
                >
                  Confirm Delete
                </Button>
                <Button variant="ghost" size="sm" onClick={() => setShowConfirmDelete(false)}>
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Button variant="destructive" size="sm" onClick={() => setShowConfirmDelete(true)}>
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => { clearSelection(); setShowConfirmDelete(false) }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredTabs.map((tab) => {
          const isSelected = selectedIds.has(tab.id)
          return (
            <div
              key={tab.id}
              className="relative group"
            >
              {/* Selection checkbox */}
              <button
                onClick={(e) => { e.stopPropagation(); toggleSelect(tab.id) }}
                className={`absolute top-2 left-2 z-10 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                  isSelected
                    ? 'bg-primary border-primary text-white'
                    : 'bg-white/80 border-gray-300 opacity-0 group-hover:opacity-100'
                }`}
              >
                {isSelected && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                    <polyline points="20,6 9,17 4,12" />
                  </svg>
                )}
              </button>

              <SilkCard
                presentTrigger={
                  <div className={`w-full h-[420px] flex flex-col justify-between bg-white rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group-hover:shadow-2xl ${
                    isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
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
                      <p className="text-sm text-muted-foreground">
                        {tab.description}
                      </p>
                    )}
                  </div>
                }
              />
            </div>
          )
        })}
      </div>

      {/* Load More Button */}
      {hasMore && !searchQuery && (
        <div className="flex justify-center">
          <Button
            onClick={loadMore}
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