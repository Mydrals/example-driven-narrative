import Header from "@/components/Header";
import AnimeCard from "@/components/AnimeCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useRef, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, ChevronLeft, ChevronRight, Filter, X } from "lucide-react";

const GENRES_LIST = [
  "Acción", "Aventura", "Comedia", "Drama", "Fantasía", "Romance",
  "Sci-Fi", "Slice of Life", "Sobrenatural", "Suspenso", "Terror",
  "Deportes", "Misterio", "Mecha", "Musical", "Psicológico",
  "Seinen", "Shounen", "Shoujo", "Josei", "Isekai", "Ecchi", "Harem"
];

const STATUS_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "en_emision", label: "En emisión" },
  { id: "finalizado", label: "Finalizado" },
];

const LANGUAGE_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "SUB", label: "Subtitulado" },
  { id: "LAT", label: "Latino" },
];

const FORMAT_OPTIONS = [
  { id: "all", label: "Todos" },
  { id: "serie", label: "Serie" },
  { id: "pelicula", label: "Película" },
];

/** Expandable chip filter (StatusSelector style) */
const ChipFilter = ({
  label,
  value,
  options,
  onChange,
  expanded,
  onToggle,
}: {
  label: string;
  value: string;
  options: { id: string; label: string }[];
  onChange: (id: string) => void;
  expanded: boolean;
  onToggle: () => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [expanded, onToggle]);

  const activeLabel = options.find((o) => o.id === value)?.label ?? label;
  const isActive = value !== "all";

  return (
    <div ref={ref} className={`flex items-center gap-2 transition-all duration-300 ${
      !expanded ? "" : ""
    }`}>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle(); }}
        className={`shrink-0 h-[36px] px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
          isActive
            ? "bg-foreground text-background"
            : "bg-muted text-foreground [@media(hover:hover)]:hover:bg-muted/80"
        }`}
      >
        <span>{isActive ? activeLabel : label}</span>
        <ChevronRight
          className={`w-3.5 h-3.5 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`flex items-center gap-1.5 transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? "max-w-[400px] opacity-100" : "max-w-0 opacity-0 pointer-events-none"
        }`}
      >
        {options.map((o) => (
          <button
            key={o.id}
            onClick={(e) => {
              e.stopPropagation();
              onChange(o.id);
              onToggle();
            }}
            className={`shrink-0 h-[36px] px-3 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              value === o.id
                ? "bg-foreground text-background"
                : "bg-muted text-foreground [@media(hover:hover)]:hover:bg-muted/80"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
};

