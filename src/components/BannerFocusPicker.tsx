import { useState, useRef, useCallback } from "react";
import { getProxiedImageUrl } from "@/lib/imageProxy";

interface BannerFocusPickerProps {
  bannerUrl: string;
  value: string; // "50% 50%" or legacy "left"/"center"/"right"
  onChange: (value: string) => void;
}

// Convert legacy values to percentages (object-position %)
const parseFocusValue = (value: string): { x: number; y: number } => {
  if (value === "left") return { x: 0, y: 50 };
  if (value === "center") return { x: 50, y: 50 };
  if (value === "right") return { x: 100, y: 50 };
  
  const match = value.match(/^([\d.]+)%\s+([\d.]+)%$/);
  if (match) {
    return { x: parseFloat(match[1]), y: parseFloat(match[2]) };
  }
  return { x: 50, y: 50 };
};

/**
 * CSS object-position % maps the overflow, not absolute position.
 * For a 16:9 image in a 3:4 container (object-fit: cover):
 * - Image is scaled by height → only horizontal overflow
 * - frameRatio = fw / containerW (frame width as fraction of picker)
 * 
 * object-position P% → frame center cx = P/100 * (1 - r) + r/2
 * frame center cx → object-position P = (cx - r/2) / (1 - r) * 100
 */

const BannerFocusPicker = ({ bannerUrl, value, onChange }: BannerFocusPickerProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const focus = parseFocusValue(value);

  // Frame ratio: for 16:9 container with 3:4 frame at full height
  // fw = containerH * 3/4, containerH = containerW * 9/16
  // r = fw / containerW = (containerW * 9/16 * 3/4) / containerW = 27/64
  const R = 27 / 64; // ≈ 0.421875

  // Convert object-position % → frame center (fraction of container)
  const objPosToCenter = (p: number) => (p / 100) * (1 - R) + R / 2;
  // Convert frame center → object-position %
  const centerToObjPos = (cx: number) => Math.round(((cx - R / 2) / (1 - R)) * 100);

  const updatePosition = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const fw = rect.width * R;
    const halfW = fw / 2;

    const rawX = clientX - rect.left;
    const clampedX = Math.max(halfW, Math.min(rawX, rect.width - halfW));
    const cx = clampedX / rect.width;

    const xPct = Math.max(0, Math.min(100, centerToObjPos(cx)));
    onChange(`${xPct}% 50%`);
  }, [onChange]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    updatePosition(e.clientX);
  }, [updatePosition]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging) return;
    updatePosition(e.clientX);
  }, [dragging, updatePosition]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const containerW = containerRef.current?.clientWidth || 1;
  const containerH = containerRef.current?.clientHeight || 1;
  const fw = containerH * (3 / 4);
  const fh = containerH;

  // Frame center X from object-position value
  const centerX = objPosToCenter(focus.x);
  const frameLeft = centerX * containerW - fw / 2;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        Arrastra el recuadro para elegir qué parte del banner se muestra en móviles (3:4).
      </p>
      <div
        ref={containerRef}
        className="relative w-full rounded-lg overflow-hidden border border-border/50 bg-muted/30 cursor-crosshair select-none touch-none"
        style={{ aspectRatio: "16/9" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <img
          src={getProxiedImageUrl(bannerUrl)}
          alt="Banner"
          className="w-full h-full object-cover pointer-events-none"
          onLoad={() => setImgLoaded(true)}
          draggable={false}
        />
        {/* Dark overlay + clear frame via box-shadow */}
        {imgLoaded && (
          <div
            className="absolute border-2 border-primary rounded-sm pointer-events-none"
            style={{
              width: `${fw}px`,
              height: `${fh}px`,
              left: `${frameLeft}px`,
              top: 0,
              background: 'transparent',
              boxShadow: `0 0 0 9999px rgba(0,0,0,0.55)`,
            }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 border border-primary/80 rounded-full" />
            </div>
          </div>
        )}
      </div>
      {/* Preview */}
      <div className="flex gap-3 items-start">
        <div className="rounded-lg overflow-hidden border border-border/50 bg-muted/30 w-32 h-44 flex-shrink-0">
          <img
            src={getProxiedImageUrl(bannerUrl)}
            alt="Mobile preview"
            className="w-full h-full object-cover"
            style={{ objectPosition: `${focus.x}% ${focus.y}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground mt-1">
          Vista previa móvil<br />
          Enfoque: {focus.x}%
        </span>
      </div>
    </div>
  );
};

export default BannerFocusPicker;
