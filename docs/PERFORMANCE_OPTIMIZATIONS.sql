-- PERFORMANCE OPTIMIZATIONS FOR TAB STASHER
-- Run this in your Supabase Dashboard SQL Editor to fix slow saving

-- 1. OPTIMIZE RLS POLICIES (High Impact)
-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own tabs" ON public.tabs;
DROP POLICY IF EXISTS "Users can insert their own tabs" ON public.tabs;
DROP POLICY IF EXISTS "Users can update their own tabs" ON public.tabs;
DROP POLICY IF EXISTS "Users can delete their own tabs" ON public.tabs;

DROP POLICY IF EXISTS "Users can view their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can insert their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can update their own tags" ON public.tags;
DROP POLICY IF EXISTS "Users can delete their own tags" ON public.tags;

DROP POLICY IF EXISTS "Users can manage their tabs_tags" ON public.tabs_tags;

DROP POLICY IF EXISTS "Users can view their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can insert their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can update their own collections" ON public.collections;
DROP POLICY IF EXISTS "Users can delete their own collections" ON public.collections;

DROP POLICY IF EXISTS "Users can manage their tabs_collections" ON public.tabs_collections;

-- Recreate optimized policies for tabs
CREATE POLICY "Users can view their own tabs"
    ON public.tabs FOR SELECT
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own tabs"
    ON public.tabs FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own tabs"
    ON public.tabs FOR UPDATE
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own tabs"
    ON public.tabs FOR DELETE
    USING (user_id = (SELECT auth.uid()));

-- Recreate optimized policies for tags
CREATE POLICY "Users can view their own tags"
    ON public.tags FOR SELECT
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own tags"
    ON public.tags FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own tags"
    ON public.tags FOR UPDATE
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own tags"
    ON public.tags FOR DELETE
    USING (user_id = (SELECT auth.uid()));

-- Recreate optimized policies for tabs_tags junction table
CREATE POLICY "Users can manage their tabs_tags"
    ON public.tabs_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tabs
            WHERE tabs.id = tabs_tags.tab_id
            AND tabs.user_id = (SELECT auth.uid())
        )
    );

-- Recreate optimized policies for collections
CREATE POLICY "Users can view their own collections"
    ON public.collections FOR SELECT
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own collections"
    ON public.collections FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own collections"
    ON public.collections FOR UPDATE
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own collections"
    ON public.collections FOR DELETE
    USING (user_id = (SELECT auth.uid()));

-- Recreate optimized policies for tabs_collections junction table
CREATE POLICY "Users can manage their tabs_collections"
    ON public.tabs_collections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tabs
            WHERE tabs.id = tabs_collections.tab_id
            AND tabs.user_id = (SELECT auth.uid())
        )
    );

-- Optimize categories policies
DROP POLICY IF EXISTS "Users can view their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update their own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete their own categories" ON public.categories;

CREATE POLICY "Users can view their own categories"
    ON public.categories FOR SELECT
    USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert their own categories"
    ON public.categories FOR INSERT
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update their own categories"
    ON public.categories FOR UPDATE
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete their own categories"
    ON public.categories FOR DELETE
    USING (user_id = (SELECT auth.uid()));

-- 2. ADD MISSING INDEXES (Medium Impact)
-- Indexes for tabs_tags junction table
CREATE INDEX IF NOT EXISTS idx_tabs_tags_tab_id ON tabs_tags(tab_id);
CREATE INDEX IF NOT EXISTS idx_tabs_tags_tag_id ON tabs_tags(tag_id);
CREATE INDEX IF NOT EXISTS idx_tabs_tags_composite ON tabs_tags(tab_id, tag_id);

-- Indexes for tags table
CREATE INDEX IF NOT EXISTS idx_tags_name_user_id ON tags(name, user_id);
CREATE INDEX IF NOT EXISTS idx_tags_user_id_name ON tags(user_id, name);

-- Indexes for tabs table
CREATE INDEX IF NOT EXISTS idx_tabs_user_id_created_at ON tabs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_tabs_user_id_status ON tabs(user_id, status);

-- Indexes for categories table
CREATE INDEX IF NOT EXISTS idx_categories_name_user ON categories(name, user_id);
CREATE INDEX IF NOT EXISTS idx_categories_user_id_level ON categories(user_id, level);

-- 3. CREATE OPTIMIZED TAG PROCESSING FUNCTION (High Impact)
-- This replaces the 3 separate operations with a single function call
CREATE OR REPLACE FUNCTION process_tags_batch(
    p_tab_id UUID,
    p_tag_names TEXT[],
    p_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_tag RECORD;
    new_tag RECORD;
    tag_id UUID;
    tag_name TEXT;
BEGIN
    -- Process each tag name
    FOREACH tag_name IN ARRAY p_tag_names
    LOOP
        -- Check if tag already exists
        SELECT id INTO existing_tag
        FROM public.tags
        WHERE name = tag_name AND user_id = p_user_id
        LIMIT 1;
        
        IF existing_tag.id IS NULL THEN
            -- Create new tag
            INSERT INTO public.tags (name, user_id)
            VALUES (tag_name, p_user_id)
            RETURNING id INTO new_tag;
            
            tag_id := new_tag.id;
        ELSE
            tag_id := existing_tag.id;
        END IF;
        
        -- Create tab-tag relationship (ignore if already exists)
        INSERT INTO public.tabs_tags (tab_id, tag_id)
        VALUES (p_tab_id, tag_id)
        ON CONFLICT (tab_id, tag_id) DO NOTHING;
    END LOOP;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION process_tags_batch(UUID, TEXT[], UUID) TO authenticated;

-- 4. CREATE OPTIMIZED TAB SAVING FUNCTION (High Impact)
-- This combines tab creation and tag processing in a single transaction
CREATE OR REPLACE FUNCTION save_tab_with_tags(
    p_url TEXT,
    p_title TEXT,
    p_description TEXT,
    p_image TEXT,
    p_favicon TEXT,
    p_content TEXT,
    p_primary_category TEXT,
    p_secondary_category TEXT,
    p_category_confidence DECIMAL(3,2),
    p_auto_categorized_at TIMESTAMPTZ,
    p_tag_names TEXT[],
    p_user_id UUID
)
RETURNS TABLE(
    tab_id UUID,
    success BOOLEAN,
    error_message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_tab_id UUID;
    result_record RECORD;
BEGIN
    -- Insert the tab
    INSERT INTO public.tabs (
        url, title, description, image, favicon, content,
        primary_category, secondary_category, category_confidence,
        auto_categorized_at, user_id, status
    )
    VALUES (
        p_url, p_title, p_description, p_image, p_favicon, p_content,
        p_primary_category, p_secondary_category, p_category_confidence,
        p_auto_categorized_at, p_user_id, 'active'
    )
    RETURNING id INTO new_tab_id;
    
    -- Process tags if provided
    IF p_tag_names IS NOT NULL AND array_length(p_tag_names, 1) > 0 THEN
        PERFORM process_tags_batch(new_tab_id, p_tag_names, p_user_id);
    END IF;
    
    -- Return success
    tab_id := new_tab_id;
    success := TRUE;
    error_message := NULL;
    
    RETURN NEXT;
    
EXCEPTION WHEN OTHERS THEN
    -- Return error
    tab_id := NULL;
    success := FALSE;
    error_message := SQLERRM;
    
    RETURN NEXT;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION save_tab_with_tags(TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, TEXT, DECIMAL, TIMESTAMPTZ, TEXT[], UUID) TO authenticated;

-- 5. VERIFY OPTIMIZATIONS
SELECT 'Performance optimizations completed successfully!' as status; 