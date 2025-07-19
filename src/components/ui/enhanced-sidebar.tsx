"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import {
  LayoutGrid,
  BarChart,
  Activity,
  FolderGit2,
  Home,
  Archive,
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
  Star,
  Clock,
  Tag,
  FolderOpen,
  Trash2,
  Edit,
  Share,
  Download,
  Upload,
  RefreshCw,
  Info,
  HelpCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { supabase } from "@/lib/supabase"
import { useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"
import { CategoryDashboard } from "@/components/ui/category-dashboard"
import { TabGroups } from "@/components/ui/tab-groups"
import { useSidebar } from "@/components/ui/sidebar-context"


interface SidebarGroupProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
  defaultOpen?: boolean;
}

function SidebarGroup({ title, subtitle, children, isCollapsed, defaultOpen = true }: SidebarGroupProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  if (isCollapsed) {
    return <div className="space-y-1">{children}</div>;
  }

  return (
    <div className="space-y-2">
      <Button
        variant="ghost"
        className="w-full justify-between p-2 text-sm font-semibold hover:bg-accent/50"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="text-xs uppercase tracking-wider text-muted-foreground">{title}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
      </Button>
      {isOpen && subtitle && (
        <p className="px-2 text-xs text-muted-foreground">{subtitle}</p>
      )}
      {isOpen && (
        <div className="space-y-1">
          {children}
        </div>
      )}
    </div>
  );
}

interface NavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType;
  label: string;
  collapsed?: boolean;
  badge?: string | number;
  active?: boolean;
}

function NavItem({ icon: Icon, label, className, collapsed, badge, active, ...props }: NavItemProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center",
        active && "bg-accent text-accent-foreground",
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {!collapsed && (
        <div className="flex items-center justify-between w-full">
          <span>{label}</span>
          {badge && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
              {badge}
            </span>
          )}
        </div>
      )}
    </button>
  )
}

interface EnhancedSidebarProps {
  className?: string;
  isCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

export function EnhancedSidebar({ className, isCollapsed = false, onCollapsedChange }: EnhancedSidebarProps) {
  const [user, setUser] = useState<User | null>(null)
  const { activeSection, setActiveSection } = useSidebar()

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
    <div className={cn("flex flex-col h-full bg-background border-r", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-white z-50 relative">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 ring-1 ring-border">
              <AvatarImage 
                src="/logo.jpg" 
                alt="Tab Stasher Logo"
                className="object-cover"
              />
              <AvatarFallback>TS</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-semibold">Tab Stasher</h1>
              <p className="text-xs text-muted-foreground">Organize your tabs</p>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="flex justify-center w-full">
            <Avatar className="h-8 w-8 ring-1 ring-border">
              <AvatarImage 
                src="/logo.jpg" 
                alt="Tab Stasher Logo"
                className="object-cover"
              />
              <AvatarFallback>TS</AvatarFallback>
            </Avatar>
          </div>
        )}
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Dashboard */}
        <SidebarGroup title="Dashboard" isCollapsed={isCollapsed}>
          <NavItem 
            icon={LayoutGrid} 
            label="Overview" 
            collapsed={isCollapsed}
            active={activeSection === "overview"}
            onClick={() => setActiveSection("overview")}
          />
          <NavItem 
            icon={BarChart} 
            label="Analytics" 
            collapsed={isCollapsed}
            badge="New"
            active={activeSection === "analytics"}
            onClick={() => setActiveSection("analytics")}
          />
          <NavItem 
            icon={Activity} 
            label="Recent Activity" 
            collapsed={isCollapsed}
            active={activeSection === "activity"}
            onClick={() => setActiveSection("activity")}
          />
        </SidebarGroup>

        {/* Tab Management */}
        <SidebarGroup title="Tab Management" isCollapsed={isCollapsed}>
          <NavItem 
            icon={Home} 
            label="All Tabs" 
            collapsed={isCollapsed}
            badge="1.2k"
            active={activeSection === "all-tabs"}
            onClick={() => setActiveSection("all-tabs")}
          />
          <NavItem 
            icon={Star} 
            label="Favorites" 
            collapsed={isCollapsed}
            badge="24"
            active={activeSection === "favorites"}
            onClick={() => setActiveSection("favorites")}
          />
          <NavItem 
            icon={Clock} 
            label="Recently Added" 
            collapsed={isCollapsed}
            badge="7d"
            active={activeSection === "recent"}
            onClick={() => setActiveSection("recent")}
          />
          <NavItem 
            icon={Tag} 
            label="Untagged" 
            collapsed={isCollapsed}
            badge="156"
            active={activeSection === "untagged"}
            onClick={() => setActiveSection("untagged")}
          />
        </SidebarGroup>

        {/* Categories & Groups */}
        <SidebarGroup title="Categories & Groups" isCollapsed={isCollapsed}>
          <NavItem 
            icon={FolderOpen} 
            label="Categories" 
            collapsed={isCollapsed}
            active={activeSection === "categories"}
            onClick={() => setActiveSection("categories")}
          />
          <NavItem 
            icon={FolderGit2} 
            label="Tab Groups" 
            collapsed={isCollapsed}
            active={activeSection === "groups"}
            onClick={() => setActiveSection("groups")}
          />
          <NavItem 
            icon={Archive} 
            label="Archived" 
            collapsed={isCollapsed}
            badge="12"
            active={activeSection === "archived"}
            onClick={() => setActiveSection("archived")}
          />
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup title="Tools" isCollapsed={isCollapsed}>
          <NavItem 
            icon={Upload} 
            label="Import Tabs" 
            collapsed={isCollapsed}
            active={activeSection === "import"}
            onClick={() => setActiveSection("import")}
          />
          <NavItem 
            icon={Download} 
            label="Export Data" 
            collapsed={isCollapsed}
            active={activeSection === "export"}
            onClick={() => setActiveSection("export")}
          />
          <NavItem 
            icon={Share} 
            label="Share Collections" 
            collapsed={isCollapsed}
            active={activeSection === "share"}
            onClick={() => setActiveSection("share")}
          />
          <NavItem 
            icon={RefreshCw} 
            label="Sync Status" 
            collapsed={isCollapsed}
            active={activeSection === "sync"}
            onClick={() => setActiveSection("sync")}
          />
        </SidebarGroup>

        {/* Help & Support */}
        <SidebarGroup title="Help & Support" isCollapsed={isCollapsed}>
          <NavItem 
            icon={BookOpen} 
            label="Documentation" 
            collapsed={isCollapsed}
            active={activeSection === "docs"}
            onClick={() => setActiveSection("docs")}
          />
          <NavItem 
            icon={Video} 
            label="Video Tutorials" 
            collapsed={isCollapsed}
            active={activeSection === "tutorials"}
            onClick={() => setActiveSection("tutorials")}
          />
          <NavItem 
            icon={HelpCircle} 
            label="Help Center" 
            collapsed={isCollapsed}
            active={activeSection === "help"}
            onClick={() => setActiveSection("help")}
          />
          <NavItem 
            icon={Info} 
            label="About" 
            collapsed={isCollapsed}
            active={activeSection === "about"}
            onClick={() => setActiveSection("about")}
          />
        </SidebarGroup>
      </div>

      {/* User Footer */}
      <div className="border-t p-4">
        {isCollapsed ? (
          <div className="flex flex-col items-center space-y-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleLogout}
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.user_metadata?.avatar_url} />
                <AvatarFallback>
                  {user?.email?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {user?.email || 'Loading...'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {user?.id ? 'Signed in' : 'Not signed in'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => setActiveSection("settings")}
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign out
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 