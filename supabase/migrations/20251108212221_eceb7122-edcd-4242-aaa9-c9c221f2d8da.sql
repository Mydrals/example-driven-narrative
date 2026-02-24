-- Crear bucket para imágenes de manga comprimidas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'manga-compressed',
  'manga-compressed',
  true,
  10485760, -- 10MB límite
  ARRAY['image/webp', 'image/jpeg', 'image/png']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas RLS para el bucket manga-compressed
-- Los administradores pueden subir imágenes
CREATE POLICY "Admins can upload compressed manga images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'manga-compressed' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Los administradores pueden actualizar imágenes
CREATE POLICY "Admins can update compressed manga images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'manga-compressed' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Los administradores pueden eliminar imágenes
CREATE POLICY "Admins can delete compressed manga images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'manga-compressed' AND
  has_role(auth.uid(), 'admin'::app_role)
);

-- Todos pueden ver las imágenes (bucket público)
CREATE POLICY "Anyone can view compressed manga images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'manga-compressed');