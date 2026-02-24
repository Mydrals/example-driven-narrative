-- Add default_view_mode column to manga_chapters
ALTER TABLE public.manga_chapters
ADD COLUMN default_view_mode text NOT NULL DEFAULT 'double';

-- Add comment to explain the column
COMMENT ON COLUMN public.manga_chapters.default_view_mode IS 'Default view mode for the manga reader: single or double page';