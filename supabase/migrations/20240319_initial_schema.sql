-- Create a custom type for tab status
CREATE TYPE public.tab_status AS ENUM ('active', 'archived', 'deleted');

-- Create the tabs table
CREATE TABLE public.tabs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    image TEXT,
    favicon TEXT,
    content TEXT,
    status public.tab_status DEFAULT 'active'::public.tab_status NOT NULL,
    user_id UUID REFERENCES auth.users,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create the tags table
CREATE TABLE public.tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    color TEXT,
    user_id UUID REFERENCES auth.users,
    UNIQUE(name, user_id)
);

-- Create the tabs_tags junction table for many-to-many relationship
CREATE TABLE public.tabs_tags (
    tab_id UUID REFERENCES public.tabs(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES public.tags(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (tab_id, tag_id)
);

-- Create collections table for organizing tabs into groups
CREATE TABLE public.collections (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    user_id UUID REFERENCES auth.users,
    parent_id UUID REFERENCES public.collections(id),
    UNIQUE(name, user_id, parent_id)
);

-- Create tabs_collections junction table
CREATE TABLE public.tabs_collections (
    tab_id UUID REFERENCES public.tabs(id) ON DELETE CASCADE,
    collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    position INTEGER NOT NULL,
    PRIMARY KEY (tab_id, collection_id)
);

-- Add indexes for better query performance
CREATE INDEX idx_tabs_user_id ON public.tabs(user_id);
CREATE INDEX idx_tabs_status ON public.tabs(status);
CREATE INDEX idx_tags_user_id ON public.tags(user_id);
CREATE INDEX idx_collections_user_id ON public.collections(user_id);
CREATE INDEX idx_collections_parent_id ON public.collections(parent_id);

-- Add updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_tabs_updated_at
    BEFORE UPDATE ON public.tabs
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_collections_updated_at
    BEFORE UPDATE ON public.collections
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security (RLS)
ALTER TABLE public.tabs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabs_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tabs_collections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own tabs"
    ON public.tabs FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tabs"
    ON public.tabs FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tabs"
    ON public.tabs FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tabs"
    ON public.tabs FOR DELETE
    USING (auth.uid() = user_id);

-- Similar policies for tags
CREATE POLICY "Users can view their own tags"
    ON public.tags FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tags"
    ON public.tags FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tags"
    ON public.tags FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tags"
    ON public.tags FOR DELETE
    USING (auth.uid() = user_id);

-- Junction table policies
CREATE POLICY "Users can manage their tabs_tags"
    ON public.tabs_tags FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tabs
            WHERE tabs.id = tabs_tags.tab_id
            AND tabs.user_id = auth.uid()
        )
    );

-- Collection policies
CREATE POLICY "Users can view their own collections"
    ON public.collections FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own collections"
    ON public.collections FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own collections"
    ON public.collections FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own collections"
    ON public.collections FOR DELETE
    USING (auth.uid() = user_id);

-- Tabs collections junction table policies
CREATE POLICY "Users can manage their tabs_collections"
    ON public.tabs_collections FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tabs
            WHERE tabs.id = tabs_collections.tab_id
 