"use client"

import * as React from "react"
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar-context"

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode
}) {
  const { isOpen, setIsOpen } = useSidebar()

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <CollapsibleSidebar 
        isOpen={isOpen}
        onOpenChange={setIsOpen}
      />

      {/* Main Content */}
      <main className="flex-1 flex flex-col w-full">
        {children}
      </main>
    </div>
  )
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider>
      <DashboardLayoutContent>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  )
} 