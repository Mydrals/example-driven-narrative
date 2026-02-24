-- Actualizar todas las extensiones de archivo de todos los capítulos de manga
UPDATE manga_chapters 
SET file_extensions = ARRAY['webp', 'jpg', 'png']
WHERE file_extensions IS NOT NULL;