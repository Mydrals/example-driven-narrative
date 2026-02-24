-- Add genres column to animes table
ALTER TABLE public.animes 
ADD COLUMN genres text[];

-- Set default genres for existing animes
UPDATE public.animes 
SET genres = ARRAY['Comedia', 'Infantil y Familiar'] 
WHERE genres IS NULL;