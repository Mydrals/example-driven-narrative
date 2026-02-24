-- Add thumbnail_sprite_url column to episodes table
ALTER TABLE public.episodes
ADD COLUMN IF NOT EXISTS thumbnail_sprite_url text;