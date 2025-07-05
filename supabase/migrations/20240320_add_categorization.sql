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

-- Add indexes for performance
CREATE INDEX idx_tabs_primary_category ON public.tabs(primary_category, user_id);
CREATE INDEX idx_tabs_secondary_category ON public.tabs(secondary_category, user_id);
CREATE INDEX idx_categories_user_id ON public.categories(user_id);
CREATE INDEX idx_categories_parent_id ON public.categories(parent_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for categories
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
CREATE TRIGGER handle_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at(); 