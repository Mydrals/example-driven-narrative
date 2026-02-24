-- Add alternative_titles column to animes table
ALTER TABLE public.animes
ADD COLUMN alternative_titles text[] DEFAULT '{}';

-- Create a GIN index for efficient search on alternative titles
CREATE INDEX idx_animes_alternative_titles ON public.animes USING GIN(alternative_titles);