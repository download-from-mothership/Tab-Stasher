"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { Sheet } from "@silk-hq/components"
import { Button } from "@/components/ui/button"
import { ExternalLink, MoreVertical, ChevronDown, ChevronRight, Sparkles } from "lucide-react"
import { CategoryBadge } from "@/components/ui/category-badge"
import { Card, CardContent, CardTitle } from "@/components/ui/card"
import "@/styles/silk-card.css"
import { SilkCard } from "@/components/ui/silk-card"
import { cn } from "@/lib/utils"

interface CategoryTabListProps {
  refreshKey?: number
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

interface CategoryGroup {
  name: string
  tabs: Tab[]
  isExpanded: boolean
}

export function CategoryTabList({ refreshKey, searchQuery = "", onResultsCountChange }: CategoryTabListProps) {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    const fetchTabs = async () => {
      try {
        const { getTabs } = await import('@/lib/supabase')
        const fetchedTabs = await getTabs()
        // Ensure tabs is always an array and has valid data
        const validTabs = Array.isArray(fetchedTabs) ? fetchedTabs.filter(tab => 
          tab && typeof tab === 'object' && tab.id
        ) : []
        setTabs(validTabs)
      } catch (error) {
        console.error('Error fetching tabs:', error)
        setError('Failed to load tabs')
        setTabs([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchTabs()
  }, [refreshKey])

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

  // Group tabs by category when tabs change
  useEffect(() => {
    try {
      if (filteredTabs.length === 0) {
        setCategoryGroups([])
        return
      }

      // Group tabs by primary category
      const grouped = filteredTabs.reduce((acc, tab) => {
        const category = tab.primary_category || 'Uncategorized'
        
        if (!acc[category]) {
          acc[category] = []
        }
        
        acc[category].push(tab)
        return acc
      }, {} as Record<string, Tab[]>)

      // Convert to array and sort tabs within each category by created_at (newest first)
      const categoryGroupsArray = Object.entries(grouped).map(([name, tabs]) => ({
        name,
        tabs: tabs.sort((a, b) => {
          const dateA = new Date(a.created_at || 0).getTime()
          const dateB = new Date(b.created_at || 0).getTime()
          return dateB - dateA
        }),
        isExpanded: true // Start expanded
      }))

      // Sort categories by total tabs (most tabs first)
      categoryGroupsArray.sort((a, b) => b.tabs.length - a.tabs.length)

      setCategoryGroups(categoryGroupsArray)
    } catch (error) {
      console.error('Error processing category groups:', error)
      setCategoryGroups([])
    }
  }, [filteredTabs])

  // Report results count
  useEffect(() => {
    try {
      if (typeof onResultsCountChange === 'function') {
        onResultsCountChange(filteredTabs.length)
      }
    } catch (error) {
      console.error('Error reporting results count:', error)
    }
    // Only depend on filteredTabs.length to avoid infinite loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filteredTabs.length])

  const toggleCategory = (categoryName: string) => {
    setCategoryGroups(prev => 
      prev.map(group => 
        group.name === categoryName 
          ? { ...group, isExpanded: !group.isExpanded }
          : group
      )
    )
  }

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

  return (
    <div className="space-y-6">
      {categoryGroups.map((category) => (
        <div key={category.name} className="space-y-3">
          {/* Category Header */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <button
              onClick={() => toggleCategory(category.name)}
              className="flex items-center gap-3 text-lg font-semibold hover:text-primary transition-colors"
            >
              {category.isExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
              <div className="flex items-center gap-3">
                <span
                  className="category-name-theming px-3 py-1 rounded-lg font-bold text-base"
                  style={{
                    color: 'var(--primary-foreground)',
                    background: 'var(--primary)',
                    fontFamily: 'var(--font-sans)',
                    letterSpacing: 'var(--tracking-normal)',
                  }}
                >
                  {category.name}
                </span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {category.tabs.length} {category.tabs.length === 1 ? 'tab' : 'tabs'}
                </span>
              </div>
            </button>
            <div className="text-sm text-muted-foreground">
              Most recent: {(() => {
                try {
                  const firstTab = category.tabs[0]
                  if (firstTab?.created_at) {
                    return new Date(firstTab.created_at).toLocaleDateString()
                  }
                  return 'Unknown'
                } catch (error) {
                  return 'Unknown'
                }
              })()}
            </div>
          </div>

          {/* Category Tabs Grid */}
          {category.isExpanded && (
            <div
              className="overflow-x-auto px-2"
              style={{
                scrollSnapType: 'x mandatory',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              <div
                className="flex gap-4 pb-4"
                style={{
                  minWidth: '100%',
                  width: 'fit-content',
                  maxWidth: 'none',
                }}
              >
                {category.tabs.map((tab, index) => (
                  <div
                    key={tab.id}
                    className="relative group flex-shrink-0"
                    style={{
                      width: 'calc((100vw - 2rem - 3 * 1rem) / 4)', // 2rem for px-2 padding, 1rem gap
                      maxWidth: '340px',
                      minWidth: '220px',
                      scrollSnapAlign: 'start',
                    }}
                  >
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
                                    e.currentTarget.style.display = 'none'
                                  }}
                                />
                              </div>
                            </div>
                          )}
                          <div className="flex flex-col justify-end h-24 p-4">
                            {/* Removed rank and date display */}
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
                ))}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
} 