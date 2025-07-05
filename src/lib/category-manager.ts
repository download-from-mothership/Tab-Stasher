import { supabase, Category, Tab } from './supabase'

export interface CategoryResult {
  primaryCategory: string
  secondaryCategory: string
  confidence: number
  tags: string[]
}

export interface CategorySplitResult {
  originalCategory: Category
  newCategories: Category[]
  movedTabs: Tab[]
}

export class CategoryManager {
  private readonly DEFAULT_MAX_TABS = 50
  private readonly SPLIT_CONFIDENCE_THRESHOLD = 0.7

  /**
   * Categorize a tab and check if category needs splitting
   * Optimized version that defers expensive operations
   */
  async categorizeTab(tab: Tab, content: string): Promise<CategoryResult> {
    // 1. Get AI categorization
    const aiResult = await this.getAICategorization(content, tab.url)
    
    // 2. Get or create the primary category (defer expensive operations)
    await this.getOrCreateCategoryAsync(aiResult.primaryCategory)
    
    // 3. Defer category splitting to background job
    this.scheduleCategorySplitCheck(aiResult.primaryCategory)
    
    return aiResult
  }

  /**
   * Get or create a category asynchronously (non-blocking)
   */
  async getOrCreateCategoryAsync(name: string, parentId?: string): Promise<void> {
    try {
      // Try to find existing category
      const { data: existingCategory, error: findError } = await supabase
        .from('categories')
        .select('id')
        .eq('name', name)
        .eq('parent_id', parentId || null)
        .single()

      if (findError && findError.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error finding category:', findError)
        return
      }

      if (existingCategory) {
        return
      }

      // Create new category
      const { error: createError } = await supabase
        .from('categories')
        .insert([{
          name,
          parent_id: parentId || null,
          level: parentId ? 2 : 1,
          tab_count: 0,
          max_tabs_before_split: this.DEFAULT_MAX_TABS,
          user_id: (await supabase.auth.getUser()).data.user?.id
        }])

      if (createError) {
        console.error('Error creating category:', createError)
      }
    } catch (error) {
      console.error('Error in getOrCreateCategoryAsync:', error)
    }
  }

  /**
   * Schedule category split check for background processing
   */
  private scheduleCategorySplitCheck(categoryName: string): void {
    // Use setTimeout to defer the operation
    setTimeout(async () => {
      try {
        await this.checkAndSplitCategoryAsync(categoryName)
      } catch (error) {
        console.error('Error in scheduled category split check:', error)
      }
    }, 1000) // Delay by 1 second
  }

  /**
   * Check if a category needs splitting (optimized version)
   */
  async checkAndSplitCategoryAsync(categoryName: string): Promise<void> {
    try {
      // Get category info
      const { data: category, error: categoryError } = await supabase
        .from('categories')
        .select('*')
        .eq('name', categoryName)
        .single()

      if (categoryError || !category) {
        return
      }

      // Only proceed if category has enough tabs
      if (category.tab_count < category.max_tabs_before_split) {
        return
      }

      // Get tab count for this category
      const { count, error: countError } = await supabase
        .from('tabs')
        .select('*', { count: 'exact', head: true })
        .eq('primary_category', categoryName)

      if (countError || !count || count < category.max_tabs_before_split) {
        return
      }

      // Update category tab count
      await supabase
        .from('categories')
        .update({ tab_count: count })
        .eq('id', category.id)

      // Only perform split if we have enough tabs
      if (count >= category.max_tabs_before_split) {
        await this.performCategorySplit(category)
      }
    } catch (error) {
      console.error('Error in checkAndSplitCategoryAsync:', error)
    }
  }

