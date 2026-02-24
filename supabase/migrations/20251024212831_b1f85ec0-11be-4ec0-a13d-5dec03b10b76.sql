-- Create episodes table
CREATE TABLE public.episodes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anime_id UUID NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  season_number INTEGER NOT NULL DEFAULT 1,
  episode_number INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  duration TEXT NOT NULL DEFAULT '24 min',
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_episode_per_season UNIQUE (anime_id, season_number, episode_number)
);

-- Enable Row Level Security
ALTER TABLE public.episodes ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access
CREATE POLICY "Anyone can view episodes" 
ON public.episodes 
FOR SELECT 
USING (true);

-- Create index for better query performance
CREATE INDEX idx_episodes_anime_season ON public.episodes(anime_id, season_number);
CREATE INDEX idx_episodes_anime_id ON public.episodes(anime_id);