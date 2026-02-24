-- Create episode_likes table
CREATE TABLE public.episode_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  vote_type text NOT NULL CHECK (vote_type IN ('like', 'dislike')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, episode_id)
);

-- Enable RLS
ALTER TABLE public.episode_likes ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view all episode likes"
ON public.episode_likes
FOR SELECT
USING (true);

CREATE POLICY "Users can insert their own episode likes"
ON public.episode_likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own episode likes"
ON public.episode_likes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own episode likes"
ON public.episode_likes
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_episode_likes_updated_at
BEFORE UPDATE ON public.episode_likes
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();