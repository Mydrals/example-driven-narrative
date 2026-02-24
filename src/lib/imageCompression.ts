import { supabase } from "@/integrations/supabase/client";

interface CompressImageOptions {
  imageUrl?: string;
  imageBase64?: string;
  bucket?: string;
  path: string;
  quality?: number;
}

interface CompressImageResult {
  success: boolean;
  url?: string;
  path?: string;
  originalSize?: number;
  compressedSize?: number;
  compressionRatio?: string;
  error?: string;
}

/**
 * Comprime una imagen WebP y la sube a Supabase Storage
 * @param options - Opciones de compresión
 * @returns Resultado de la compresión con URL de la imagen
 */
export const compressAndUploadImage = async (
  options: CompressImageOptions
): Promise<CompressImageResult> => {
  try {
    const { imageUrl, imageBase64, bucket = 'manga-compressed', path, quality = 85 } = options;

    if (!imageUrl && !imageBase64) {
      throw new Error('Se debe proporcionar imageUrl o imageBase64');
    }

    console.log('Iniciando compresión de imagen:', path);

    const { data, error } = await supabase.functions.invoke('compress-webp', {
      body: {
        imageUrl,
        imageBase64,
        bucket,
        path,
        quality,
      },
    });

    if (error) {
      console.error('Error al comprimir imagen:', error);
      throw error;
    }

    console.log('Imagen comprimida exitosamente:', data);
    return data as CompressImageResult;
  } catch (error) {
    console.error('Error en compressAndUploadImage:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido al comprimir imagen',
    };
  }
};

/**
 * Comprime múltiples imágenes en paralelo
 * @param images - Array de opciones de compresión
 * @returns Array de resultados
 */
export const compressAndUploadMultiple = async (
  images: CompressImageOptions[]
): Promise<CompressImageResult[]> => {
  console.log(`Comprimiendo ${images.length} imágenes en paralelo...`);
  
  const results = await Promise.all(
    images.map(options => compressAndUploadImage(options))
  );

  const successful = results.filter(r => r.success).length;
  console.log(`${successful}/${images.length} imágenes comprimidas exitosamente`);

  return results;
};

/**
 * Convierte un File a base64
 * @param file - Archivo a convertir
 * @returns String base64
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Comprime una imagen desde un archivo
 * @param file - Archivo de imagen
 * @param path - Ruta donde guardar la imagen
 * @param quality - Calidad de compresión (0-100)
 * @returns Resultado de la compresión
 */
export const compressImageFile = async (
  file: File,
  path: string,
  quality: number = 85
): Promise<CompressImageResult> => {
  const base64 = await fileToBase64(file);
  return compressAndUploadImage({
    imageBase64: base64,
    path,
    quality,
  });
};
