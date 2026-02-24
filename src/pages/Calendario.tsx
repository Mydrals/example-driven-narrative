import Header from "@/components/Header";
import AnimeCard from "@/components/AnimeCard";
import WeeklyCarousel from "@/components/WeeklyCarousel";
import AnimeSection from "@/components/AnimeSection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMemo, useState } from "react";

const DAYS = [
  { id: 0, label: "Lunes", short: "LUN" },
  { id: 1, label: "Martes", short: "MAR" },
  { id: 2, label: "Miércoles", short: "MIÉ" },
  { id: 3, label: "Jueves", short: "JUE" },
  { id: 4, label: "Viernes", short: "VIE" },
  { id: 5, label: "Sábado", short: "SÁB" },
  { id: 6, label: "Domingo", short: "DOM" },
];

const Calendario = () => {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const { data: animes, isLoading } = useQuery({
    queryKey: ["calendar-animes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .not("broadcast_day", "is", null)
        .order("title", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  // Group by day
  const animesByDay = useMemo(() => {
    const map = new Map<number, typeof animes>();
    DAYS.forEach((d) => map.set(d.id, []));
    (animes || []).forEach((anime: any) => {
      if (anime.broadcast_day !== null && anime.broadcast_day !== undefined) {
        const list = map.get(anime.broadcast_day) || [];
        list.push(anime);
        map.set(anime.broadcast_day, list);
      }
    });
    return map;
  }, [animes]);

  // Get today's day (0=Mon ... 6=Sun)
  const todayIndex = useMemo(() => {
    const jsDay = new Date().getDay(); // 0=Sun
    return jsDay === 0 ? 6 : jsDay - 1;
  }, []);

  // Weekly carousel: pick one anime per day for the hero section
  const weeklyHighlights = useMemo(() => {
    return DAYS.map((d) => {
      const dayAnimes = animesByDay.get(d.id) || [];
      return dayAnimes[0] || null;
    }).filter(Boolean);
  }, [animesByDay]);

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
        {/* Title */}
        <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)] pt-6 pb-2">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">Calendario</h1>
          <p className="text-muted-foreground text-sm mt-1">Programación semanal de emisión</p>
        </div>

        {/* Day filter chips */}
        <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)] mb-4">
          <div
            className="flex gap-2 overflow-x-auto scrollbar-hide"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            <button
              onClick={() => setSelectedDay(null)}
              className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                selectedDay === null
                  ? "bg-foreground text-background"
                  : "bg-muted text-foreground [@media(hover:hover)]:hover:bg-muted/80"
              }`}
            >
              Todos
            </button>
            {DAYS.map((d) => {
              const count = (animesByDay.get(d.id) || []).length;
              const isToday = d.id === todayIndex;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDay(selectedDay === d.id ? null : d.id)}
                  className={`shrink-0 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                    selectedDay === d.id
                      ? "bg-foreground text-background"
                      : isToday
                        ? "bg-primary/20 text-primary [@media(hover:hover)]:hover:bg-primary/30"
                        : "bg-muted text-foreground [@media(hover:hover)]:hover:bg-muted/80"
                  }`}
                >
                  {d.label}
                  {count > 0 && (
                    <span className={`text-xs ${
                      selectedDay === d.id ? "text-background/60" : "text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Weekly Carousel - only when showing all days */}
        {selectedDay === null && weeklyHighlights.length > 0 && (
          <WeeklyCarousel title="Imprescindibles de la semana">
            {weeklyHighlights.map((anime: any) => (
              <AnimeCard
                key={anime.id}
                id={anime.id}
                slug={anime.slug}
                title={anime.title}
                image={anime.poster_url || ""}
                language={anime.language || ""}
                hideInfo={true}
              />
            ))}
          </WeeklyCarousel>
        )}

        {/* Day sections */}
        {selectedDay === null ? (
          // Show all days
          DAYS.map((d) => {
            const dayAnimes = animesByDay.get(d.id) || [];
            if (dayAnimes.length === 0) return null;
            const isToday = d.id === todayIndex;
            return (
              <AnimeSection
                key={d.id}
                title={`${d.label}${isToday ? " — Hoy" : ""}`}
              >
                {dayAnimes.map((anime: any) => (
                  <div
                    key={anime.id}
                    className="w-[calc((100vw-54px)/2.25)] xs:w-[calc((100vw-60px)/3.25)] md:w-[calc((100vw-80px)/4.25)] lg:w-[calc((100vw-100px)/5.5)] xl:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/5.25)] 3xl:w-[calc((100vw-156px)/6.25)]"
                  >
                    <AnimeCard
                      id={anime.id}
                      slug={anime.slug}
                      title={anime.title}
                      image={anime.poster_url || ""}
                      language={anime.language || ""}
                    />
                  </div>
                ))}
              </AnimeSection>
            );
          })
        ) : (
          // Show filtered day as grid
          (() => {
            const dayAnimes = animesByDay.get(selectedDay) || [];
            const dayLabel = DAYS.find((d) => d.id === selectedDay)?.label || "";
            const isToday = selectedDay === todayIndex;
            return (
              <>
                <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)] mb-1.5">
                  <h2 className="text-xl md:text-2xl font-bold text-foreground">
                    {dayLabel}{isToday ? " — Hoy" : ""}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {dayAnimes.length} {dayAnimes.length === 1 ? "anime" : "animes"}
                  </p>
                </div>
                <section className="pb-6 max-[500px]:pb-1">
                  <div className="grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-6 gap-2 md:gap-3 3xl:gap-4 px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)]">
                    {dayAnimes.map((anime: any) => (
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
                  {dayAnimes.length === 0 && (
                    <div className="text-center py-16">
                      <p className="text-muted-foreground text-lg">No hay animes programados para este día</p>
                    </div>
                  )}
                </section>
              </>
            );
          })()
        )}

        <div className="h-24"></div>
      </main>
    </div>
  );
};

export default Calendario;
