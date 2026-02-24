-- Add columns for skip credits and next episode autoplay configuration
ALTER TABLE public.episodes 
ADD COLUMN skip_credits_time integer DEFAULT 90,
ADD COLUMN skip_credits_to integer DEFAULT NULL;

COMMENT ON COLUMN public.episodes.skip_credits_time IS 'Seconds before the end when the skip credits button appears (default 90 seconds = 1.5 minutes)';
COMMENT ON COLUMN public.episodes.skip_credits_to IS 'Time in seconds to skip to when skip credits button is clicked (typically near the end of the video)';