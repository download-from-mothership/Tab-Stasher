"use client"

import * as React from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import {
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
import { Button } from "@/app/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/app/ui/avatar"

type CollapsibleMode = "offcanvas" | "icon" | "none"

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  defaultOpen?: boolean
  collapsible?: CollapsibleMode
  isCollapsed?: boolean
  onCollapsedChange?: (collapsed: boolean) => void
}

interface SidebarGroupProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  isCollapsed?: boolean;
}

function SidebarGroup({ title, subtitle, children, isCollapsed }: SidebarGroupProps) {
  const [isOpen, setIsOpen] = React.useState(true);

  if (isCollapsed) {
    return <div className="space-y-1">{children}</div>;
  }

  return (
    <div>
      <Button
        variant="ghost"
        className="w-full justify-between p-2 text-sm font-semibold"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>{title}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen ? "rotate-0" : "-rotate-90")} />
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

export function Sidebar({ 
  className, 
  defaultOpen = true, 
  collapsible = "none",
  isCollapsed: controlledCollapsed,
  onCollapsedChange,
  ...props 
}: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen)
  const [uncontrolledCollapsed, setUncontrolledCollapsed] = React.useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = React.useState(false)
  
  const isCollapsed = controlledCollapsed ?? uncontrolledCollapsed
  const setIsCollapsed = React.useCallback((value: boolean) => {
    setUncontrolledCollapsed(value)
    onCollapsedChange?.(value)
  }, [onCollapsedChange])

  const showCollapseButton = collapsible === "icon"
  const showOffcanvasButton = collapsible === "offcanvas"
  
  const sidebarWidth = isCollapsed ? "w-16" : "w-64"
  const sidebarTransform = !isOpen ? "-translate-x-full" : "translate-x-0"

  return (
    <nav
      className={cn(
        "fixed left-0 top-0 z-40 h-full transform border-r bg-background transition-all duration-200 ease-in-out flex flex-col",
        sidebarWidth,
        showOffcanvasButton ? "md:translate-x-0" : "",
        showOffcanvasButton ? sidebarTransform : "",
        className
      )}
      {...props}
    >
      {/* Mobile Menu Button */}
      {showOffcanvasButton && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-12 top-4 md:hidden"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}

      {/* Collapse Button */}
      {showCollapseButton && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute -right-4 top-4 hidden md:flex"
          onClick={() => setIsCollapsed(!isCollapsed)}
        >
          {isCollapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      )}

      {/* Header Space */}
      <div className="h-[73px] shrink-0" />

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto p-2 space-y-6">
        {!isCollapsed && (
          <div className="flex justify-center px-2">
            <Avatar className="h-10 w-10 ring-1 ring-border">
              <AvatarImage 
                src="/logo.jpg" 
                alt="Tab Stasher Logo"
                className="object-cover"
              />
              <AvatarFallback>TS</AvatarFallback>
            </Avatar>
          </div>
        )}

        <SidebarGroup title="DASHBOARD" isCollapsed={isCollapsed}>
          <NavItem icon={LayoutGrid} label="Overview" collapsed={isCollapsed} />
          <NavItem icon={BarChart} label="Analytics" collapsed={isCollapsed} />
          <NavItem icon={Activity} label="Recent Activity" collapsed={isCollapsed} />
        </SidebarGroup>

        <SidebarGroup title="PROJECTS" isCollapsed={isCollapsed}>
          <NavItem icon={FolderGit2} label="All Projects" collapsed={isCollapsed} />
          <NavItem icon={Home} label="My Projects" collapsed={isCollapsed} />
          <NavItem icon={Archive} label="Archived Projects" collapsed={isCollapsed} />
          <NavItem icon={PlusSquare} label="Create New Project" collapsed={isCollapsed} />
        </SidebarGroup>

        <SidebarGroup 
          title="LEARNING RESOURCES" 
          subtitle="Tutorials & Videos"
          isCollapsed={isCollapsed}
        >
          <NavItem icon={BookOpen} label="Documentation" collapsed={isCollapsed} />
          <NavItem icon={Video} label="Video Tutorials" collapsed={isCollapsed} />
          <NavItem icon={PlayCircle} label="Getting Started" collapsed={isCollapsed} />
          <NavItem icon={GraduationCap} label="Best Practices" collapsed={isCollapsed} />
        </SidebarGroup>
      </div>

      {/* User Footer */}
      <div className="border-t p-2">
        {isCollapsed ? (
          <Button
            variant="ghost"
            className="w-full p-2 justify-center"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <User className="h-4 w-4" />
          </Button>
        ) : (
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-between p-2"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            >
              <span className="font-semibold">john.doe@example.com</span>
              <ChevronDown 
                className={cn(
                  "h-4 w-4 transition-transform",
                  isUserMenuOpen ? "rotate-0" : "-rotate-90"
                )} 
              />
            </Button>
            {isUserMenuOpen && (
              <div className="pt-1 space-y-1">
                <NavItem icon={User} label="Account" collapsed={isCollapsed} />
                <NavItem icon={CalendarDays} label="Billing" collapsed={isCollapsed} />
                <NavItem icon={LogOut} label="Sign out" collapsed={isCollapsed} />
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}

interface NavItemProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ElementType
  label: string
  collapsed?: boolean
}

function NavItem({ icon: Icon, label, className, collapsed, ...props }: NavItemProps) {
  return (
    <button
      className={cn(
        "flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
        collapsed && "justify-center",
        className
      )}
      {...props}
    >
      <Icon className="h-4 w-4" />
      {!collapsed && label}
    </button>
  )
}
