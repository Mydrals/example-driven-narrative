import Header from "@/components/Header";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ALLOWED_GENRES } from "@/lib/genreNormalizer";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import {
  Sword, Mountain, Laugh, Theater, Wand2, Music, Heart, Rocket,
  BookOpen, Flower2, Shield, Users, Dumbbell, Ghost, AlertTriangle,
  Flame, HeartHandshake, Skull, GraduationCap, Globe
} from "lucide-react";

const GENRE_ICONS: Record<string, React.ReactNode> = {
  "Acción": <Sword className="w-6 h-6" />,
  "Aventura": <Mountain className="w-6 h-6" />,
  "Comedia": <Laugh className="w-6 h-6" />,
  "Drama": <Theater className="w-6 h-6" />,
  "Fantasía": <Wand2 className="w-6 h-6" />,
  "Musical": <Music className="w-6 h-6" />,
  "Romance": <Heart className="w-6 h-6" />,
  "Ciencia Ficción": <Rocket className="w-6 h-6" />,
  "Seinen": <BookOpen className="w-6 h-6" />,
  "Shoujo": <Flower2 className="w-6 h-6" />,
  "Shounen": <Shield className="w-6 h-6" />,
  "Josei": <Users className="w-6 h-6" />,
  "Recuentos de la Vida": <HeartHandshake className="w-6 h-6" />,
  "Deportes": <Dumbbell className="w-6 h-6" />,
  "Sobrenatural": <Ghost className="w-6 h-6" />,
  "Thriller": <AlertTriangle className="w-6 h-6" />,
  "Ecchi": <Flame className="w-6 h-6" />,
  "Harem": <Users className="w-6 h-6" />,
  "Terror": <Skull className="w-6 h-6" />,
  "Colegial": <GraduationCap className="w-6 h-6" />,
  "Isekai": <Globe className="w-6 h-6" />,
};

const Genres = () => {
  const navigate = useNavigate();

  // Fetch one anime per genre for background images
  const { data: animes } = useQuery({
    queryKey: ["genre-covers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("poster_url, genres")
        .not("poster_url", "is", null);
      if (error) throw error;
      return data || [];
    },
    staleTime: 60000,
  });

  // Map each genre to a representative anime poster
  const genreCovers: Record<string, string> = {};
  if (animes) {
    for (const genre of ALLOWED_GENRES) {
      const match = animes.find((a) => a.genres?.includes(genre) && a.poster_url);
      if (match) genreCovers[genre] = match.poster_url!;
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)] pt-20 pb-28">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-5">Géneros de Anime</h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {ALLOWED_GENRES.map((genre) => {
            const cover = genreCovers[genre];
            return (
              <button
                key={genre}
                onClick={() => navigate(`/todos-los-animes?genre=${encodeURIComponent(genre)}`)}
                className="relative aspect-[16/9] rounded-lg overflow-hidden group cursor-pointer"
              >
                {/* Background image */}
                {cover ? (
                  <img
                    src={getProxiedImageUrl(cover)}
                    alt={genre}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 [@media(hover:hover)]:group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="absolute inset-0 bg-muted" />
                )}

                {/* Dark overlay */}
                <div className="absolute inset-0 bg-black/50 [@media(hover:hover)]:group-hover:bg-black/40 transition-colors" />

                {/* Icon + Label */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-white z-10">
                  {GENRE_ICONS[genre]}
                  <span className="font-bold text-sm md:text-base uppercase tracking-wide text-center leading-tight px-2">
                    {genre}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default Genres;
