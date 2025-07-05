-- Fix foreign key performance issue for tabs_collections table
-- Run this in your Supabase Dashboard SQL Editor to add missing indexes

-- Add covering index for collection_id foreign key
-- This resolves the "foreign key without covering index" performance warning
CREATE INDEX IF NOT EXISTS idx_tabs_collections_collection_id ON public.tabs_collections(collection_id);

-- Add composite index for common query patterns (collection_id + position)
-- This optimizes queries that fetch tabs in a specific collection ordered by position
CREATE INDEX IF NOT EXISTS idx_tabs_collections_collection_position ON public.tabs_collections(collection_id, position);

-- Add index for tab_id lookups 
-- This optimizes queries that find all collections for a specific tab
CREATE INDEX IF NOT EXISTS idx_tabs_collections_tab_id ON public.tabs_collections(tab_id);

-- Add covering index for the most common query pattern
-- This includes tab_id and created_at in the index to avoid table lookups
CREATE INDEX IF NOT EXISTS idx_tabs_collections_collection_position_covering 
ON public.tabs_collections(collection_id, position) 
INCLUDE (tab_id, created_at);

-- Verify the indexes were created successfully
SELECT 
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename = 'tabs_collections' 
AND schemaname = 'public'
ORDER BY indexname;

-- Show the performance improvement
SELECT 'Foreign key index optimization completed successfully!' as status; 