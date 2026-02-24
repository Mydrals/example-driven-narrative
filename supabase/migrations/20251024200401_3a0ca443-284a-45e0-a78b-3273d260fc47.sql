-- Add slug column to animes table
ALTER TABLE public.animes 
ADD COLUMN slug text;

-- Create unique index on slug
CREATE UNIQUE INDEX idx_animes_slug ON public.animes(slug);

-- Update existing records with slugs based on their titles
UPDATE public.animes
SET slug = lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL;

-- Make slug NOT NULL after populating existing records
ALTER TABLE public.animes 
ALTER COLUMN slug SET NOT NULL;