"use client"

export const dynamic = 'force-dynamic'

import { GalleryVerticalEnd, Menu, Settings, LogOut, User } from "lucide-react"
import { TabGroups } from "@/components/ui/tab-groups"
import { AddTabDialog } from "@/components/ui/add-tab-dialog"
import { Button } from "@/components/ui/button"
import { AuthButton } from "@/components/ui/auth-button"
import { TabList } from "@/components/ui/tab-list"
import { CategoryDashboard } from "@/components/ui/category-dashboard"
import { useState, useEffect } from "react"
import { SilkSidebar } from "@/components/ui/silk-sidebar"
import { Sheet } from "@silk-hq/components"
import { supabase } from "@/lib/supabase"
import { User as SupabaseUser } from "@supabase/supabase-js"

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [user, setUser] = useState<SupabaseUser | null>(null)

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

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center p-4">
          <SilkSidebar
            presentTrigger={
              <Sheet.Trigger asChild>
                <button
                  className="flex items-center gap-2 font-medium focus:outline-none"
                  aria-label="Open Sidebar"
                  type="button"
                >
                  <Menu className="h-5 w-5" />
                  <span className="font-semibold">Tab Stasher</span>
                </button>
              </Sheet.Trigger>
            }
            sheetContent={
              <div className="p-4 space-y-8">
                <section>
                  <h2 className="text-2xl font-bold tracking-tight mb-1">Category Management</h2>
                  <p className="text-muted-foreground mb-4">Monitor and manage your tab categories</p>
                  <CategoryDashboard />
                </section>
                <section>
                  <h2 className="text-2xl font-bold tracking-tight mb-1">Your Tab Groups</h2>
                  <p className="text-muted-foreground mb-4">Organize your tabs into collections</p>
                  <TabGroups />
                </section>
              </div>
            }
            footer={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium truncate">
                      {user?.email || 'Loading...'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {user?.id ? 'Signed in' : 'Not signed in'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="User settings"
                  >
                    <Settings className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleLogout}
                    aria-label="Sign out"
                  >
                    <LogOut className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            }
            presented={sidebarOpen}
            onPresentedChange={setSidebarOpen}
          />
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              {/* Add search functionality later */}
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
            <div className="flex items-center justify-between">
              <div>
                {/* Removed 'Your Tabs' heading and description */}
              </div>
            </div>
            
            {/* Tabs Grid */}
            <TabList refreshKey={refreshKey} />
          </div>
        </div>
      </main>
    </div>
  )
} 