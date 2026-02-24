-- Add featured column to animes table to control which animes appear in hero carousel
ALTER TABLE public.animes 
ADD COLUMN featured boolean NOT NULL DEFAULT false;

-- Create an index for better query performance
CREATE INDEX idx_animes_featured ON public.animes(featured) WHERE featured = true;

-- Set some animes as featured (you can change these in Supabase dashboard)
UPDATE public.animes 
SET featured = true 
WHERE id IN (
  SELECT id FROM public.animes LIMIT 6
);