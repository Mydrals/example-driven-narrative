-- Actualizar las extensiones de archivo del tomo 1 para incluir webp
UPDATE manga_chapters 
SET file_extensions = ARRAY['webp', 'jpg', 'png']
WHERE id = '0c5c5cea-3118-451e-b401-bb7108892270';