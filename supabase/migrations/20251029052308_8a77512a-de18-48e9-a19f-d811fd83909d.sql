-- Add anime_title column to episodes table for easier reference
ALTER TABLE public.episodes 
ADD COLUMN anime_title TEXT;

-- Add original_release_date column to store when episode was released on internet
ALTER TABLE public.episodes 
ADD COLUMN original_release_date DATE;

-- Add comment to clarify the purpose of the new columns
COMMENT ON COLUMN public.episodes.anime_title IS 'Name of the anime series for easier reference instead of using ID';
COMMENT ON COLUMN public.episodes.original_release_date IS 'Date when episode was originally released on internet (day, month, year only)';