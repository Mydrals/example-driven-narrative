-- Add year column to animes table
ALTER TABLE public.animes 
ADD COLUMN year integer;

-- Set default year for existing animes
UPDATE public.animes 
SET year = 2025 
WHERE year IS NULL;