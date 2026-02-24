-- Actualizar el tomo 2 para que use webp como formato principal
UPDATE manga_chapters
SET file_extensions = ARRAY['webp', 'jpg', 'png']
WHERE chapter_number = 2 AND manga_id = '22359245-bc39-4f57-b12e-54461e05d014';

-- Asegurar que todos los tomos futuros tengan webp por defecto
ALTER TABLE manga_chapters 
ALTER COLUMN file_extensions SET DEFAULT ARRAY['webp', 'jpg', 'png'];