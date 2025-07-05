-- Add optimized tab saving function and tag processing
-- This migration adds the save_tab_with_tags function that combines tab creation and tag processing

-- 1. CREATE TAG PROCESSING FUNCTION
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

-- 2. CREATE OPTIMIZED TAB SAVING FUNCTION
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

-- 3. VERIFY FUNCTION CREATION
SELECT 'save_tab_with_tags function created successfully!' as status; 