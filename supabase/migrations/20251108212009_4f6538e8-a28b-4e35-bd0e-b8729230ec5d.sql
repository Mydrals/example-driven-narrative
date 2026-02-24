-- Actualizar TODOS los tomos de TODOS los mangas para que usen webp como formato principal
UPDATE manga_chapters
SET file_extensions = ARRAY['webp', 'jpg', 'png']
WHERE file_extensions != ARRAY['webp', 'jpg', 'png'] OR file_extensions IS NULL;