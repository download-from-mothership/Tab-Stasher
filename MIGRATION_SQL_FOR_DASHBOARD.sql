-- Tab Categorization Migration
-- Run this in your Supabase Dashboard SQL Editor

-- Add categorization fields to tabs table
ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS primary_category TEXT;
ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS secondary_category TEXT;
ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS category_confidence DECIMAL(3,2);
ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS auto_categorized_at TIMESTAMP WITH TIME ZONE;

-- Create categories table for hierarchical management
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.categories(id),
    level INTEGER NOT NULL DEFAULT 1, -- 1=primary, 2=secondary
    tab_count INTEGER DEFAULT 0,
    max_tabs_before_split INTEGER DEFAULT 50,
    user_id UUID REFERENCES auth.users,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(name, parent_id, user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tabs_primary_category ON public.tabs(primary_category, user_id);
CREATE INDEX IF NOT EXISTS idx_tabs_secondary_category ON public.tabs(secondary_category, user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;

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

-- Add updated_at trigger for categories
DROP TRIGGER IF EXISTS handle_categories_updated_at ON public.categories;
CREATE TRIGGER handle_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Verify the migration
SELECT 'Migration completed successfully!' as status; 