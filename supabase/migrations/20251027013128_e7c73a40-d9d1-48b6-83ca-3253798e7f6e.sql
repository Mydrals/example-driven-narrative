-- Add mobile hero banner URL column to animes table
ALTER TABLE public.animes 
ADD COLUMN mobile_hero_banner_url text;