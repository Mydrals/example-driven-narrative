-- Crear tabla para guardar el progreso de visualización de episodios
CREATE TABLE public.episode_progress (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  episode_id uuid NOT NULL REFERENCES public.episodes(id) ON DELETE CASCADE,
  progress_time integer NOT NULL DEFAULT 0,
  duration integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, episode_id)
);

-- Habilitar RLS
ALTER TABLE public.episode_progress ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: los usuarios solo pueden ver y modificar su propio progreso
CREATE POLICY "Users can view their own progress"
ON public.episode_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own progress"
ON public.episode_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress"
ON public.episode_progress
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own progress"
ON public.episode_progress
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_episode_progress_updated_at
BEFORE UPDATE ON public.episode_progress
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();