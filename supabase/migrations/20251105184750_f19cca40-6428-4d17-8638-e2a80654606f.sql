-- Fix security warning: Add search_path to trigger function
CREATE OR REPLACE FUNCTION public.update_user_anime_lists_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;