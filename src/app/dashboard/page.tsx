"use client"

export const dynamic = 'force-dynamic'

import { GalleryVerticalEnd, Settings, LogOut, User, Menu } from "lucide-react"
import { TabGroups } from "@/components/ui/tab-groups"
import { AddTabDialog } from "@/components/ui/add-tab-dialog"
import { Button } from "@/components/ui/button"
import { AuthButton } from "@/components/ui/auth-button"
import { TabList } from "@/components/ui/tab-list"
import { RecentTabList } from "@/components/ui/recent-tab-list"
import { CategoryTabList } from "@/components/ui/category-tab-list"
import { CategoryDashboard } from "@/components/ui/category-dashboard"
import { SearchBar } from "@/components/ui/search-bar"
import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { User as SupabaseUser } from "@supabase/supabase-js"
import { useSidebar } from "@/components/ui/sidebar-context"

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResultsCount, setSearchResultsCount] = useState<number | null>(null)
  const { isOpen, setIsOpen, activeSection } = useSidebar()

  useEffect(() => {
    // Get initial user securely
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Verify the user securely
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
      } else if (event === 'SIGNED_OUT') {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleTabSaved = () => {
    setRefreshKey(prev => prev + 1)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    // Reset search results count when query changes
    setSearchResultsCount(null)
  }

  const handleResultsCountChange = (count: number) => {
    setSearchResultsCount(count)
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
              <SearchBar onSearch={handleSearch} className="max-w-lg" />
            </div>
            <nav className="flex items-center space-x-4">
              <AddTabDialog onTabSaved={handleTabSaved} />
              <AuthButton />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container py-6 md:py-8">
          <div className="flex flex-col gap-8">
            {/* Search Results Info */}
            {searchQuery && searchResultsCount !== null && (
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {searchResultsCount === 0 
                    ? `No results found for "${searchQuery}"`
                    : `${searchResultsCount} result${searchResultsCount === 1 ? '' : 's'} found for "${searchQuery}"`
                  }
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSearchQuery("")}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Clear search
                </Button>
              </div>
            )}

            {/* Conditional Content Based on Active Section */}
            {activeSection === "overview" && (
              <CategoryTabList 
                refreshKey={refreshKey} 
                searchQuery={searchQuery} 
                onResultsCountChange={handleResultsCountChange}
              />
            )}

            {activeSection === "all-tabs" && (
              <TabList 
                refreshKey={refreshKey} 
                searchQuery={searchQuery} 
                onResultsCountChange={handleResultsCountChange}
              />
            )}

            {activeSection === "recent" && (
              <RecentTabList 
                refreshKey={refreshKey} 
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

            {/* Default to overview if no section is active */}
            {!["overview", "all-tabs", "recent", "categories", "groups"].includes(activeSection) && (
              <CategoryTabList 
                refreshKey={refreshKey} 
                searchQuery={searchQuery} 
                onResultsCountChange={handleResultsCountChange}
              />
            )}
          </div>
        </div>
      </main>
    </div>
  )
} 