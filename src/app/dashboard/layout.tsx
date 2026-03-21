"use client"

export const dynamic = 'force-dynamic'
export const fetchCache = 'force-no-store'

import * as React from "react"
import { CollapsibleSidebar } from "@/components/ui/collapsible-sidebar"
import { SidebarProvider, useSidebar } from "@/components/ui/sidebar-context"
import { TabsProvider } from "@/components/ui/tabs-context"
import { ErrorBoundary } from "@/components/error-boundary"

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
    <ErrorBoundary>
      <TabsProvider>
        <SidebarProvider>
          <DashboardLayoutContent>
            {children}
          </DashboardLayoutContent>
        </SidebarProvider>
      </TabsProvider>
    </ErrorBoundary>
  )
} 