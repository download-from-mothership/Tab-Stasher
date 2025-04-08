"use client"

import { GalleryVerticalEnd } from "lucide-react"
import { TabGroups } from "@/app/ui/tab-groups"
import { AddTabDialog } from "@/app/ui/add-tab-dialog"
import { Button } from "@/app/ui/button"
import { AuthButton } from "@/app/ui/auth-button"
import { TabList } from "@/app/ui/tab-list"

export default function DashboardPage() {
  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center p-4">
          <a href="/" className="flex items-center gap-3 font-medium">
            <span className="font-semibold">Tab Stasher</span>
          </a>
          <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
            <div className="w-full flex-1 md:w-auto md:flex-none">
              {/* Add search functionality later */}
            </div>
            <nav className="flex items-center space-x-4">
              <AddTabDialog />
              <AuthButton />
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-6 md:py-8">
        <div className="flex flex-col gap-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Your Tabs</h1>
              <p className="text-muted-foreground">
                View and manage your saved tabs
              </p>
            </div>
          </div>
          
          {/* Tabs Grid */}
          <TabList />

          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Your Tab Groups</h2>
              <p className="text-muted-foreground">
                Organize your tabs into collections
              </p>
            </div>
          </div>
          
          {/* Tab Groups Grid */}
          <TabGroups />
        </div>
      </main>
    </div>
  )
} 