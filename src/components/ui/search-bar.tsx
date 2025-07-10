"use client"

import { useState, useCallback, useEffect, useRef } from "react"
import { Search, X, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface SearchBarProps {
  onSearch: (query: string) => void
  placeholder?: string
  className?: string
  debounceMs?: number
}

export function SearchBar({ 
  onSearch, 
  placeholder = "Search tabs...", 
  className,
  debounceMs = 300 
}: SearchBarProps) {
  const [query, setQuery] = useState("")
  const [isFocused, setIsFocused] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const debounceTimeoutRef = useRef<NodeJS.Timeout>()

  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    
    setIsSearching(true)
    debounceTimeoutRef.current = setTimeout(() => {
      onSearch(searchQuery)
      setIsSearching(false)
    }, debounceMs)
  }, [onSearch, debounceMs])

  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery)
    debouncedSearch(searchQuery)
  }, [debouncedSearch])

  const handleClear = useCallback(() => {
    setQuery("")
    setIsSearching(false)
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current)
    }
    onSearch("")
  }, [onSearch])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      handleClear()
      e.currentTarget.blur()
    }
  }, [handleClear])

  // Add keyboard shortcut for search (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) {
          searchInput.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className={cn("relative w-full max-w-md", className)}>
      <div className="relative">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          className={cn(
            "pl-10 pr-10 h-9 transition-all duration-200 focus:ring-2 focus:ring-primary/20",
            query && "ring-2 ring-primary/20 bg-primary/5"
          )}
        />
        {query && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2 hover:bg-muted transition-colors"
            onClick={handleClear}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {/* Keyboard shortcut hint */}
        <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none">
          <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>
    </div>
  )
} 