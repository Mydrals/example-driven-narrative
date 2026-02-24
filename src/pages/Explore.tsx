import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import AnimeCard from "@/components/AnimeCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";

const Explore = () => {
  const navigate = useNavigate();
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const chipsRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [genreSearch, setGenreSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { data: animes, isLoading } = useQuery({
    queryKey: ["all-animes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const { data: featuredAnimes } = useQuery({
    queryKey: ["featured-animes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .eq("featured", true)
        .limit(6);
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Extract unique genres from all animes
  const genres = Array.from(
    new Set(
      (animes || []).flatMap((a) => a.genres || [])
    )
  ).sort();

  // Filter animes by selected genre
  const filteredAnimes = selectedGenre
    ? (animes || []).filter((a) => a.genres?.includes(selectedGenre))
    : animes || [];

  // Filtered genres for search popover
  const searchFilteredGenres = genres.filter((g) =>
    g.toLowerCase().includes(genreSearch.toLowerCase())
  );

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
  }, [genres.length]);

  const scrollChips = (direction: "left" | "right") => {
    const el = chipsRef.current;
    if (!el) return;
    el.scrollBy({ left: direction === "left" ? -200 : 200, behavior: "smooth" });
  };

  // Grid: show max 2 rows. We need to figure out items per row based on the grid columns.
  // We'll use a fixed visible count and let CSS grid handle the rest.
  const ITEMS_PER_ROW_APPROX = 6; // approximate max columns
  const MAX_VISIBLE = ITEMS_PER_ROW_APPROX * 2;
  const visibleAnimes = filteredAnimes.slice(0, MAX_VISIBLE);
  const hasMore = filteredAnimes.length > MAX_VISIBLE;

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

  const featuredList = featuredAnimes || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <h1 className="sr-only">Explorar Animes - Nagaro</h1>
        <HeroCarousel animes={featuredList} />

        {/* Genre Chips */}
        <div className="relative px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)] pt-6 max-[500px]:pt-3 pb-2">
          <h2 className="text-xl md:text-2xl font-bold text-foreground mb-2">Por géneros</h2>
          <div className="relative">
            {/* Left fade + arrow */}
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
              {/* Inline expanding search */}
              <div className="shrink-0 flex items-center relative">
                <button
                  onClick={() => {
                    const next = !searchOpen;
                    setSearchOpen(next);
                    if (next) {
                      setTimeout(() => searchInputRef.current?.focus(), 150);
                    } else {
                      setGenreSearch("");
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap bg-muted text-foreground hover:bg-muted/80"
                >
                  <Search className="w-4 h-4" strokeWidth={2.5} />
                </button>

                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    searchOpen ? "max-w-[200px] sm:max-w-[260px] opacity-100 ml-2" : "max-w-0 opacity-0 ml-0"
                  }`}
                >
                  <div className="relative">
                    <input
                      ref={searchInputRef}
                      value={genreSearch}
                      onChange={(e) => setGenreSearch(e.target.value)}
                      placeholder="Buscar género..."
                      className="w-[180px] sm:w-[240px] h-8 px-3 pr-8 rounded-lg text-sm bg-muted text-foreground placeholder:text-muted-foreground border-none outline-none focus:ring-1 focus:ring-primary/50"
                    />
                    {genreSearch && (
                      <button
                        onClick={() => { setGenreSearch(""); searchInputRef.current?.focus(); }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Dropdown results */}
                {searchOpen && genreSearch && searchFilteredGenres.length > 0 && (
                  <div className="absolute left-0 top-full mt-2 z-50 w-64 bg-popover border border-border rounded-lg shadow-lg max-h-52 overflow-y-auto">
                    {searchFilteredGenres.map((genre) => (
                      <button
                        key={genre}
                        onClick={() => {
                          setSelectedGenre(genre);
                          setSearchOpen(false);
                          setGenreSearch("");
                        }}
                        className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                          selectedGenre === genre
                            ? "bg-foreground text-background font-medium"
                            : "text-foreground hover:bg-muted"
                        }`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* "Todos" chip */}
              <button
                onClick={() => setSelectedGenre(null)}
                className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  selectedGenre === null
                    ? "bg-foreground text-background"
                    : "bg-muted text-foreground hover:bg-muted/80"
                }`}
              >
                Todos
              </button>
              {genres.map((genre) => (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre === selectedGenre ? null : genre)}
                  className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                    selectedGenre === genre
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Right fade + arrow */}
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

        {/* Anime Grid */}
        <section className="pt-0 pb-6 max-[500px]:pb-1">
          <div className="flex items-end justify-between mb-3 px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)]">
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              {selectedGenre || "Todos los animes"}
            </h2>
            {hasMore && (
              <button 
                onClick={() => navigate(selectedGenre ? `/todos-los-animes?genre=${encodeURIComponent(selectedGenre)}` : "/todos-los-animes")}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors text-sm font-medium uppercase"
              >
                Ver más
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-2 md:gap-3 3xl:gap-4 px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)]">
            {visibleAnimes.map((anime) => (
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
        </section>

        <div className="h-24"></div>
      </main>
    </div>
  );
};

export default Explore;
