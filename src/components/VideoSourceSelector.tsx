import { type VideoSource } from "@/lib/videoSources";
import { useRef, useState, useCallback, useEffect } from "react";
import { ChevronRight } from "lucide-react";

interface VideoSourceSelectorProps {
  sources: VideoSource[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const VideoSourceSelector = ({ sources, activeIndex, onSelect }: VideoSourceSelectorProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const dragState = useRef({ isDown: false, startX: 0, scrollLeft: 0, moved: false });

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollRight(el.scrollWidth - el.scrollLeft - el.clientWidth > 4);
  }, []);

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, [checkScroll, sources]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    dragState.current = { isDown: true, startX: e.clientX, scrollLeft: el.scrollLeft, moved: false };
    el.setPointerCapture(e.pointerId);
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragState.current.isDown) return;
    const dx = e.clientX - dragState.current.startX;
    if (Math.abs(dx) > 3) dragState.current.moved = true;
    const el = scrollRef.current;
    if (el) el.scrollLeft = dragState.current.scrollLeft - dx;
  }, []);

  const onPointerUp = useCallback((e: React.PointerEvent) => {
    dragState.current.isDown = false;
    scrollRef.current?.releasePointerCapture(e.pointerId);
  }, []);

  if (sources.length === 0) return null;

  return (
    <div className="flex items-center relative">
      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className="flex items-center bg-card rounded-lg select-none whitespace-nowrap overflow-x-auto scrollbar-hide touch-pan-x cursor-grab active:cursor-grabbing"
      >
        {sources.map((source, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <div className="w-px h-5 bg-border" />}
            <button
              onClick={() => { if (!dragState.current.moved) onSelect(index); }}
              className={`flex items-center gap-1.5 px-4 py-2 transition-all duration-200 hover:bg-foreground/10 dark:hover:bg-foreground/20 active:scale-95 text-sm ${
                activeIndex === index
                  ? 'text-primary bg-primary/10 font-bold'
                  : 'text-foreground font-medium'
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 transition-transform duration-200 ${activeIndex === index ? 'scale-110' : ''}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polygon points="6 3 20 12 6 21 6 3" />
              </svg>
              <span>{source.title}</span>
            </button>
          </div>
        ))}
      </div>
      {/* Scroll hint arrow */}
      {canScrollRight && (
        <div className="flex items-center pl-1 text-muted-foreground animate-pulse pointer-events-none shrink-0">
          <ChevronRight className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};

export default VideoSourceSelector;
