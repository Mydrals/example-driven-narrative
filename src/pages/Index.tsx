import Header from "@/components/Header";
import HeroCarousel from "@/components/HeroCarousel";
import AnimeSection from "@/components/AnimeSection";
import AnimeCard from "@/components/AnimeCard";
import EpisodeCard from "@/components/EpisodeCard";
import CollectionSection from "@/components/CollectionSection";
import WeeklyCarousel from "@/components/WeeklyCarousel";
import AdBlockRecommendation from "@/components/AdBlockRecommendation";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const { data: animes, isLoading, error } = useQuery({
    queryKey: ["animes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    retry: 2,
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
    retry: 2,
    staleTime: 30000,
  });

  const { data: episodes } = useQuery({
    queryKey: ["recent-episodes"],
    queryFn: async () => {
      const { data: episodesData, error: episodesError } = await supabase
        .from("episodes")
        .select(`
          *,
          animes (
            title,
            slug
          )
        `)
        .order("created_at", { ascending: false })
        .limit(8);
      
      if (episodesError) throw episodesError;
      return episodesData || [];
    },
    retry: 2,
    staleTime: 30000,
  });

  const { data: newAnimes2025 } = useQuery({
    queryKey: ["new-animes-2025"],
    queryFn: async () => {
      // Get all animes with their latest episode date
      const { data: episodesData, error: episodesError } = await supabase
        .from("episodes")
        .select(`
          anime_id,
          original_release_date,
          animes (
            id,
            title,
            slug,
            poster_url,
            language
          )
        `)
        .not("original_release_date", "is", null)
        .order("original_release_date", { ascending: false });
      
      if (episodesError) throw episodesError;

      // Group by anime and get the most recent episode date for each
      const animeMap = new Map();
      episodesData?.forEach((episode: any) => {
        if (episode.animes && !animeMap.has(episode.anime_id)) {
          animeMap.set(episode.anime_id, {
            ...episode.animes,
            latest_episode_date: episode.original_release_date
          });
        }
      });

      return Array.from(animeMap.values());
    },
    retry: 2,
    staleTime: 30000,
  });

  // Query for top liked episodes
  const { data: topEpisodes } = useQuery({
    queryKey: ["top-liked-episodes"],
    queryFn: async () => {
      // Get episodes with like counts
      const { data: likesData, error: likesError } = await supabase
        .from("episode_likes")
        .select(`
          episode_id,
          vote_type,
          episodes (
            id,
            title,
            episode_number,
            season_number,
            thumbnail_url,
            duration,
            anime_id,
            animes (
              title,
              slug
            )
          )
        `)
        .eq("vote_type", "like");
      
      if (likesError) throw likesError;
      
      // Count likes per episode
      const episodeLikesMap = new Map();
      likesData?.forEach((like: any) => {
        if (like.episodes) {
          const count = episodeLikesMap.get(like.episode_id) || 0;
          episodeLikesMap.set(like.episode_id, count + 1);
        }
      });
      
      // Get unique episodes and sort by likes
      const uniqueEpisodes = Array.from(
        new Map(
          likesData
            ?.filter((like: any) => like.episodes)
            .map((like: any) => [like.episode_id, like.episodes])
        ).values()
      );
      
      // Sort by like count
      return uniqueEpisodes
        .map((episode: any) => ({
          ...episode,
          likeCount: episodeLikesMap.get(episode.id) || 0,
        }))
        .sort((a: any, b: any) => b.likeCount - a.likeCount)
        .slice(0, 8);
    },
    retry: 2,
    staleTime: 30000,
  });

  // Query for mangas
  const { data: mangas } = useQuery({
    queryKey: ["mangas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mangas")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data || [];
    },
    retry: 2,
    staleTime: 30000,
  });

  // Query for Junji Ito Collection (animes + mangas)
  const { data: junjiItoCollection } = useQuery({
    queryKey: ["junji-ito-collection"],
    queryFn: async () => {
      // Get animes
      const { data: animesData, error: animesError } = await supabase
        .from("animes")
        .select("*")
        .in("slug", ["uzumaki", "junji-ito-maniac-relatos-japoneses-de-lo-macabro"]);
      
      if (animesError) throw animesError;

      // Get mangas
      const { data: mangasData, error: mangasError } = await supabase
        .from("mangas")
        .select("*")
        .eq("slug", "junji-ito-coleccion-masterpiece");
      
      if (mangasError) throw mangasError;

      // Combine both and add isManga flag
      const combined = [
        ...(animesData || []).map(item => ({ ...item, isManga: false })),
        ...(mangasData || []).map(item => ({ ...item, isManga: true, language: "" }))
      ];

      return combined;
    },
    retry: 2,
    staleTime: 30000,
  });

  // Query for continue watching - only for logged in users
  const { data: continueWatching } = useQuery({
    queryKey: ["continue-watching", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data: progressData, error: progressError } = await supabase
        .from("episode_progress")
        .select(`
          episode_id,
          progress_time,
          duration,
          updated_at,
          episodes (
            id,
            title,
            episode_number,
            season_number,
            thumbnail_url,
            duration,
            anime_id,
            animes (
              title,
              slug
            )
          )
        `)
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(8);
      
      if (progressError) throw progressError;
      
      // Filter out episodes that are completed (>95%) but keep auto-tracked ones (progress > 0)
      const inProgress = progressData?.filter((item: any) => {
        const percentage = item.duration > 0 ? (item.progress_time / item.duration) * 100 : 0;
        return percentage > 0 && percentage < 95;
      }) || [];
      
      // Group by anime_id and keep only the most recent episode per anime
      const animeMap = new Map();
      inProgress.forEach((item: any) => {
        const animeId = item.episodes?.anime_id;
        if (animeId) {
          const existing = animeMap.get(animeId);
          if (!existing || new Date(item.updated_at) > new Date(existing.updated_at)) {
            animeMap.set(animeId, item);
          }
        }
      });
      
      return Array.from(animeMap.values());
    },
    enabled: !!user,
    retry: 2,
    staleTime: 30000,
  });

  if (error) {
    console.error("Error cargando animes:", error);
  }

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

  const animeList = animes || [];
  const featuredList = featuredAnimes || [];
  const episodesList = episodes || [];
  const newAnimesList = newAnimes2025 || [];
  const continueWatchingList = continueWatching || [];
  const topEpisodesList = topEpisodes || [];
  const mangasList = mangas || [];
  const junjiItoList = junjiItoCollection || [];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hidden H1 for SEO */}
        <h1 className="sr-only">Ver Animes Doblados y Subtitulados Online Gratis en Español - Nagaro</h1>
        <HeroCarousel animes={featuredList} />

        {/* Weekly Carousel */}
        <WeeklyCarousel title="Imprescindibles de la semana">
          {animeList.slice(0, 7).map((anime) => (
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

        {/* Continue Watching Section - Only for logged in users */}
        {user && continueWatchingList.length > 0 && (
          <AnimeSection title="Continuar viendo" reducedTopPadding>
            {continueWatchingList.map((item: any) => {
              const episode = item.episodes;
              if (!episode) return null;
              
              return (
                <div key={episode.id} className="w-[calc(((100vw-54px)/2.25)*2)] xs:w-[calc((100vw-60px)/2.25)] break-800:w-[calc((100vw-80px)/3.25)] lg:w-[calc((100vw-100px)/4.25)] xl:w-[calc((100vw-120px)/4.25)] break-1440:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/4.25)] 3xl:w-[calc((100vw-156px)/6.25)]">
                  <EpisodeCard
                    episodeId={episode.id}
                    animeSlug={episode.animes?.slug || ""}
                    title={episode.title}
                    episodeNumber={episode.episode_number}
                    seasonNumber={episode.season_number}
                    thumbnail={episode.thumbnail_url || ""}
                    duration={episode.duration}
                    animeTitle={episode.animes?.title || ""}
                  />
                </div>
              );
            })}
          </AnimeSection>
        )}

        <AnimeSection title="Últimos agregados" reducedTopPadding={!user || continueWatchingList.length === 0}>
          {animeList.map((anime) => (
            <div key={anime.id} className="w-[calc((100vw-54px)/2.25)] xs:w-[calc((100vw-60px)/3.25)] md:w-[calc((100vw-80px)/4.25)] lg:w-[calc((100vw-100px)/5.5)] xl:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/5.25)] 3xl:w-[calc((100vw-156px)/6.25)]">
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

        <AnimeSection title="Últimos episodios" showViewAll viewAllText="Ver más">
          {episodesList.map((episode: any) => (
            <div key={episode.id} className="w-[calc(((100vw-54px)/2.25)*2)] xs:w-[calc((100vw-60px)/2.25)] break-800:w-[calc((100vw-80px)/3.25)] lg:w-[calc((100vw-100px)/4.25)] xl:w-[calc((100vw-120px)/4.25)] break-1440:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/4.25)] 3xl:w-[calc((100vw-156px)/6.25)]">
              <EpisodeCard
                episodeId={episode.id}
                animeSlug={episode.animes?.slug || ""}
                title={episode.title}
                episodeNumber={episode.episode_number}
                seasonNumber={episode.season_number}
                thumbnail={episode.thumbnail_url || ""}
                duration={episode.duration}
                animeTitle={episode.animes?.title || ""}
              />
            </div>
          ))}
        </AnimeSection>

        {/* AdGuard Recommendation */}
        <AdBlockRecommendation />

        <AnimeSection 
          title="Los últimos lanzamientos"
        >
          {newAnimesList.map((anime: any) => (
            <div key={anime.id} className="w-[calc((100vw-54px)/2.25)] xs:w-[calc((100vw-60px)/3.25)] md:w-[calc((100vw-80px)/4.25)] lg:w-[calc((100vw-100px)/5.5)] xl:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/5.25)] 3xl:w-[calc((100vw-156px)/6.25)]">
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

        {/* Collection Section - Junji Ito */}
        {junjiItoList.length > 0 && (
          <CollectionSection
            title="JUNJI ITO"
            logo="https://lunar-merch.b-cdn.net/junjiitomerchandise.com/uploads/no_edit_junji_ito_logo.png"
            description="Historias de terror únicas del maestro del horror japonés. Sumérgete en un mundo de narrativas inquietantes y arte excepcional."
            backgroundImage="https://fridaybangkok.com/api/image-proxy?url=https%3A%2F%2Fd1xbecb6qvn9r4.cloudfront.net%2F%2FJunji_Ito_Collection_Horror_House_2025_a2d4b026db.jpg"
            items={junjiItoList}
            buttonText="Explora más"
            onButtonClick={() => navigate('/series')}
          />
        )}

        <AnimeSection title="Episodios que te gustaron" showViewAll viewAllText="Ver más">
          {topEpisodesList.map((episode: any) => (
            <div key={episode.id} className="w-[calc(((100vw-54px)/2.25)*2)] xs:w-[calc((100vw-60px)/2.25)] break-800:w-[calc((100vw-80px)/3.25)] lg:w-[calc((100vw-100px)/4.25)] xl:w-[calc((100vw-120px)/4.25)] break-1440:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/4.25)] 3xl:w-[calc((100vw-156px)/6.25)]">
              <EpisodeCard
                episodeId={episode.id}
                animeSlug={episode.animes?.slug || ""}
                title={episode.title}
                episodeNumber={episode.episode_number}
                seasonNumber={episode.season_number}
                thumbnail={episode.thumbnail_url || ""}
                duration={episode.duration}
                animeTitle={episode.animes?.title || ""}
              />
            </div>
          ))}
        </AnimeSection>

        {/* Mangas Section */}
        {mangasList.length > 0 && (
          <AnimeSection 
            title="Mangas y Manhwas" 
            showViewAll 
            viewAllText="Ver todos"
            onViewAllClick={() => navigate("/mangas")}
          >
            {mangasList.map((manga: any) => (
              <div key={manga.id} className="w-[calc((100vw-54px)/2.25)] xs:w-[calc((100vw-60px)/3.25)] md:w-[calc((100vw-80px)/4.25)] lg:w-[calc((100vw-100px)/5.5)] xl:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/5.25)] 3xl:w-[calc((100vw-156px)/6.25)]">
                <AnimeCard
                  id={manga.id}
                  slug={manga.slug}
                  title={manga.title}
                  image={manga.poster_url || ""}
                  language=""
                  isManga={true}
                />
              </div>
            ))}
          </AnimeSection>
        )}

        {/* Footer Space */}
        <div className="h-24"></div>
      </main>
    </div>
  );
};

export default Index;
