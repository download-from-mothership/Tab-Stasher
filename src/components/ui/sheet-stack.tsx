import * as React from "react"

interface SheetStackContextValue {
  sheets: React.ReactNode[]
  addSheet: (sheet: React.ReactNode) => void
  removeSheet: (index: number) => void
}

const SheetStackContext = React.createContext<SheetStackContextValue | undefined>(
  undefined
)

function SheetStackProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [sheets, setSheets] = React.useState<React.ReactNode[]>([])

  const addSheet = React.useCallback((sheet: React.ReactNode) => {
    setSheets((prev) => [...prev, sheet])
  }, [])

  const removeSheet = React.useCallback((index: number) => {
    setSheets((prev) => prev.filter((_, i) => i !== index))
  }, [])

  return (
    <SheetStackContext.Provider value={{ sheets, addSheet, removeSheet }}>
      {children}
    </SheetStackContext.Provider>
  )
}

function useSheetStack() {
  const context = React.useContext(SheetStackContext)
  if (!context) {
    throw new Error("useSheetStack must be used within a SheetStackProvider")
  }
  return context
}

function SheetStackRoot({ children }: { children: React.ReactNode }) {
  return <SheetStackProvider>{children}</SheetStackProvider>
}

function SheetStackOutlet() {
  const { sheets } = useSheetStack()
  return <>{sheets}</>
}

export const SheetStack = {
  Root: SheetStackRoot,
  Outlet: SheetStackOutlet,
  useSheetStack,
} 