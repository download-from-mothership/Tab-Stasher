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

export function CategoryTabList({ refreshKey }: CategoryTabListProps) {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [categoryGroups, setCategoryGroups] = useState<CategoryGroup[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    setIsLoading(true)
    const fetchTabs = async () => {
      try {
        const { getTabs } = await import('@/lib/supabase')
        const fetchedTabs = await getTabs()
        setTabs(fetchedTabs)
      } catch (error) {
        console.error('Error fetching tabs:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchTabs()
  }, [refreshKey])

  // Group tabs by category when tabs change
  useEffect(() => {
    if (tabs.length === 0) {
      setCategoryGroups([])
      return
    }

    // Group tabs by primary category
    const grouped = tabs.reduce((acc, tab) => {
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
      tabs: tabs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
      isExpanded: true // Start expanded
    }))

    // Sort categories by total tabs (most tabs first)
    categoryGroupsArray.sort((a, b) => b.tabs.length - a.tabs.length)

    setCategoryGroups(categoryGroupsArray)
  }, [tabs])

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

  if (tabs.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No tabs saved yet. Add your first tab to get started!</p>
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
                <span>{category.name}</span>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {category.tabs.length} {category.tabs.length === 1 ? 'tab' : 'tabs'}
                </span>
              </div>
            </button>
            <div className="text-sm text-muted-foreground">
              Most recent: {new Date(category.tabs[0]?.created_at || '').toLocaleDateString()}
            </div>
          </div>

          {/* Category Tabs Grid */}
          {category.isExpanded && (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {category.tabs.map((tab, index) => (
                <div
                  key={tab.id}
                  className={cn(
                    "relative group",
                    // Add stacking effect - each card is slightly offset
                    index > 0 && "transform -translate-y-2"
                  )}
                  style={{
                    zIndex: category.tabs.length - index, // Higher index = higher z-index
                    transform: index > 0 ? `translateY(-${index * 8}px)` : 'none'
                  }}
                >
                  <SilkCard
                    presentTrigger={
                      <div className={cn(
                        "w-[340px] h-[420px] flex flex-col justify-between bg-white rounded-lg shadow-md cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 group-hover:shadow-2xl",
                        // Add subtle border to show stacking order
                        index > 0 && "border-2 border-primary/10"
                      )}>
                        {tab.image && (
                          <div className="flex items-center justify-center py-6">
                            <div className="w-72 h-72 rounded-xl bg-gray-50 flex items-center justify-center overflow-hidden">
                              <img
                                src={tab.image}
                                alt={tab.title || "Tab preview"}
                                className="object-contain w-full h-full rounded-xl"
                              />
                            </div>
                          </div>
                        )}
                        <div className="flex flex-col justify-end h-24 p-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">
                              #{index + 1} in {category.name}
                            </span>
                            <div className="flex items-center gap-1">
                              {index === 0 && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-100 text-green-800 text-xs font-medium">
                                  <Sparkles className="h-3 w-3" />
                                  NEW
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">
                                {new Date(tab.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
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
                        {tab.tags && tab.tags.length > 0 && (
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
          )}
        </div>
      ))}
    </div>
  )
} 