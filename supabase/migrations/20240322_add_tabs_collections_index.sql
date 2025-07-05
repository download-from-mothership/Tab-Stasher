-- Add covering index for tabs_collections collection_id foreign key
-- This improves performance for queries that filter by collection_id

-- Add index for collection_id foreign key
CREATE INDEX IF NOT EXISTS idx_tabs_collections_collection_id ON public.tabs_collections(collection_id);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_tabs_collections_collection_position ON public.tabs_collections(collection_id, position);

-- Add index for tab_id lookups (if not already covered by primary key)
CREATE INDEX IF NOT EXISTS idx_tabs_collections_tab_id ON public.tabs_collections(tab_id);

-- Add covering index for common queries that need position ordering
CREATE INDEX IF NOT EXISTS idx_tabs_collections_collection_position_covering ON public.tabs_collections(collection_id, position) INCLUDE (tab_id, created_at); 