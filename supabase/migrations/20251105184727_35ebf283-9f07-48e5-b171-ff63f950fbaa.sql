-- Create user_anime_lists table to store user's anime lists
CREATE TABLE IF NOT EXISTS public.user_anime_lists (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id uuid NOT NULL REFERENCES public.animes(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'mi-lista' CHECK (status IN ('mi-lista', 'seguir-viendo', 'por-ver', 'completado')),
  progress integer NOT NULL DEFAULT 0,
  total_episodes integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, anime_id)
);

-- Enable Row Level Security
ALTER TABLE public.user_anime_lists ENABLE ROW LEVEL SECURITY;

-- Create policies for user_anime_lists
CREATE POLICY "Users can view their own anime lists"
ON public.user_anime_lists
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own anime lists"
ON public.user_anime_lists
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own anime lists"
ON public.user_anime_lists
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own anime lists"
ON public.user_anime_lists
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_user_anime_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_anime_lists_updated_at
BEFORE UPDATE ON public.user_anime_lists
FOR EACH ROW
EXECUTE FUNCTION public.update_user_anime_lists_updated_at();