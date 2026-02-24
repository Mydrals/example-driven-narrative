import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { compressImageFile, compressAndUploadImage } from "@/lib/imageCompression";
import { Loader2, Upload, Link2 } from "lucide-react";

interface ImageCompressorProps {
  onUploadComplete?: (url: string) => void;
  bucket?: string;
  basePath?: string;
}

export const ImageCompressor = ({ 
  onUploadComplete, 
  bucket = "manga-compressed",
  basePath = ""
}: ImageCompressorProps) => {
  const [isCompressing, setIsCompressing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState("");
  const { toast } = useToast();

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Error",
        description: "Por favor selecciona un archivo de imagen válido",
        variant: "destructive",
      });
      return;
    }

    setIsCompressing(true);
    setProgress(10);

    try {
      const fileName = `${basePath}${Date.now()}-${file.name.replace(/\.[^/.]+$/, '')}.webp`;
      
      setProgress(30);
      const result = await compressImageFile(file, fileName, 85);
      setProgress(70);

      if (result.success && result.url) {
        toast({
          title: "¡Imagen comprimida exitosamente!",
          description: `Tamaño original: ${(result.originalSize! / 1024).toFixed(2)} KB
Tamaño comprimido: ${(result.compressedSize! / 1024).toFixed(2)} KB
Reducción: ${result.compressionRatio}`,
        });
        
        setProgress(100);
        onUploadComplete?.(result.url);
      } else {
        throw new Error(result.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error al comprimir imagen:", error);
      toast({
        title: "Error al comprimir imagen",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsCompressing(false);
      setProgress(0);
    }
  };

  const handleUrlCompression = async () => {
    if (!imageUrl) {
      toast({
        title: "Error",
        description: "Por favor ingresa una URL válida",
        variant: "destructive",
      });
      return;
    }

    setIsCompressing(true);
    setProgress(10);

    try {
      const fileName = `${basePath}${Date.now()}-compressed.webp`;
      
      setProgress(30);
      const result = await compressAndUploadImage({
        imageUrl,
        path: fileName,
        bucket,
        quality: 85,
      });
      setProgress(70);

      if (result.success && result.url) {
        toast({
          title: "¡Imagen comprimida exitosamente!",
          description: `Tamaño original: ${(result.originalSize! / 1024).toFixed(2)} KB
Tamaño comprimido: ${(result.compressedSize! / 1024).toFixed(2)} KB
Reducción: ${result.compressionRatio}`,
        });
        
        setProgress(100);
        onUploadComplete?.(result.url);
        setImageUrl("");
      } else {
        throw new Error(result.error || "Error desconocido");
      }
    } catch (error) {
      console.error("Error al comprimir imagen:", error);
      toast({
        title: "Error al comprimir imagen",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsCompressing(false);
      setProgress(0);
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <h3 className="text-lg font-semibold">Compresión de Imágenes WebP</h3>
      
      <div className="space-y-2">
        <label className="text-sm font-medium">Subir archivo</label>
        <div className="flex gap-2">
          <Input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            disabled={isCompressing}
            className="flex-1"
          />
          <Button disabled={isCompressing} variant="outline" size="icon">
            {isCompressing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-muted-foreground">O</span>
        <div className="h-px bg-border flex-1" />
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Desde URL</label>
        <div className="flex gap-2">
          <Input
            type="url"
            placeholder="https://ejemplo.com/imagen.jpg"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            disabled={isCompressing}
            className="flex-1"
          />
          <Button 
            onClick={handleUrlCompression}
            disabled={isCompressing || !imageUrl}
            variant="outline"
            size="icon"
          >
            {isCompressing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Link2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {isCompressing && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-muted-foreground text-center">
            Comprimiendo imagen... {progress}%
          </p>
        </div>
      )}
    </div>
  );
};
