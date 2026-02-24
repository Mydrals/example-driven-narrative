-- Crear tabla para guardar el progreso de lectura de manga
CREATE TABLE public.manga_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  manga_id UUID NOT NULL REFERENCES public.mangas(id) ON DELETE CASCADE,
  chapter_id UUID NOT NULL REFERENCES public.manga_chapters(id) ON DELETE CASCADE,
  current_page INTEGER NOT NULL DEFAULT 1,
  total_pages INTEGER NOT NULL DEFAULT 1,
  last_chapter_number NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, manga_id)
);

-- Habilitar RLS
ALTER TABLE public.manga_progress ENABLE ROW LEVEL SECURITY;

-- Políticas RLS: Los usuarios solo pueden ver y modificar su propio progreso
CREATE POLICY "Users can view their own manga progress"
ON public.manga_progress
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own manga progress"
ON public.manga_progress
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own manga progress"
ON public.manga_progress
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own manga progress"
ON public.manga_progress
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_manga_progress_updated_at
BEFORE UPDATE ON public.manga_progress
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();