# Tab Categorization Implementation Plan

## Overview
Implement automatic hierarchical categorization for tabs with smart category splitting when categories become too large.

## Database Schema Changes

### Phase 1: Add Categorization Fields to Tabs Table
```sql
-- Add categorization fields to tabs table
ALTER TABLE public.tabs ADD COLUMN primary_category TEXT;
ALTER TABLE public.tabs ADD COLUMN secondary_category TEXT;
ALTER TABLE public.tabs ADD COLUMN category_confidence DECIMAL(3,2);
ALTER TABLE public.tabs ADD COLUMN auto_categorized_at TIMESTAMP WITH TIME ZONE;

-- Create categories table for hierarchical management
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.categories(id),
    level INTEGER NOT NULL DEFAULT 1, -- 1=primary, 2=secondary
    tab_count INTEGER DEFAULT 0,
    max_tabs_before_split INTEGER DEFAULT 50,
    user_id UUID REFERENCES auth.users,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(name, parent_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_tabs_primary_category ON public.tabs(primary_category, user_id);
CREATE INDEX idx_tabs_secondary_category ON public.tabs(secondary_category, user_id);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);
```

### Phase 2: RLS Policies for Categories
```sql
-- Collection policies for categories
CREATE POLICY "Users can view their own categories"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);
```

## Implementation Steps

### Step 1: Database Migration ✅ COMPLETED
- [x] Create migration file for new schema changes
- [x] Test migration on development database
- [x] Update TypeScript interfaces in `src/lib/supabase.ts`
- [x] Fix security issues with auth methods

### Step 2: Enhanced Content Analysis ✅ COMPLETED
- [x] Modify `src/app/api/analyze-content/route.ts` to include categorization
- [x] Update prompt to return hierarchical categories
- [x] Add confidence scoring
- [x] Test with various content types
- [x] Update tabs API to handle categorization data
- [x] Create CategoryBadge component
- [x] Update UI to display categories

### Step 3: Category Management Service ✅ COMPLETED
- [x] Create `src/lib/category-manager.ts`
- [x] Implement category creation and management
- [x] Add category splitting logic
- [x] Create category size monitoring
- [x] Integrate with tab creation process
- [x] Create category dashboard UI
- [x] Add manual category splitting functionality

### Step 4: UI Updates
- [ ] Update tab cards to show categories
- [ ] Create category management dashboard
- [ ] Add category filtering and sorting
- [ ] Implement category editing interface

### Step 5: Optimization
- [ ] Implement batch processing
- [ ] Add caching layer
- [ ] Create cost monitoring
- [ ] Performance optimization

## Detailed Implementation

### Step 1: Database Migration

**File: `supabase/migrations/20240320_add_categorization.sql`**
```sql
-- Add categorization fields to tabs table
ALTER TABLE public.tabs ADD COLUMN primary_category TEXT;
ALTER TABLE public.tabs ADD COLUMN secondary_category TEXT;
ALTER TABLE public.tabs ADD COLUMN category_confidence DECIMAL(3,2);
ALTER TABLE public.tabs ADD COLUMN auto_categorized_at TIMESTAMP WITH TIME ZONE;

-- Create categories table
CREATE TABLE public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.categories(id),
    level INTEGER NOT NULL DEFAULT 1,
    tab_count INTEGER DEFAULT 0,
    max_tabs_before_split INTEGER DEFAULT 50,
    user_id UUID REFERENCES auth.users,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(name, parent_id, user_id)
);

-- Add indexes
CREATE INDEX idx_tabs_primary_category ON public.tabs(primary_category, user_id);
CREATE INDEX idx_tabs_secondary_category ON public.tabs(secondary_category, user_id);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);

-- Enable RLS
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can view their own categories"
    ON public.categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own categories"
    ON public.categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
    ON public.categories FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
    ON public.categories FOR DELETE
    USING (auth.uid() = user_id);
```

### Step 2: Enhanced Content Analysis

**File: `src/app/api/analyze-content/route.ts` (Updated)**
```typescript
const categorizationPrompt = `Analyze this content and categorize it into a hierarchical structure.

Content: ${markdownContent}
URL: ${url}

