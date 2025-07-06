"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

const IslandContext = React.createContext<{ id?: string }>({})

interface IslandRootProps extends React.HTMLAttributes<HTMLDivElement> {
  id?: string
}

const IslandRoot = React.forwardRef<HTMLDivElement, IslandRootProps>(
  ({ className, id, ...props }, ref) => (
    <IslandContext.Provider value={{ id }}>
      <div
        ref={ref}
        className={cn("relative", className)}
        {...props}
      />
    </IslandContext.Provider>
  )
)
IslandRoot.displayName = "IslandRoot"

const IslandContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-background p-4 shadow-lg",
      className
    )}
    {...props}
  />
))
IslandContent.displayName = "IslandContent"

export const Island = {
  Root: IslandRoot,
  Content: IslandContent,
} 