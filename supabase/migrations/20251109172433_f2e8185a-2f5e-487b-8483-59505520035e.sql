-- Añadir columna para almacenar información de capítulos dentro de cada tomo
ALTER TABLE manga_chapters 
ADD COLUMN chapters_info jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN manga_chapters.chapters_info IS 'Array de objetos con información de capítulos: [{"chapter_number": 1, "start_page": 1, "end_page": 20, "title": "Título opcional"}]';