-- Fix security issue with handle_updated_at function
-- Run this in your Supabase Dashboard SQL Editor to fix the function security warning

-- Drop existing triggers first
DROP TRIGGER IF EXISTS handle_tabs_updated_at ON public.tabs;
DROP TRIGGER IF EXISTS handle_collections_updated_at ON public.collections;
DROP TRIGGER IF EXISTS handle_categories_updated_at ON public.categories;

-- Drop existing function
DROP FUNCTION IF EXISTS public.handle_updated_at();

-- Recreate the function with proper security settings
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER handle_tabs_updated_at
    BEFORE UPDATE ON public.tabs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_collections_updated_at
    BEFORE UPDATE ON public.collections
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_categories_updated_at
    BEFORE UPDATE ON public.categories
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Verify the function is properly secured
SELECT 
    proname as function_name,
    prosecdef as security_definer,
    proconfig as search_path
FROM pg_proc 
WHERE proname = 'handle_updated_at';

CREATE INDEX idx_tabs_tags_tab_id ON tabs_tags(tab_id);
CREATE INDEX idx_tabs_tags_tag_id ON tabs_tags(tag_id);
CREATE INDEX idx_tags_name_user_id ON tags(name, user_id); 