"use client"

import * as React from "react"
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetOverlay,
} from "@/app/ui/sheet"
import "@/styles/silk-sidebar.css"
import {
  Menu,
  X,
  LayoutGrid,
  BarChart,
  Activity,
  FolderGit2,
  Home,
  Archive,
  PlusSquare,
  Settings,
  User,
  CalendarDays,
  BookOpen,
  Video,
  PlayCircle,
  GraduationCap,
  LogOut,
  FolderOpen,
} from "lucide-react"
import { useEffect, useState } from "react"
import { User as SupabaseUser, AuthChangeEvent, Session } from "@supabase/supabase-js"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/app/ui/button"
import { cn } from "@/lib/utils"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [isOpen, setIsOpen] = React.useState(false)
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    // Get initial session
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      console.log('Initial user:', user)
      setUser(user)
    }
    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      console.log('Auth state changed:', event, session?.user)
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  return (
    <div className="flex min-h-screen">
      {/* Mobile Menu Button */}
      <div className="block md:hidden">
        <Button
          variant="outline"
          size="icon"
          className="fixed left-4 top-4 z-50 h-10 w-10 bg-white dark:bg-gray-800 shadow-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-4 w-4 text-gray-600 dark:text-gray-300" />
        </Button>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0">
        <div className="flex h-screen w-full flex-col border-r bg-background">
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <span className="text-lg font-semibold">Navigation</span>
            </div>

            <div className="flex-1 overflow-y-auto">
              <div className="space-y-4 py-4">
                <div className="px-3">
                  <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                    DASHBOARD
                  </h2>
                  <div className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Home className="h-4 w-4" />
                      Overview
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      All Tabs
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <BarChart className="h-4 w-4" />
                      Analytics
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Activity className="h-4 w-4" />
                      Activity
                    </Button>
                  </div>
                </div>

                <div className="px-3">
                  <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                    PROJECTS
                  </h2>
                  <div className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <FolderGit2 className="h-4 w-4" />
                      Active Projects
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Archive className="h-4 w-4" />
                      Archived
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <PlusSquare className="h-4 w-4" />
                      New Project
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t bg-background">
              <div className="flex items-center gap-2 p-4">
                <div className="flex flex-1 items-center gap-2">
                  <User className="h-5 w-5" />
                  <span className="text-sm">{user?.email || "Loading..."}</span>
                </div>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetOverlay className="z-40" />
        <SheetContent side="left" className="w-[300px] p-0 bg-background">
          <div className="flex h-full w-full flex-col">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <span className="text-lg font-semibold">Navigation</span>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <X className="h-4 w-4" />
                </Button>
              </SheetTrigger>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="space-y-4 py-4">
                <div className="px-3">
                  <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                    DASHBOARD
                  </h2>
                  <div className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Home className="h-4 w-4" />
                      Overview
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <LayoutGrid className="h-4 w-4" />
                      All Tabs
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <BarChart className="h-4 w-4" />
                      Analytics
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Activity className="h-4 w-4" />
                      Activity
                    </Button>
                  </div>
                </div>

                <div className="px-3">
                  <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
                    PROJECTS
                  </h2>
                  <div className="space-y-1">
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <FolderGit2 className="h-4 w-4" />
                      Active Projects
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <Archive className="h-4 w-4" />
                      Archived
                    </Button>
                    <Button variant="ghost" className="w-full justify-start gap-2">
                      <PlusSquare className="h-4 w-4" />
                      New Project
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto border-t">
              <div className="flex items-center gap-2 p-4">
                <div className="flex flex-1 items-center gap-2">
                  <User className="h-5 w-5" />
                  <span className="text-sm">{user?.email || "Loading..."}</span>
                </div>
                <Button variant="ghost" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon">
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <main className="flex-1 overflow-y-auto p-8">{children}</main>
    </div>
  )
} 