"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CategoryManager } from "@/lib/category-manager"
import { Category } from "@/lib/supabase"
import { AlertTriangle, TrendingUp, FolderOpen, Split } from "lucide-react"

interface CategoryStats {
  totalCategories: number
  categoriesNeedingSplit: Category[]
  largestCategories: Category[]
}

export function CategoryDashboard() {
  const [stats, setStats] = useState<CategoryStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadCategoryStats()
  }, [])

  const loadCategoryStats = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const categoryManager = new CategoryManager()
      const categoryStats = await categoryManager.getCategoryStats()
      setStats(categoryStats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load category stats')
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSplit = async (category: Category) => {
    try {
      const categoryManager = new CategoryManager()
      const result = await categoryManager.checkAndSplitCategory(category, '')
      
      if (result) {
        console.log('Category split successfully:', result)
        // Refresh stats
        await loadCategoryStats()
      }
    } catch (err) {
      console.error('Failed to split category:', err)
      setError(err instanceof Error ? err.message : 'Failed to split category')
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <p>{error}</p>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={loadCategoryStats}
              className="mt-2"
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!stats) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Categories</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              Primary and secondary categories
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Needs Splitting</CardTitle>
            <Split className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.categoriesNeedingSplit.length}</div>
            <p className="text-xs text-muted-foreground">
              Categories with 50+ tabs
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Largest Category</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.largestCategories[0]?.tab_count || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.largestCategories[0]?.name || 'No categories'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Needing Split */}
      {stats.categoriesNeedingSplit.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Categories Needing Split
            </CardTitle>
            <CardDescription>
              These categories have grown large and should be split into subcategories
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.categoriesNeedingSplit.map((category) => (
                <div
                  key={category.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div>
                      <h4 className="font-medium">{category.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Level {category.level} • {category.tab_count} tabs
                      </p>
                    </div>
                    <Badge variant="secondary">
                      {category.tab_count}/{category.max_tabs_before_split}
                    </Badge>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleManualSplit(category)}
                  >
                    <Split className="h-4 w-4 mr-2" />
                    Split
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Largest Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Largest Categories</CardTitle>
          <CardDescription>
            Top 10 categories by number of tabs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats.largestCategories.map((category, index) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <h4 className="font-medium">{category.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      Level {category.level} • Created {new Date(category.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Badge variant="outline">
                  {category.tab_count} tabs
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 