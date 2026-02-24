-- Add video_url column to episodes table
ALTER TABLE public.episodes 
ADD COLUMN video_url TEXT;