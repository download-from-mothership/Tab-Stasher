"use client"

import * as React from "react"
import {
  LayoutGrid,
  BarChart,
  Activity,
  FolderGit2,
  Home,
  Archive,
  PlusSquare,
  Settings,
  User as UserIcon,
  CalendarDays,
  Menu,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ChevronDown,
  BookOpen,
  Video,
  PlayCircle,
  LogOut,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"

interface SidebarGroupProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

function SidebarGroup({ title, subtitle, children }: SidebarGroupProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  return (
    <div>
      <Button
        variant="ghost"
        className="w-full justify-between p-2 text-sm font-semibold"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? "rotate-0" : "-rotate-90"}`} />
      </Button>
      {isOpen && subtitle && (
        <p className="px-2 text-xs text-muted-foreground">{subtitle}</p>
      )}
      {isOpen && (
        <div className="mt-2 space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

interface NavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType
  label: string
}

function NavItem({ icon: Icon, label, className, ...props }: NavItemProps) {
  return (
    <Button
      variant="ghost"
      className={`w-full justify-start gap-2 ${className || ""}`}
      {...props}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </Button>
  );
}

export function SidebarContent() {
  const [user, setUser] = useState<User | null>(null)

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

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  return (
    <div className="flex h-full w-full flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 ring-1 ring-border">
            <AvatarImage 
              src="/logo.jpg" 
              alt="Tab Stasher Logo"
              className="object-cover"
            />
            <AvatarFallback>TS</AvatarFallback>
          </Avatar>
          <span className="text-lg font-semibold">Tab Stasher</span>
        </div>
      </div>

      {/* Navigation Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <SidebarGroup title="DASHBOARD">
          <NavItem icon={Home} label="Overview" />
          <NavItem icon={LayoutGrid} label="All Tabs" />
          <NavItem icon={BarChart} label="Analytics" />
          <NavItem icon={Activity} label="Activity" />
        </SidebarGroup>

        <SidebarGroup title="PROJECTS">
          <NavItem icon={FolderGit2} label="Active Projects" />
          <NavItem icon={Archive} label="Archived" />
          <NavItem icon={PlusSquare} label="New Project" />
        </SidebarGroup>

        <SidebarGroup 
          title="LEARNING RESOURCES" 
          subtitle="Tutorials & Videos"
        >
          <NavItem icon={BookOpen} label="Documentation" />
          <NavItem icon={Video} label="Video Tutorials" />
          <NavItem icon={PlayCircle} label="Getting Started" />
          <NavItem icon={GraduationCap} label="Best Practices" />
        </SidebarGroup>
      </div>

      {/* User Footer */}
      <div className="sticky bottom-0 z-10 border-t bg-background">
        <div className="flex items-center gap-2 p-4">
          <div className="flex flex-1 items-center gap-2">
            <UserIcon className="h-5 w-5" />
            <span className="text-sm truncate">{user?.email || "Loading..."}</span>
          </div>
          <Button variant="ghost" size="icon">
            <Settings className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
} 