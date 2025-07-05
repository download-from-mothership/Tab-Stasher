"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { SilkCard } from "@/app/ui/silk-card"
import { Button } from "@/app/ui/button"
import { ExternalLink, MoreVertical } from "lucide-react"
import { Tab } from "@/lib/supabase"
import { getTabs } from "@/lib/supabase"
import { CategoryBadge } from "@/app/ui/category-badge"
import { Card, CardContent, CardTitle } from "@/app/ui/card"

interface TabListProps {
  refreshKey?: number
}

export function TabList({ refreshKey }: TabListProps) {
  const [tabs, setTabs] = useState<Tab[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchTabs = async () => {
      try {
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
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {tabs.map((tab) => (
        <SilkCard
          key={tab.id}
          presentTrigger={
            <div className="w-[340px] h-[420px] flex flex-col justify-between bg-white rounded-lg shadow-md">
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
                <p className="text-sm text-muted-foreground">{tab.url}</p>
                {tab.description && (
                  <p className="text-sm">{tab.description}</p>
                )}
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
            </div>
          }
        />
      ))}
    </div>
  )
} 