  /**
   * Perform category splitting (optimized)
   */
  private async performCategorySplit(category: Category): Promise<void> {
    try {
      // Get secondary category distribution
      const { data: secondaryCounts, error: countError } = await supabase
        .from('tabs')
        .select('secondary_category')
        .eq('primary_category', category.name)
        .not('secondary_category', 'is', null)

      if (countError || !secondaryCounts) {
        return
      }

      // Analyze secondary categories
      const categoryCounts: Record<string, number> = {}
      for (const tab of secondaryCounts) {
        if (tab.secondary_category) {
          categoryCounts[tab.secondary_category] = (categoryCounts[tab.secondary_category] || 0) + 1
        }
      }

      // Find categories with enough tabs to split
      const splitCandidates = Object.entries(categoryCounts)
        .filter(([, count]) => count >= 5)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)

      if (splitCandidates.length < 2) {
        return // Not enough variety to split
      }

      // Create new subcategories and move tabs in batch
      for (const [subcategoryName, count] of splitCandidates) {
        await this.createSubcategoryAndMoveTabs(category, subcategoryName)
      }

      // Update the original category's max_tabs_before_split
      await supabase
        .from('categories')
        .update({ max_tabs_before_split: category.max_tabs_before_split * 2 })
        .eq('id', category.id)

    } catch (error) {
      console.error('Error in performCategorySplit:', error)
    }
  }

  /**
   * Create subcategory and move tabs in batch
   */
  private async createSubcategoryAndMoveTabs(parentCategory: Category, subcategoryName: string): Promise<void> {
    try {
      // Create subcategory
      const { data: newCategory, error: createError } = await supabase
        .from('categories')
        .insert([{
          name: subcategoryName,
          parent_id: parentCategory.id,
          level: 2,
          tab_count: 0,
          max_tabs_before_split: this.DEFAULT_MAX_TABS,
          user_id: parentCategory.user_id
        }])
        .select()
        .single()

      if (createError || !newCategory) {
        console.error('Error creating subcategory:', createError)
        return
      }

      // Move tabs to new subcategory in batch
      const { error: updateError } = await supabase
        .from('tabs')
        .update({
          primary_category: newCategory.name,
          secondary_category: newCategory.name,
          auto_categorized_at: new Date().toISOString()
        })
        .eq('primary_category', parentCategory.name)
        .eq('secondary_category', subcategoryName)

      if (updateError) {
        console.error('Error moving tabs to subcategory:', updateError)
      }

    } catch (error) {
      console.error('Error in createSubcategoryAndMoveTabs:', error)
    }
  }

  /**
   * Update tab counts for all categories (optimized batch version)
   */
  async updateCategoryTabCountsBatch(): Promise<void> {
    try {
      // Use a single query to get all categories with their tab counts
      const { data: categoryCounts, error } = await supabase
        .rpc('get_category_tab_counts')

      if (error) {
        // Fallback to individual updates if RPC doesn't exist
        await this.updateCategoryTabCountsFallback()
        return
      }

      // Update all categories in batch
      if (categoryCounts && categoryCounts.length > 0) {
        const updates = categoryCounts.map((item: any) => ({
          id: item.category_id,
          tab_count: item.tab_count
        }))

        for (const update of updates) {
          await supabase
            .from('categories')
            .update({ tab_count: update.tab_count })
            .eq('id', update.id)
        }
      }
    } catch (error) {
      console.error('Error in updateCategoryTabCountsBatch:', error)
      // Fallback to individual updates
      await this.updateCategoryTabCountsFallback()
    }
  }

  /**
   * Fallback method for updating category tab counts
   */
  private async updateCategoryTabCountsFallback(): Promise<void> {
    try {
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name')

      if (categoriesError) throw categoriesError

      // Update tab counts for each category
      for (const category of categories || []) {
        const { count, error: countError } = await supabase
          .from('tabs')
          .select('*', { count: 'exact', head: true })
          .eq('primary_category', category.name)

        if (countError) continue

        await supabase
          .from('categories')
          .update({ tab_count: count || 0 })
          .eq('id', category.id)
      }
    } catch (error) {
      console.error('Error in updateCategoryTabCountsFallback:', error)
    }
  }

  /**
   * Get AI categorization for content
   */
  private async getAICategorization(content: string, url: string): Promise<CategoryResult> {
    try {
      const response = await fetch('/api/analyze-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, markdownContent: content })
      })

      if (!response.ok) {
        throw new Error('Failed to get AI categorization')
      }

      const result = await response.json()
      return {
        primaryCategory: result.primaryCategory || 'uncategorized',
        secondaryCategory: result.secondaryCategory || 'general',
        confidence: result.confidence || 0.5,
        tags: result.tags || []
      }
    } catch (error) {
      console.error('Error in getAICategorization:', error)
      // Return default categorization on error
      return {
        primaryCategory: 'uncategorized',
        secondaryCategory: 'general',
        confidence: 0.0,
        tags: []
      }
    }
  }

  /**
   * Get category statistics (optimized)
   */
  async getCategoryStats(): Promise<{
    totalCategories: number
    categoriesNeedingSplit: Category[]
    largestCategories: Category[]
  }> {
    try {
      const { data: categories, error } = await supabase
        .from('categories')
        .select('*')
        .order('tab_count', { ascending: false })

      if (error) throw error

      const categoriesNeedingSplit = (categories || []).filter(
        cat => cat.tab_count >= cat.max_tabs_before_split
      )

      const largestCategories = (categories || []).slice(0, 10)

      return {
        totalCategories: categories?.length || 0,
        categoriesNeedingSplit,
        largestCategories
      }
    } catch (error) {
      console.error('Error in getCategoryStats:', error)
      throw error
    }
  }

  // Legacy methods for backward compatibility
  async getOrCreateCategory(name: string, parentId?: string): Promise<Category> {
    const { data: existingCategory, error: findError } = await supabase
      .from('categories')
      .select('*')
      .eq('name', name)
      .eq('parent_id', parentId || null)
      .single()

    if (findError && findError.code !== 'PGRST116') {
      throw findError
    }

    if (existingCategory) {
      return existingCategory
    }

    const { data: newCategory, error: createError } = await supabase
      .from('categories')
      .insert([{
        name,
        parent_id: parentId || null,
        level: parentId ? 2 : 1,
        tab_count: 0,
        max_tabs_before_split: this.DEFAULT_MAX_TABS,
        user_id: (await supabase.auth.getUser()).data.user?.id
      }])
      .select()
      .single()

    if (createError) throw createError
    return newCategory
  }

  async checkAndSplitCategory(category: Category, suggestedSubcategory: string): Promise<CategorySplitResult | null> {
    // Delegate to async version
    await this.checkAndSplitCategoryAsync(category.name)
    return null
  }

  async moveTabToCategory(tabId: string, categoryId: string): Promise<void> {
    const category = await this.getCategoryById(categoryId)
    
    await supabase
      .from('tabs')
      .update({
        primary_category: category.name,
        secondary_category: category.level === 2 ? category.name : null,
        auto_categorized_at: new Date().toISOString()
      })
      .eq('id', tabId)
  }

  async getCategoryById(id: string): Promise<Category> {
    const { data: category, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error
    return category
  }

  async updateCategoryTabCounts(): Promise<void> {
    await this.updateCategoryTabCountsBatch()
  }
} 