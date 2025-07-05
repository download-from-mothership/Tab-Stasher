-- Optimize RLS policies for better performance
-- Replace direct auth.uid() calls with subqueries

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

-- Optimize categories policies (from our new migration)
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