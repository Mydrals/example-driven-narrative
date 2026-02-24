-- Create mangas table
CREATE TABLE public.mangas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  poster_url TEXT,
  featured BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create manga_chapters table
CREATE TABLE public.manga_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  manga_id UUID NOT NULL REFERENCES public.mangas(id) ON DELETE CASCADE,
  chapter_number NUMERIC NOT NULL,
  title TEXT,
  folder_url TEXT NOT NULL, -- URL base de la carpeta donde están los JPGs
  total_pages INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(manga_id, chapter_number)
);

-- Enable Row Level Security
ALTER TABLE public.mangas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.manga_chapters ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mangas
CREATE POLICY "Anyone can view mangas"
  ON public.mangas
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert mangas"
  ON public.mangas
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update mangas"
  ON public.mangas
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete mangas"
  ON public.mangas
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for manga_chapters
CREATE POLICY "Anyone can view manga chapters"
  ON public.manga_chapters
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert manga chapters"
  ON public.manga_chapters
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update manga chapters"
  ON public.manga_chapters
  FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete manga chapters"
  ON public.manga_chapters
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_manga_chapters_manga_id ON public.manga_chapters(manga_id);
CREATE INDEX idx_mangas_slug ON public.mangas(slug);
CREATE INDEX idx_mangas_featured ON public.mangas(featured) WHERE featured = true;