-- Fix security issue with handle_updated_at function
-- Make the function immutable and secure

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

-- Verify the function is properly secured
SELECT 
    proname as function_name,
    prosecdef as security_definer,
    proconfig as search_path
FROM pg_proc 
WHERE proname = 'handle_updated_at'; 