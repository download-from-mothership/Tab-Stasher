"use client"

export const dynamic = 'force-dynamic'

import { GalleryVerticalEnd, Menu } from "lucide-react"
import { TabGroups } from "@/components/ui/tab-groups"
import { AddTabDialog } from "@/components/ui/add-tab-dialog"
import { Button } from "@/components/ui/button"
import { AuthButton } from "@/components/ui/auth-button"
import { TabList } from "@/components/ui/tab-list"
import { CategoryDashboard } from "@/components/ui/category-dashboard"
import { useState } from "react"
import { SilkSidebar } from "@/components/ui/silk-sidebar"

export default function DashboardPage() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleTabSaved = () => {
    setRefreshKey(prev => prev + 1)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center p-4">
          <SilkSidebar
            presentTrigger={
              <button
                className="flex items-center gap-2 font-medium focus:outline-none"
                onClick={() => setSidebarOpen(true)}
                aria-label="Open Sidebar"
                type="button"
              >
                <Menu className="h-5 w-5" />
                <span className="font-semibold">Tab Stasher</span>
              </button>
            }
            sheetContent={
              <div className="space-y-8">
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