const AllAnimes = () => {
  const [searchParams] = useSearchParams();
  const initialGenre = searchParams.get("genre") || "";

  const [selectedGenre, setSelectedGenre] = useState(initialGenre);
  const [status, setStatus] = useState("all");
  const [language, setLanguage] = useState("all");
  const [format, setFormat] = useState("all");
  const [showFilters, setShowFilters] = useState(true);
  const [expandedFilter, setExpandedFilter] = useState<string | null>(null);

  // Genre chips scroll
  const chipsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const { data: animes, isLoading } = useQuery({
    queryKey: ["all-animes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .order("title", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const dbGenres = useMemo(() => {
    return Array.from(
      new Set((animes || []).flatMap((a) => a.genres || []))
    ).sort();
  }, [animes]);

  const allGenres = useMemo(() => {
    const merged = new Set([...GENRES_LIST, ...dbGenres]);
    return Array.from(merged).sort();
  }, [dbGenres]);

  const filteredAnimes = useMemo(() => {
    let list = animes || [];
    if (selectedGenre) {
      list = list.filter((a) => a.genres?.includes(selectedGenre));
    }
    if (language !== "all") {
      list = list.filter((a) => a.language === language);
    }
    return list;
  }, [animes, selectedGenre, language, status, format]);

  const clearFilters = () => {
    setSelectedGenre("");
    setStatus("all");
    setLanguage("all");
    setFormat("all");
  };

  const hasActiveFilters = selectedGenre || status !== "all" || language !== "all" || format !== "all";

  // Chips scroll logic
  const updateScrollButtons = () => {
    const el = chipsRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  };

  useEffect(() => {
    updateScrollButtons();
    const el = chipsRef.current;
    if (el) {
      el.addEventListener("scroll", updateScrollButtons);
      window.addEventListener("resize", updateScrollButtons);
    }
    return () => {
      el?.removeEventListener("scroll", updateScrollButtons);
      window.removeEventListener("resize", updateScrollButtons);
    };
  }, [allGenres.length]);

  const scrollChips = (dir: "left" | "right") => {
    chipsRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-[calc(56px+env(safe-area-inset-top))]">
        <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)] pt-6 pb-2">
          {/* Title + filter toggle */}
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">Todos los animes</h1>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <Filter className="w-4 h-4" />
              Filtros
              <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Filters */}
          {showFilters && (
            <div className="space-y-4 mb-5">
              {/* Genre chips - horizontal scroll like Explore */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Género</label>
                <div className="relative">
                  {canScrollLeft && (
                    <div
                      className="absolute left-0 top-0 bottom-0 z-10 flex items-center pr-2 cursor-pointer"
                      style={{ background: "linear-gradient(to right, hsl(var(--background)) 60%, transparent)" }}
                      onClick={() => scrollChips("left")}
                    >
                      <ChevronLeft className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}

                  <div
                    ref={chipsRef}
                    className="flex gap-2.5 overflow-x-auto scrollbar-hide"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
                  >
                    <button
                      onClick={() => setSelectedGenre("")}
                      className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                        selectedGenre === ""
                          ? "bg-foreground text-background"
                          : "bg-muted text-foreground [@media(hover:hover)]:hover:bg-muted/80"
                      }`}
                    >
                      Todos
                    </button>
                    {allGenres.map((g) => (
                      <button
                        key={g}
                        onClick={() => setSelectedGenre(g === selectedGenre ? "" : g)}
                        className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                          selectedGenre === g
                            ? "bg-foreground text-background"
                            : "bg-muted text-foreground [@media(hover:hover)]:hover:bg-muted/80"
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>

                  {canScrollRight && (
                    <div
                      className="absolute right-0 top-0 bottom-0 z-10 flex items-center pl-2 cursor-pointer"
                      style={{ background: "linear-gradient(to left, hsl(var(--background)) 60%, transparent)" }}
                      onClick={() => scrollChips("right")}
                    >
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>

              {/* Expandable chip filters */}
              <div className="flex items-center gap-3">
                {(!expandedFilter || expandedFilter === "language") && (
                  <ChipFilter label="Idioma" value={language} options={LANGUAGE_OPTIONS} onChange={setLanguage} expanded={expandedFilter === "language"} onToggle={() => setExpandedFilter(expandedFilter === "language" ? null : "language")} />
                )}
                {(!expandedFilter || expandedFilter === "status") && (
                  <ChipFilter label="Estado" value={status} options={STATUS_OPTIONS} onChange={setStatus} expanded={expandedFilter === "status"} onToggle={() => setExpandedFilter(expandedFilter === "status" ? null : "status")} />
                )}
                {(!expandedFilter || expandedFilter === "format") && (
                  <ChipFilter label="Formato" value={format} options={FORMAT_OPTIONS} onChange={setFormat} expanded={expandedFilter === "format"} onToggle={() => setExpandedFilter(expandedFilter === "format" ? null : "format")} />
                )}

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 h-[36px] px-3 rounded-lg text-sm font-medium text-muted-foreground [@media(hover:hover)]:hover:text-foreground [@media(hover:hover)]:hover:bg-muted transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Limpiar
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Results count */}
          <p className="text-sm text-muted-foreground mb-3">
            {filteredAnimes.length} {filteredAnimes.length === 1 ? "anime" : "animes"}
          </p>
        </div>

        {/* Anime Grid */}
        <section className="pb-6 max-[500px]:pb-1">
          <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-2 md:gap-3 3xl:gap-4 px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)]">
            {filteredAnimes.map((anime) => (
              <AnimeCard
                key={anime.id}
                id={anime.id}
                slug={anime.slug}
                title={anime.title}
                image={anime.poster_url || ""}
                language={anime.language || ""}
              />
            ))}
          </div>
          {filteredAnimes.length === 0 && (
            <div className="text-center py-16">
              <p className="text-muted-foreground text-lg">No se encontraron animes con estos filtros</p>
            </div>
          )}
        </section>

        <div className="h-24"></div>
      </main>
    </div>
  );
};

export default AllAnimes;