Return a JSON object with:
1. Primary category (e.g., "clothing", "shoes", "homegoods", "electronics", "books", "food")
2. Secondary category (e.g., "tops", "bottoms", "dresses" for clothing)
3. Confidence score (0-1)
4. Suggested tags

Format:
{
  "title": "extracted title",
  "image": "image URL or null",
  "tags": ["tag1", "tag2", "tag3"],
  "primaryCategory": "clothing",
  "secondaryCategory": "dresses",
  "confidence": 0.92
}`;
```

### Step 3: Category Management Service

**File: `src/lib/category-manager.ts`**
```typescript
export interface Category {
  id: string
  name: string
  parent_id: string | null
  level: number
  tab_count: number
  max_tabs_before_split: number
  user_id: string
  created_at: string
}

export interface CategoryResult {
  primaryCategory: string
  secondaryCategory: string
  confidence: number
  tags: string[]
}

export class CategoryManager {
  async categorizeTab(tab: Tab, content: string): Promise<CategoryResult> {
    // 1. AI categorization
    const aiResult = await this.getAICategorization(content, tab.url)
    
    // 2. Check if category needs splitting
    const category = await this.getOrCreateCategory(aiResult.primaryCategory)
    
    if (category.tab_count >= category.max_tabs_before_split) {
      await this.splitCategory(category.id, aiResult.secondaryCategory)
    }
    
    return aiResult
  }
  
  async getOrCreateCategory(name: string, parentId?: string): Promise<Category> {
    // Implementation here
  }
  
  async splitCategory(categoryId: string, newSubcategory: string) {
    // Algorithmic category splitting
  }
}
```

### Step 4: UI Components

**File: `src/app/ui/category-badge.tsx`**
```typescript
interface CategoryBadgeProps {
  primaryCategory: string
  secondaryCategory?: string
  confidence: number
}

export function CategoryBadge({ primaryCategory, secondaryCategory, confidence }: CategoryBadgeProps) {
  return (
    <div className="flex items-center gap-1">
      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
        {primaryCategory}
      </span>
      {secondaryCategory && (
        <span className="inline-flex items-center rounded-full bg-secondary/10 px-2 py-1 text-xs font-medium text-secondary">
          {secondaryCategory}
        </span>
      )}
      {confidence < 0.8 && (
        <span className="text-xs text-muted-foreground">({Math.round(confidence * 100)}%)</span>
      )}
    </div>
  )
}
```

## Cost Analysis

### Current Costs
- **Gemini 2.0 Flash Lite**: ~$0.001-0.005 per tab
- **With categorization**: ~$0.002-0.008 per tab
- **Total per tab**: ~$0.003-0.013

### Monthly Projections
- **100 tabs/day**: ~$1.30/month
- **500 tabs/day**: ~$6.50/month
- **1000 tabs/day**: ~$13/month

### Optimization Strategies
1. **Batch Processing**: Process 10 tabs at once (~$0.01 instead of $0.05)
2. **Caching**: Cache similar content categorizations
3. **Progressive Enhancement**: Use simple rules first, AI for ambiguous cases

## Testing Strategy

### Unit Tests
- [ ] Category creation and management
- [ ] AI categorization accuracy
- [ ] Category splitting logic
- [ ] Database operations

### Integration Tests
- [ ] End-to-end tab categorization flow
- [ ] Category splitting triggers
- [ ] UI updates with categories

### Performance Tests
- [ ] Batch processing efficiency
- [ ] Database query performance
- [ ] API response times

## Success Metrics

### Technical Metrics
- [ ] Categorization accuracy > 85%
- [ ] API response time < 2 seconds
- [ ] Database query performance < 100ms
- [ ] Cost per tab < $0.015

### User Experience Metrics
- [ ] User adoption of categories
- [ ] Category editing frequency
- [ ] Search and filter usage
- [ ] User satisfaction with organization

## Next Steps

1. **Start with Step 1**: Database migration
2. **Test thoroughly** before moving to next step
3. **Implement incrementally** to catch issues early
4. **Monitor costs** throughout development
5. **Gather user feedback** at each phase

## Notes

- Keep existing tag system as secondary classification
- Maintain backward compatibility with existing tabs
- Consider user override capabilities for AI categorization
- Plan for category merging and reorganization features
- Document all API changes for future reference 