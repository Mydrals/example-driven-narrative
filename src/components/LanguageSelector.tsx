import { useState, useRef, useEffect } from "react";
import { type VideoSource, getLanguageLabel, getLanguageShortLabel } from "@/lib/videoSources";
import { ChevronRight } from "lucide-react";

interface LanguageSelectorProps {
  sources: VideoSource[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

const LanguageSelector = ({ sources, activeIndex, onSelect }: LanguageSelectorProps) => {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const languages = Array.from(new Set(sources.map(s => s.language).filter(Boolean))) as string[];
  const currentLang = sources[activeIndex]?.language;

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [expanded]);

  if (!currentLang && languages.length === 0) return null;

  const hasMultiple = languages.length > 1;

  return (
    <div ref={containerRef} className="relative select-none">
      {/* Compact button: icon + current label + ">" */}
      <button
        onClick={() => { if (hasMultiple) setExpanded(prev => !prev); }}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg bg-card transition-colors text-sm font-bold ${
          hasMultiple ? 'hover:bg-card/80 cursor-pointer' : 'cursor-default'
        } text-primary`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 8 6 6" /><path d="m4 14 6-6 2-3" /><path d="M2 5h12" /><path d="M7 2h1" /><path d="m22 22-5-10-5 10" /><path d="M14 18h6" />
        </svg>
        <span>{currentLang ? getLanguageShortLabel(currentLang) : ""}</span>
        {hasMultiple && (
          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`} />
        )}
      </button>

      {/* Dropdown */}
      {expanded && hasMultiple && (
        <div className="absolute top-full left-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[140px] overflow-hidden">
          {languages.map((lang) => {
            const isActive = sources[activeIndex]?.language === lang;
            const sourceIndex = sources.findIndex(s => s.language === lang);
            return (
              <button
                key={lang}
                onClick={() => {
                  if (sourceIndex >= 0) onSelect(sourceIndex);
                  setExpanded(false);
                }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  isActive ? 'text-primary bg-primary/10 font-bold' : 'text-foreground hover:bg-foreground/10'
                }`}
              >
                {getLanguageLabel(lang)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LanguageSelector;
