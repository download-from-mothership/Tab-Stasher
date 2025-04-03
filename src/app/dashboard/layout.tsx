"use client"

import * as React from "react"
import { Sidebar } from "@/app/ui/sidebar"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = React.useState(false)

  return (
    <div className="relative min-h-screen">
      <Sidebar 
        collapsible="icon" 
        isCollapsed={isCollapsed}
        onCollapsedChange={setIsCollapsed}
      />
      <main 
        className="min-h-screen transition-all duration-200"
        style={{
          paddingLeft: isCollapsed ? "4rem" : "16rem", // 4rem = 64px (w-16), 16rem = 256px (w-64)
        }}
      >
        {children}
      </main>
    </div>
  )
} 