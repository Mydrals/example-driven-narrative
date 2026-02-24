import { useState, useRef, useEffect } from "react";
import { ChevronRight, Layers, Check } from "lucide-react";
import EyeForward from "@/components/icons/EyeForward";
import type { ListStatus } from "@/hooks/useAnimeList";

interface StatusSelectorProps {
  listStatus: ListStatus | null;
  loading: boolean;
  onUpdateStatus: (status: ListStatus) => void;
  variant?: "desktop" | "mobile";
  expanded: boolean;
  onToggle: () => void;
}

const statusOptions: { id: ListStatus; label: string; icon: any }[] = [
  { id: "seguir-viendo", label: "Viendo", icon: EyeForward },
  { id: "por-ver", label: "Por ver", icon: Layers },
  { id: "completado", label: "Visto", icon: Check },
];

const getStatusLabel = (status: ListStatus | null) => {
  const found = statusOptions.find((o) => o.id === status);
  return found ? found.label : "Estado";
};

const StatusSelector = ({ listStatus, loading, onUpdateStatus, variant = "desktop", expanded, onToggle }: StatusSelectorProps) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [expanded, onToggle]);

  const isDesktop = variant === "desktop";
  const bgBase = isDesktop ? "bg-cr-black/50" : "bg-background";
  const hasActiveStatus = listStatus && listStatus !== "mi-lista";

  return (
    <div ref={containerRef} className="flex items-center gap-2">
      {/* Main toggle button */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        disabled={loading}
        className={`shrink-0 h-[40px] px-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
          hasActiveStatus
            ? "bg-foreground text-background"
            : "bg-muted text-foreground hover:bg-muted/80"
        } disabled:opacity-50`}
      >
        <span>{getStatusLabel(hasActiveStatus ? listStatus : null)}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {/* Status options - animated slide */}
      <div
        className={`flex items-center gap-1.5 transition-all duration-300 ease-in-out overflow-hidden ${
          expanded
            ? "max-w-[300px] opacity-100"
            : "max-w-0 opacity-0 pointer-events-none"
        }`}
      >
        {statusOptions.map((option) => {
          const Icon = option.icon;
          const isActive = listStatus === option.id;
          return (
            <button
              key={option.id}
              onClick={(e) => {
                e.stopPropagation();
                onUpdateStatus(option.id);
                onToggle();
              }}
              disabled={loading}
              className={`shrink-0 h-[40px] px-2.5 rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
                isActive
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground hover:bg-muted/80"
              } disabled:opacity-50`}
            >
              <Icon className="w-3.5 h-3.5" />
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StatusSelector;
