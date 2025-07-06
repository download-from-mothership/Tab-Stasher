"use client"

import * as React from "react"
import * as SheetPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

interface SheetContextValue {
  componentId?: string
  sheets?: React.ReactNode[]
  addSheet?: (sheet: React.ReactNode) => void
  removeSheet?: (index: number) => void
}

const SheetContext = React.createContext<SheetContextValue>({})

interface SheetRootProps extends React.ComponentProps<typeof SheetPrimitive.Root> {
  componentId?: string
}

const Sheet = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Root>,
  SheetRootProps
>(({ componentId, ...props }, ref) => {
  const [sheets, setSheets] = React.useState<React.ReactNode[]>([])

  const addSheet = React.useCallback((sheet: React.ReactNode) => {
    setSheets((prev) => [...prev, sheet])
  }, [])

  const removeSheet = React.useCallback((index: number) => {
    setSheets((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <SheetContext.Provider value={{ componentId, sheets, addSheet, removeSheet }}>
      <SheetPrimitive.Root {...props} />
    </SheetContext.Provider>
  )
})
Sheet.displayName = "Sheet"

interface SheetTriggerProps extends React.ComponentProps<typeof SheetPrimitive.Trigger> {
  forComponent?: string
}

const SheetTrigger = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Trigger>,
  SheetTriggerProps
>(({ forComponent, ...props }, ref) => {
  const context = React.useContext(SheetContext)
  if (forComponent && forComponent !== context.componentId) {
    return null
  }
  return <SheetPrimitive.Trigger ref={ref} {...props} />
})
SheetTrigger.displayName = "SheetTrigger"

const SheetClose = SheetPrimitive.Close

const SheetPortal = SheetPrimitive.Portal

interface SheetViewProps extends React.ComponentProps<typeof SheetPrimitive.Root> {
  forComponent?: string
}

const SheetView = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Root>,
  SheetViewProps
>(({ forComponent, children, ...props }, ref) => {
  const context = React.useContext(SheetContext)
  if (forComponent && forComponent !== context.componentId) {
    return null
  }
  return <>{children}</>
})
SheetView.displayName = "SheetView"

const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Overlay
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className
    )}
    {...props}
    ref={ref}
  />
))
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:duration-300 data-[state=open]:duration-500",
  {
    variants: {
      side: {
        top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
        bottom:
          "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
        left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
        right:
          "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm",
      },
    },
    defaultVariants: {
      side: "right",
    },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof SheetPrimitive.Content>,
    VariantProps<typeof sheetVariants> {}

const SheetContent = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Content>,
  SheetContentProps
>(({ side = "right", className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <SheetPrimitive.Content
      ref={ref}
      className={cn(sheetVariants({ side }), className)}
      {...props}
    >
      {children}
      <SheetPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </SheetPrimitive.Close>
    </SheetPrimitive.Content>
  </SheetPortal>
))
SheetContent.displayName = SheetPrimitive.Content.displayName

const SheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
)
SheetHeader.displayName = "SheetHeader"

const SheetFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
)
SheetFooter.displayName = "SheetFooter"

const SheetTitle = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Title>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold text-foreground", className)}
    {...props}
  />
))
SheetTitle.displayName = SheetPrimitive.Title.displayName

const SheetDescription = React.forwardRef<
  React.ElementRef<typeof SheetPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof SheetPrimitive.Description>
>(({ className, ...props }, ref) => (
  <SheetPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
SheetDescription.displayName = SheetPrimitive.Description.displayName

const SheetBleedingBackground = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "absolute inset-0 -z-10 bg-background",
      className
    )}
    {...props}
  />
)
SheetBleedingBackground.displayName = "SheetBleedingBackground"

const SheetAutoFocusTarget = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    tabIndex={-1}
    className={cn("outline-none", className)}
    {...props}
  />
))
SheetAutoFocusTarget.displayName = "SheetAutoFocusTarget"

const SheetOutlet = () => {
  const context = React.useContext(SheetContext)
  return <>{context.sheets}</>
}
SheetOutlet.displayName = "SheetOutlet"

const SheetSpecialWrapperContext = React.createContext<{ id?: string }>({})

const SheetSpecialWrapperRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("relative", className)}
    {...props}
  />
))
SheetSpecialWrapperRoot.displayName = "SheetSpecialWrapperRoot"

const SheetSpecialWrapperContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "relative flex min-h-0 flex-1 flex-col",
      className
    )}
    {...props}
  />
))
SheetSpecialWrapperContent.displayName = "SheetSpecialWrapperContent"

const SheetSpecialWrapper = {
  Root: SheetSpecialWrapperRoot,
  Content: SheetSpecialWrapperContent,
}

export {
  Sheet,
  SheetPortal,
  SheetOverlay,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
  SheetView,
  SheetBleedingBackground,
  SheetAutoFocusTarget,
  SheetOutlet,
  SheetSpecialWrapper,
} 