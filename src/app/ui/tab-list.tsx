"use client"

import * as React from "react"
import { useEffect, useState } from "react"
import { SilkCard } from "@/app/ui/silk-card"
import { Button } from "@/app/ui/button"
import { ExternalLink, MoreVertical } from "lucide-react"
import { Tab } from "@/lib/supabase"
import { getTabs } from "@/lib/supabase"

export function TabList() {
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
  }, [])

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
            <div className="flex flex-col space-y-2 p-4">
              {tab.image && (
                <div className="relative aspect-video overflow-hidden rounded-lg">
                  <img
                    src={tab.image}
                    alt={tab.title || "Tab preview"}
                    className="object-cover w-full h-full"
                  />
                </div>
              )}
              <div className="space-y-1">
                <h3 className="font-semibold leading-none tracking-tight">
                  {tab.title || "Untitled"}
                </h3>
              </div>
              {tab.tags && tab.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
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