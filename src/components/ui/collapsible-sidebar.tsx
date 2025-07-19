"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Menu } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EnhancedSidebar } from "@/components/ui/enhanced-sidebar"
import { SilkSidebar } from "@/components/ui/silk-sidebar"
import { Sheet } from "@silk-hq/components"

interface CollapsibleSidebarProps {
  className?: string;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function CollapsibleSidebar({ 
  className, 
  isOpen = false,
  onOpenChange 
}: CollapsibleSidebarProps) {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Mobile version using SilkSidebar
  if (isMobile) {
    return (
      <SilkSidebar
        presentTrigger={
          <Sheet.Trigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </Sheet.Trigger>
        }
        sheetContent={
          <EnhancedSidebar 
            isCollapsed={false}
            onCollapsedChange={() => {}}
          />
        }
        presented={isOpen}
        onPresentedChange={onOpenChange}
      />
    )
  }

  // Desktop version - completely hidden when closed
  if (!isOpen) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/20 z-30"
        onClick={() => onOpenChange?.(false)}
      />
      
      {/* Sidebar */}
      <div className={cn("fixed left-0 top-0 z-40 h-full w-72 bg-white shadow-lg border-r", className)}>
        <EnhancedSidebar 
          isCollapsed={false}
          onCollapsedChange={() => {}}
        />
      </div>
    </>
  )
} 