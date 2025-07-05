-- Create a function to efficiently update category tab counts
CREATE OR REPLACE FUNCTION get_category_tab_counts()
RETURNS TABLE(category_id UUID, tab_count BIGINT) 
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT 
    c.id as category_id,
    COUNT(t.id) as tab_count
  FROM categories c
  LEFT JOIN tabs t ON c.name = t.primary_category
  GROUP BY c.id, c.name
$$;

-- Create an index to speed up category lookups
CREATE INDEX IF NOT EXISTS idx_categories_name_user ON categories(name, user_id);

-- Create an index to speed up tab category lookups
CREATE INDEX IF NOT EXISTS idx_tabs_primary_category_user ON tabs(primary_category, user_id);

-- Create a function to batch update category tab counts
CREATE OR REPLACE FUNCTION update_category_tab_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE categories 
  SET tab_count = (
    SELECT COUNT(*) 
    FROM tabs 
    WHERE tabs.primary_category = categories.name
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_category_tab_counts() TO authenticated;
GRANT EXECUTE ON FUNCTION update_category_tab_counts() TO authenticated; 