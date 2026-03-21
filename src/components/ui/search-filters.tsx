"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { X, Calendar, Tag, Globe, FolderOpen } from "lucide-react"

export interface SearchFilters {
  category: string
  domain: string
  tag: string
  dateFrom: string
  dateTo: string
}

const emptyFilters: SearchFilters = {
  category: "",
  domain: "",
  tag: "",
  dateFrom: "",
  dateTo: "",
}

interface SearchFiltersBarProps {
  filters: SearchFilters
  onFiltersChange: (filters: SearchFilters) => void
  availableCategories?: string[]
  availableTags?: string[]
  className?: string
}

export function SearchFiltersBar({
  filters,
  onFiltersChange,
  availableCategories = [],
  availableTags = [],
  className,
}: SearchFiltersBarProps) {
  const activeCount = Object.values(filters).filter(Boolean).length

  const updateFilter = useCallback(
    (key: keyof SearchFilters, value: string) => {
      onFiltersChange({ ...filters, [key]: value })
    },
    [filters, onFiltersChange]
  )

  const clearAll = useCallback(() => {
    onFiltersChange(emptyFilters)
  }, [onFiltersChange])

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap gap-2">
        {/* Category filter */}
        <div className="relative">
          <FolderOpen className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            value={filters.category}
            onChange={(e) => updateFilter("category", e.target.value)}
            className="h-8 pl-7 pr-8 text-xs rounded-md border border-input bg-background appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Domain filter */}
        <div className="relative">
          <Globe className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="text"
            placeholder="Domain..."
            value={filters.domain}
            onChange={(e) => updateFilter("domain", e.target.value)}
            className="h-8 w-36 pl-7 text-xs"
          />
        </div>

        {/* Tag filter */}
        <div className="relative">
          <Tag className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <select
            value={filters.tag}
            onChange={(e) => updateFilter("tag", e.target.value)}
            className="h-8 pl-7 pr-8 text-xs rounded-md border border-input bg-background appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="">All tags</option>
            {availableTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        {/* Date From */}
        <div className="relative">
          <Calendar className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => updateFilter("dateFrom", e.target.value)}
            className="h-8 w-36 pl-7 text-xs"
            title="From date"
          />
        </div>

        {/* Date To */}
        <span className="self-center text-xs text-muted-foreground">to</span>
        <Input
          type="date"
          value={filters.dateTo}
          onChange={(e) => updateFilter("dateTo", e.target.value)}
          className="h-8 w-36 text-xs"
          title="To date"
        />

        {/* Clear all */}
        {activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearAll}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <X className="h-3 w-3 mr-1" />
            Clear filters ({activeCount})
          </Button>
        )}
      </div>
    </div>
  )
}

export { emptyFilters }
