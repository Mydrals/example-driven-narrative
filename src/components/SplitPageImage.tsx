import { useEffect, useRef, useState } from "react";

interface SplitPageImageProps {
  src: string;
  alt: string;
  onError: () => void;
  currentSide: "right" | "left";
}

export const SplitPageImage = ({ src, alt, onError, currentSide }: SplitPageImageProps) => {
  const [leftPageUrl, setLeftPageUrl] = useState<string>("");
  const [rightPageUrl, setRightPageUrl] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsLoading(true);
    setLeftPageUrl("");
    setRightPageUrl("");
    
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      
      if (!ctx) {
        onError();
        return;
      }

      const width = img.width;
      const height = img.height;
      const halfWidth = width / 2;

      // Create right half (primera página en lectura RTL)
      canvas.width = halfWidth;
      canvas.height = height;
      ctx.drawImage(img, halfWidth, 0, halfWidth, height, 0, 0, halfWidth, height);
      const rightHalf = canvas.toDataURL("image/jpeg", 0.85);

      // Create left half (segunda página en lectura RTL)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, halfWidth, height, 0, 0, halfWidth, height);
      const leftHalf = canvas.toDataURL("image/jpeg", 0.85);

      setRightPageUrl(rightHalf);
      setLeftPageUrl(leftHalf);
      setIsLoading(false);
    };

    img.onerror = () => {
      onError();
    };

    img.src = src;
  }, [src, onError]);


  if (isLoading || !leftPageUrl || !rightPageUrl) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-white">Cargando...</p>
      </div>
    );
  }

  return (
    <img
      ref={imgRef}
      src={currentSide === "right" ? rightPageUrl : leftPageUrl}
      alt={alt}
      className="max-h-full w-auto object-contain"
      loading="eager"
    />
  );
};
