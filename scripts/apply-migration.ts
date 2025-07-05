import { createClient } from '@supabase/supabase-js'

// This script applies the categorization migration to your Supabase database
// Run with: npx tsx scripts/apply-migration.ts

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  console.log('Please set:')
  console.log('- NEXT_PUBLIC_SUPABASE_URL')
  console.log('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('Applying categorization migration...')

  try {
    // Add categorization fields to tabs table
    console.log('Adding categorization fields to tabs table...')
    await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS primary_category TEXT;
        ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS secondary_category TEXT;
        ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS category_confidence DECIMAL(3,2);
        ALTER TABLE public.tabs ADD COLUMN IF NOT EXISTS auto_categorized_at TIMESTAMP WITH TIME ZONE;
      `
    })

    // Create categories table
    console.log('Creating categories table...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS public.categories (
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
      `
    })

    // Add indexes
    console.log('Adding indexes...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_tabs_primary_category ON public.tabs(primary_category, user_id);
        CREATE INDEX IF NOT EXISTS idx_tabs_secondary_category ON public.tabs(secondary_category, user_id);
        CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);
        CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
      `
    })

    // Enable RLS
    console.log('Enabling RLS...')
    await supabase.rpc('exec_sql', {
      sql: `ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;`
    })

    // Create RLS policies
    console.log('Creating RLS policies...')
    await supabase.rpc('exec_sql', {
      sql: `
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
      `
    })

    // Add updated_at trigger
    console.log('Adding updated_at trigger...')
    await supabase.rpc('exec_sql', {
      sql: `
        DROP TRIGGER IF EXISTS handle_categories_updated_at ON public.categories;
        CREATE TRIGGER handle_categories_updated_at
            BEFORE UPDATE ON public.categories
            FOR EACH ROW
            EXECUTE FUNCTION public.handle_updated_at();
      `
    })

    console.log('✅ Migration applied successfully!')
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

applyMigration() 