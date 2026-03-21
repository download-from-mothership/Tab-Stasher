"use client"

// Force dynamic rendering to prevent static generation issues
export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import { GalleryVerticalEnd, Settings, LogOut, User, Menu } from "lucide-react"
import { TabGroups } from "@/components/ui/tab-groups"
import { AddTabDialog } from "@/components/ui/add-tab-dialog"
import { Button } from "@/components/ui/button"
import { AuthButton } from "@/components/ui/auth-button"
import { TabList } from "@/components/ui/tab-list"
import { RecentTabList } from "@/components/ui/recent-tab-list"
import { CategoryTabList } from "@/components/ui/category-tab-list"
import { CategoryDashboard } from "@/components/ui/category-dashboard"
import { ReadingList } from "@/components/ui/reading-list"
import { AIInsights } from "@/components/ui/ai-insights"
import { AnalyticsDashboard } from "@/components/ui/analytics-dashboard"
import { ExportData } from "@/components/ui/export-data"
import { SharedCollections } from "@/components/ui/share-collection"
import { ActivityFeed } from "@/components/ui/activity-feed"
import { ApiSettings } from "@/components/ui/api-settings"
import { SyncStatus } from "@/components/ui/sync-status"
import { KnowledgeGraph } from "@/components/ui/knowledge-graph"
import { SearchBar } from "@/components/ui/search-bar"
import { SearchFiltersBar, emptyFilters } from "@/components/ui/search-filters"
import type { SearchFilters } from "@/components/ui/search-filters"
import { SearchResults } from "@/components/ui/search-results"
import { useState, useEffect, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { User as SupabaseUser } from "@supabase/supabase-js"
import { useSidebar } from "@/components/ui/sidebar-context"
import { useTabs } from "@/components/ui/tabs-context"

export default function DashboardPage() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResultsCount, setSearchResultsCount] = useState<number | null>(null)
  const [isClient, setIsClient] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const { isOpen, setIsOpen, activeSection } = useSidebar()
  const { tabs: contextTabs, refreshTabs, refreshRecentTabs } = useTabs()

  // Search filters state
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [filters, setFilters] = useState<SearchFilters>(emptyFilters)
  const [availableCategories, setAvailableCategories] = useState<string[]>([])
  const [availableTags, setAvailableTags] = useState<string[]>([])

  const activeFilterCount = Object.values(filters).filter(Boolean).length
  const isSearchActive = searchQuery.trim() !== "" || activeFilterCount > 0

  useEffect(() => {
    setIsClient(true)

    // Only run Supabase operations on the client side
    if (typeof window !== 'undefined' && supabase) {
      try {
        // Get initial user securely
        supabase.auth.getUser().then(({ data: { user } }: { data: { user: SupabaseUser | null } }) => {
          setUser(user)
        })

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event: string, session: any) => {
          if (event === 'SIGNED_IN' && session) {
            // Verify the user securely
            const { data: { user } } = await supabase.auth.getUser()
            setUser(user)
          } else if (event === 'SIGNED_OUT') {
            setUser(null)
          }
        })

        return () => subscription.unsubscribe()
      } catch (error) {
        console.warn('Supabase client not available:', error)
      }
    }
  }, [])

  // Populate filter options from loaded tabs context
  useEffect(() => {
    if (contextTabs.length === 0) return
    const cats = [...new Set(contextTabs.map((t) => t.primary_category).filter(Boolean) as string[])].sort()
    const tags = [...new Set(contextTabs.flatMap((t) => t.tags || []))].sort()
    setAvailableCategories(cats)
    setAvailableTags(tags)
  }, [contextTabs])

  // Listen for tab saves from extension or other sources
  useEffect(() => {
    if (!isClient) return

    // Method 1: BroadcastChannel for cross-tab communication
    let broadcastChannel: BroadcastChannel | null = null
    try {
      broadcastChannel = new BroadcastChannel('tab-stasher-refresh')
      broadcastChannel.onmessage = (event) => {
        if (event.data === 'tab-saved') {
          console.log('Received tab-saved event via BroadcastChannel')
          handleTabSaved()
        }
      }
    } catch (error) {
      console.warn('BroadcastChannel not available:', error)
    }

    // Method 2: Storage event listener for localStorage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'tab-stasher-last-saved' && e.newValue) {
        console.log('Detected tab save via storage event')
        handleTabSaved()
      }
    }
    window.addEventListener('storage', handleStorageChange)

    // Method 3: Polling fallback - check for new tabs every 30 seconds (reduced frequency)
    let lastCheckTime = Date.now()
    const pollInterval = setInterval(async () => {
      try {
        const lastSaved = localStorage.getItem('tab-stasher-last-saved')
        if (lastSaved) {
          const savedTime = parseInt(lastSaved, 10)
          if (savedTime > lastCheckTime) {
            console.log('Detected tab save via polling')
            lastCheckTime = savedTime
            handleTabSaved()
          }
        }
      } catch (error) {
        // Ignore errors in polling
      }
    }, 30000)

    // Cleanup
    return () => {
      if (broadcastChannel) {
        broadcastChannel.close()
      }
      window.removeEventListener('storage', handleStorageChange)
      clearInterval(pollInterval)
    }
  }, [isClient, handleTabSaved])

  const handleTabSaved = useCallback(async () => {
    // Refresh both tabs and recent tabs when a new tab is saved
    await Promise.all([refreshTabs(), refreshRecentTabs()])
    // Trigger refresh for CategoryTabList
    setRefreshTrigger(prev => prev + 1)
  }, [refreshTabs, refreshRecentTabs])

  const handleLogout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut()
      } catch (error) {
        console.warn('Error signing out:', error)
      }
    }
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    setSearchResultsCount(null)
  }

  const handleResultsCountChange = useCallback((count: number) => {
    setSearchResultsCount(count)
  }, [])

  const handleSearchMetadata = useCallback(
    (meta: { categories: string[]; tags: string[] }) => {
      setAvailableCategories(meta.categories)
      setAvailableTags(meta.tags)
    },
    []
  )

  const handleClearSearch = useCallback(() => {
    setSearchQuery("")
    setFilters(emptyFilters)
    setSearchResultsCount(null)
  }, [])

  // Don't render anything until we're on the client side
  if (!isClient) {
    return (
      <div className="flex flex-col h-full">
        <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-[color:var(--header)] bg-white/100 shadow-md backdrop-blur-none">
          <div className="container flex items-center p-4">
            <div className="flex items-center gap-2">
              <span className="font-semibold">Tab Stasher</span>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto">
          <div className="container py-6 md:py-8">
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading...</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-neutral-200 bg-[color:var(--header)] bg-white/100 shadow-md backdrop-blur-none">
        <div className="container flex items-center p-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(!isOpen)}
              aria-label="Toggle sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <span className="font-semibold">Tab Stasher</span>
          </div>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              <SearchBar
                onSearch={handleSearch}
                className="max-w-lg"
                showFiltersToggle
                filtersOpen={filtersOpen}
                onToggleFilters={() => setFiltersOpen((v) => !v)}
                activeFilterCount={activeFilterCount}
              />
            </div>
            <nav className="flex items-center space-x-4">
              <AddTabDialog onTabSaved={handleTabSaved} />
              <AuthButton />
            </nav>
          </div>
        </div>
        {/* Filters bar — slides in below header */}
        {filtersOpen && (
          <div className="container px-4 pb-3">
            <SearchFiltersBar
              filters={filters}
              onFiltersChange={setFilters}
              availableCategories={availableCategories}
              availableTags={availableTags}
            />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container py-6 md:py-8">
          <div className="flex flex-col gap-8">
            {/* Search Results Info */}
            {isSearchActive && searchResultsCount !== null && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {searchResultsCount === 0
                    ? `No results found${searchQuery ? ` for "${searchQuery}"` : ""}`
                    : `${searchResultsCount} result${searchResultsCount === 1 ? '' : 's'} found${searchQuery ? ` for "${searchQuery}"` : ""}`
                  }
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearSearch}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear search
                </Button>
              </div>
            )}

            {/* When search/filters are active, show server-side search results */}
            {isSearchActive ? (
              <SearchResults
                query={searchQuery}
                filters={filters}
                onResultsCountChange={handleResultsCountChange}
                onMetadata={handleSearchMetadata}
              />
            ) : (
              <>
                {/* Conditional Content Based on Active Section */}
                {activeSection === "overview" && (
                  <CategoryTabList
                    searchQuery={searchQuery}
                    onResultsCountChange={handleResultsCountChange}
                    refreshTrigger={refreshTrigger}
                  />
                )}

                {activeSection === "all-tabs" && (
                  <TabList
                    searchQuery={searchQuery}
                    onResultsCountChange={handleResultsCountChange}
                  />
                )}

                {activeSection === "recent" && (
                  <RecentTabList
                    searchQuery={searchQuery}
                    onResultsCountChange={handleResultsCountChange}
                  />
                )}

                {activeSection === "categories" && (
                  <CategoryDashboard />
                )}

                {activeSection === "groups" && (
                  <TabGroups />
                )}

                {activeSection === "reading-list" && (
                  <ReadingList />
                )}

                {activeSection === "analytics" && (
                  <AnalyticsDashboard />
                )}

                {activeSection === "export" && (
                  <ExportData />
                )}

                {activeSection === "ai-insights" && (
                  <AIInsights />
                )}

                {activeSection === "knowledge-graph" && (
                  <KnowledgeGraph />
                )}

                {activeSection === "share" && (
                  <SharedCollections />
                )}

                {activeSection === "activity" && (
                  <ActivityFeed />
                )}

                {activeSection === "api-settings" && (
                  <ApiSettings />
                )}

                {activeSection === "sync" && (
                  <div style={{ maxWidth: '600px' }}>
                    <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Cross-Device Sync</h2>
                    <SyncStatus />
                    <div style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                      <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>Sync Across Devices</h3>
                      <p style={{ fontSize: '13px', color: '#64748b', lineHeight: 1.6 }}>
                        Your tabs sync automatically across all devices where you are logged in.
                        Use the Chrome or Firefox extension on desktop, or install Tab Stasher as a
                        PWA on your phone for mobile access.
                      </p>
                      <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <span style={{ color: '#22c55e' }}>&#9679;</span> Chrome Extension — Available
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <span style={{ color: '#22c55e' }}>&#9679;</span> Firefox Extension — Available
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
                          <span style={{ color: '#22c55e' }}>&#9679;</span> Mobile PWA — Install from browser menu
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Default to overview if no section is active */}
                {!["overview", "all-tabs", "recent", "categories", "groups", "reading-list", "analytics", "export", "ai-insights", "knowledge-graph", "share", "activity", "api-settings", "sync"].includes(activeSection) && (
                  <CategoryTabList
                    searchQuery={searchQuery}
                    onResultsCountChange={handleResultsCountChange}
                    refreshTrigger={refreshTrigger}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
