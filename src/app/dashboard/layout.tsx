"use client"

import * as React from "react"
import { Menu } from "lucide-react"
import { Button } from "@/app/ui/button"
import { SilkSidebar } from "@/app/ui/silk-sidebar"
import { SidebarContent } from "@/app/ui/sidebar-content"
import "@/styles/silk-sidebar.css"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Silk Sidebar */}
      <SilkSidebar
        presentTrigger={
          <div className="block md:hidden">
            <Button
              variant="outline"
              size="icon"
              className="fixed left-4 top-4 z-50 h-10 w-10 bg-white dark:bg-gray-800 shadow-lg rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Menu className="h-4 w-4 text-gray-600 dark:text-gray-300" />
            </Button>
          </div>
        }
        sheetContent={<SidebarContent />}
      />

      {/* Desktop Sidebar */}
      <div className="hidden md:block md:w-64 md:flex-shrink-0">
        <SidebarContent />
      </div>

      <main className="flex-1 flex flex-col">{children}</main>
    </div>
  )
} 