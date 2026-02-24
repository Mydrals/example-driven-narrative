import { getProxiedImageUrl } from "@/lib/imageProxy";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import AnimeSection from "@/components/AnimeSection";
import StatusSelector from "@/components/StatusSelector";
import AnimeCard from "@/components/AnimeCard";
import EpisodeCard from "@/components/EpisodeCard";
import EpisodeCardHorizontal from "@/components/EpisodeCardHorizontal";
import { Button } from "@/components/ui/button";
import { Play, RotateCcw, Bookmark, Film, ChevronDown, ArrowUpDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect, useRef } from "react";
import { useAnimeList } from "@/hooks/useAnimeList";
import type { User } from "@supabase/supabase-js";

const SeriesDetail = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [user, setUser] = useState<User | null>(null);
  const [episodeProgress, setEpisodeProgress] = useState<Record<string, { progress_time: number; duration: number }>>({});
  const [progressLoaded, setProgressLoaded] = useState(false);
  const [episodeOrder, setEpisodeOrder] = useState<"asc" | "desc">("asc");
  const [statusExpanded, setStatusExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [descClamped, setDescClamped] = useState(false);
  const descRef = useRef<HTMLParagraphElement>(null);
  
  // Get anime data first to use in useAnimeList
  const { data: anime, isLoading } = useQuery({
    queryKey: ["anime", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  const { isInList, listStatus, loading: listLoading, toggleList, updateStatus } = useAnimeList(anime?.id || "");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProgressLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setProgressLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);


  // Check if description is clamped
  useEffect(() => {
    setDescExpanded(false);
    const timer = setTimeout(() => {
      if (descRef.current) {
        setDescClamped(descRef.current.scrollHeight > descRef.current.clientHeight + 2);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [anime?.description]);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const { data: allAnimes } = useQuery({
    queryKey: ["animes-recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .limit(8);

      if (error) throw error;
      return data;
    },
  });

  const { data: episodes = [], isLoading: episodesLoading } = useQuery({
    queryKey: ["episodes", anime?.id],
    queryFn: async () => {
      if (!anime?.id) return [];
      
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("anime_id", anime.id)
        .order("season_number", { ascending: true })
        .order("episode_number", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!anime?.id,
  });

  // Load progress for all episodes
  useEffect(() => {
    setProgressLoaded(false);
    if (user && episodes.length > 0) {
      loadAllProgress();
    } else if (!user || episodes.length === 0) {
      setProgressLoaded(true);
    }
  }, [user, episodes]);

  const loadAllProgress = async () => {
    if (!user || episodes.length === 0) {
      setProgressLoaded(true);
      return;
    }

    try {
      const episodeIds = episodes.map(ep => ep.id);
      const { data, error } = await supabase
        .from("episode_progress")
        .select("episode_id, progress_time, duration")
        .eq("user_id", user.id)
        .in("episode_id", episodeIds);

      if (error) throw error;

      if (data) {
        const progressMap: Record<string, { progress_time: number; duration: number }> = {};
        data.forEach(item => {
          progressMap[item.episode_id] = {
            progress_time: item.progress_time,
            duration: item.duration
          };
        });
        setEpisodeProgress(progressMap);
      }
      setProgressLoaded(true);
    } catch (error) {
      console.error("Error loading progress:", error);
      setProgressLoaded(true);
    }
  };

  const getProgressPercentage = (episodeId: string) => {
    const progress = episodeProgress[episodeId];
    if (!progress || progress.duration === 0) return 0;
    return (progress.progress_time / progress.duration) * 100;
  };

  const formatTimeRemaining = (episodeId: string) => {
    const progress = episodeProgress[episodeId];
    if (!progress) return null;
    
    const remaining = Math.max(0, progress.duration - progress.progress_time);
    const minutes = Math.floor(remaining / 60);
    return `${minutes}m restantes`;
  };

  // Find the last watched episode
  const getLastWatchedEpisode = () => {
    if (!user || episodes.length === 0) return null;
    
    // Find episodes with progress
    const episodesWithProgress = episodes.filter(ep => {
      const progress = episodeProgress[ep.id];
      return progress && progress.progress_time > 0;
    });

    if (episodesWithProgress.length === 0) return null;

    // Sort by updated_at or progress to get the most recent
    // For now, find the one with highest progress that's not completed
    const lastWatched = episodesWithProgress.reduce((latest, current) => {
      const currentProgress = episodeProgress[current.id];
      const latestProgress = episodeProgress[latest.id];
      
      // If current episode is not fully watched (less than 95% watched)
      const currentPercentage = (currentProgress.progress_time / currentProgress.duration) * 100;
      if (currentPercentage < 95) {
        if (!latest) return current;
        
        // Compare episode numbers to get the latest
        if (current.season_number > latest.season_number) return current;
        if (current.season_number === latest.season_number && current.episode_number > latest.episode_number) return current;
      }
      
      return latest;
    }, episodesWithProgress[0]);

    return lastWatched;
  };

  const lastWatchedEpisode = getLastWatchedEpisode();
  const firstEpisode = episodes.length > 0 ? episodes[0] : null;
  const targetEpisode = lastWatchedEpisode || firstEpisode;

  const getWatchButtonText = () => {
    if (lastWatchedEpisode) {
      return `CONTINUAR VIENDO EPISODIO ${lastWatchedEpisode.episode_number}`;
    }
    return firstEpisode ? `VER EPISODIO 1` : 'VER';
  };

  const handleWatchClick = () => {
    if (targetEpisode) {
      navigate(`/series/${slug}/episode/${targetEpisode.id}`);
    }
  };

  // Group episodes by season
  const episodesBySeason = episodes.reduce((acc, episode) => {
    const season = episode.season_number;
    if (!acc[season]) {
      acc[season] = [];
    }
    acc[season].push(episode);
    return acc;
  }, {} as Record<number, typeof episodes>);

  const seasons = Object.keys(episodesBySeason).map(Number).sort((a, b) => a - b);

  // Add structured data and dynamic meta tags for SEO
  useEffect(() => {
    if (!anime) return;
    
    // Dynamic meta tags
    const isAnimeInSpanish = anime.language?.toLowerCase().includes('español');
    const isDubbed = anime.language?.toLowerCase().includes('doblado');
    const isSubtitled = anime.language?.toLowerCase().includes('subtitulado');
    
    let languageText = '';
    if (isDubbed && isSubtitled) {
      languageText = 'doblado y subtitulado';
    } else if (isDubbed) {
      languageText = 'doblado';
    } else if (isSubtitled) {
      languageText = 'subtitulado';
    } else {
      languageText = 'online';
    }
    
    const pageTitle = `Ver ${anime.title} ${languageText} en español online gratis sin anuncios - Nagaro`;
    const pageDescription = anime.description 
      ? `${anime.description.substring(0, 140)}... Ver ${anime.title} ${languageText} en español latino online gratis en HD sin anuncios.`
      : `Ver ${anime.title} ${languageText} en español latino online gratis en HD. Disfruta todos los episodios de ${anime.title} sin anuncios y con la mejor calidad en Nagaro.`;
    
    // Update title
    document.title = pageTitle;
    
    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', pageDescription);
    
    // Update or create meta keywords
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    const keywords = `ver ${anime.title} online gratis, ${anime.title} ${languageText}, ${anime.title} español latino, anime ${languageText}, ver anime sin anuncios, ${anime.title} HD`;
    metaKeywords.setAttribute('content', keywords);
    
    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', pageDescription);
    
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && anime.poster_url) ogImage.setAttribute('content', anime.poster_url);
    
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://nagaro.net/series/${anime.slug}`);
    
    // Update Twitter Card tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', pageTitle);
    
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute('content', pageDescription);
    
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage && anime.poster_url) twitterImage.setAttribute('content', anime.poster_url);
    
    // Add canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.href = `https://nagaro.net/series/${anime.slug}`;
    
    // Structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "TVSeries",
      "name": anime.title,
      "description": pageDescription,
      "image": anime.poster_url,
      "genre": anime.genres || ["Anime"],
      "inLanguage": "es",
      "datePublished": anime.year?.toString(),
      "numberOfSeasons": seasons.length,
      "numberOfEpisodes": episodes.length,
      "contentRating": "PG-13",
      "url": `https://nagaro.net/series/${anime.slug}`
    };
    
    let script = document.querySelector('script[type="application/ld+json"][data-series]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-series', 'true');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
    
    // Cleanup function to restore original meta tags
    return () => {
      document.title = 'Nagaro — Ver Animes Doblados y Subtitulados Online Gratis en Español';
      
      const scriptToRemove = document.querySelector('script[type="application/ld+json"][data-series]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
      
      const canonicalToRemove = document.querySelector('link[rel="canonical"]');
      if (canonicalToRemove) {
        canonicalToRemove.remove();
      }
    };
  }, [anime, seasons.length, episodes.length, slug]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-14 flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!anime) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-14 flex items-center justify-center h-screen">
          <div className="text-foreground">Serie no encontrada</div>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        <div
        className="relative w-full overflow-hidden aspect-[3/4] break-500:aspect-[4/3] break-800:aspect-auto break-800:h-[40vh] sm:break-800:h-[50vh] md:break-800:h-[60vh] lg:break-800:h-[70vh] xl:break-800:h-[80vh] bg-cover bg-center break-800:bg-top"
        style={{
          backgroundImage: (windowWidth < 500 && anime.mobile_hero_banner_url) 
            ? `url(${getProxiedImageUrl(anime.mobile_hero_banner_url)})` 
            : anime.hero_banner_url 
              ? `url(${getProxiedImageUrl(anime.hero_banner_url)})` 
              : undefined,
          backgroundColor: !anime.hero_banner_url ? 'hsl(var(--background))' : undefined,
          backgroundPosition: windowWidth < 800 && !anime.mobile_hero_banner_url 
            ? (anime as any).mobile_banner_focus || 'center' 
            : undefined,
        }}
      >
        {/* Gradient Overlay - Same as hero carousel */}
        <div className="absolute inset-0 hidden break-800:block bg-gradient-to-r from-cr-black/75 via-cr-black/50 via-30% to-transparent to-55%"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-cr-black via-cr-black/80 via-10% to-transparent to-50%"></div>
        
        <div className="relative h-full flex flex-col justify-end items-center break-800:items-start pb-0 px-[20px] xs:px-[30px] break-800:pl-8 lg:px-[clamp(30px,5vw,78px)]">
          <div className="max-w-full break-800:max-w-[30vw] space-y-2 w-full break-800:w-auto text-center break-800:text-left">
          {/* Meta info */}
          <div className="flex items-center justify-center break-800:justify-start gap-3 text-xs sm:text-sm text-foreground break-800:mb-3">
            {anime.year && (
              <span className="bg-cr-black/50 border-2 border-foreground/30 px-1.5 sm:px-2 py-0.5 rounded">
                {anime.year}
              </span>
            )}
            {seasons.length > 0 && (
              <span>{seasons.length} {seasons.length === 1 ? 'Temporada' : 'Temporadas'}</span>
            )}
          </div>

          {/* Logo */}
          {anime.logo_url ? (
            <div className="flex justify-center break-800:justify-start break-800:pb-0">
              <img 
                src={getProxiedImageUrl(anime.logo_url)} 
                alt={anime.title}
                className="h-auto max-h-28 xs:max-h-32 sm:max-h-36 break-800:max-h-20 lg:max-h-28 xl:max-h-36 w-auto object-contain drop-shadow-2xl pb-[5px]"
                loading="eager"
                decoding="async"
                fetchPriority="high"
              />
            </div>
          ) : (
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl xl:text-7xl font-black text-foreground leading-tight drop-shadow-2xl break-800:pb-0">
              {anime.title}
            </h1>
          )}

          {/* Action Buttons - Desktop Only */}
          <div className="hidden break-800:flex flex-col gap-2 pt-1 sm:pt-2 w-full break-800:w-auto">
            <Button 
              className="relative overflow-hidden bg-foreground/70 hover:bg-foreground text-cr-black w-full break-800:w-[400px] h-[52px] text-xs sm:text-sm font-bold rounded transition-all flex items-center justify-center"
              onClick={handleWatchClick}
              disabled={!progressLoaded}
            >
              {lastWatchedEpisode && targetEpisode && progressLoaded && (
                <div 
                  className="absolute bottom-[1px] left-[2px] right-[2px] h-1 bg-background transition-all rounded-full"
                  style={{ width: `calc(${getProgressPercentage(targetEpisode.id)}% - 4px)` }}
                />
              )}
              {!progressLoaded ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-cr-black/30 animate-pulse" />
                  <div className="h-4 w-48 rounded bg-cr-black/30 animate-pulse" />
                </div>
              ) : (
                <>
                  <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 fill-current" />
                  {getWatchButtonText()}
                </>
              )}
            </Button>
            <div className="flex items-center">
              <div className={`flex items-center gap-2 transition-all duration-300 overflow-hidden ${
                statusExpanded ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[200px] opacity-100 mr-2"
              }`}>
                <button 
                  className={`shrink-0 w-[40px] h-[40px] rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                    isInList ? 'bg-foreground text-background' : 'bg-muted text-foreground hover:bg-muted/80'
                  }`}
                  onClick={toggleList}
                  disabled={listLoading}
                >
                  <Bookmark className={`w-4 h-4 ${isInList ? 'fill-current' : ''}`} />
                </button>
                <button 
                  className="shrink-0 w-[40px] h-[40px] rounded-lg text-xs font-medium transition-colors flex items-center justify-center bg-muted text-foreground hover:bg-muted/80"
                >
                  <Film className="w-4 h-4" />
                </button>
              </div>
              <StatusSelector
                listStatus={listStatus}
                loading={listLoading}
                onUpdateStatus={updateStatus}
                variant="desktop"
                expanded={statusExpanded}
                onToggle={() => setStatusExpanded(prev => !prev)}
              />
            </div>
          </div>

        </div>
        </div>
      </div>

      {/* Action Buttons - Mobile Only */}
      <div className="px-[20px] xs:px-[30px] pt-4 pb-2 break-800:hidden">
        <div className="flex flex-col gap-2">
          <Button 
            className="relative overflow-hidden bg-foreground/70 hover:bg-foreground text-cr-black w-full h-[52px] text-xs font-bold rounded transition-all flex items-center justify-center"
            onClick={handleWatchClick}
            disabled={!progressLoaded}
          >
            {lastWatchedEpisode && targetEpisode && progressLoaded && (
              <div 
                className="absolute bottom-[1px] left-[2px] right-[2px] h-1 bg-background transition-all rounded-full"
                style={{ width: `calc(${getProgressPercentage(targetEpisode.id)}% - 4px)` }}
              />
            )}
            {!progressLoaded ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded-full bg-cr-black/30 animate-pulse" />
                <div className="h-4 w-32 rounded bg-cr-black/30 animate-pulse" />
              </div>
            ) : (
              <>
                <Play className="w-4 h-4 mr-1 fill-current" />
                {getWatchButtonText()}
              </>
            )}
          </Button>
          <div className="flex items-center">
            <div className={`flex items-center gap-2 transition-all duration-300 overflow-hidden ${
              statusExpanded ? "max-w-0 opacity-0 pointer-events-none" : "max-w-[200px] opacity-100 mr-2"
            }`}>
              <button 
                className={`shrink-0 w-[40px] h-[40px] rounded-lg text-xs font-medium transition-colors flex items-center justify-center ${
                  isInList ? 'bg-foreground text-background' : 'bg-muted text-foreground hover:bg-muted/80'
                }`}
                onClick={toggleList}
                disabled={listLoading}
              >
                <Bookmark className={`w-4 h-4 ${isInList ? 'fill-current' : ''}`} />
              </button>
              <button 
                className="shrink-0 w-[40px] h-[40px] rounded-lg text-xs font-medium transition-colors flex items-center justify-center bg-muted text-foreground hover:bg-muted/80"
              >
                <Film className="w-4 h-4" />
              </button>
            </div>
            <StatusSelector
              listStatus={listStatus}
              loading={listLoading}
              onUpdateStatus={updateStatus}
              variant="mobile"
              expanded={statusExpanded}
              onToggle={() => setStatusExpanded(prev => !prev)}
            />
          </div>
        </div>
      </div>

      {/* Genres, Language and Description */}
      <div className="px-[20px] xs:px-[30px] break-800:pl-8 lg:px-[clamp(30px,5vw,78px)] break-800:pt-[9px] pb-4 space-y-2">
        <p className="text-sm text-muted-foreground text-left break-800:text-left pt-[4px]">
          {anime.language || "Español • Inglés"}{anime.genres && anime.genres.length > 0 && ` | ${anime.genres.join(' • ')}`}
        </p>
        {(anime.description || "Disfruta de esta increíble serie llena de aventuras y momentos inolvidables.") && (
          <div 
            className={descClamped ? "cursor-pointer select-none" : ""}
            onClick={() => descClamped && setDescExpanded(prev => !prev)}
          >
            <p 
              ref={descRef}
              className={`text-sm break-800:text-base text-foreground/90 text-left break-800:max-w-2xl break-800:leading-relaxed ${!descExpanded ? 'line-clamp-3' : ''}`}
            >
              {anime.description || "Disfruta de esta increíble serie llena de aventuras y momentos inolvidables."}
            </p>
            {(descClamped || descExpanded) && (
              <span className="text-primary text-sm font-semibold mt-1 inline-block">
                {descExpanded ? 'Ver menos' : 'Ver más'}
              </span>
            )}
          </div>
        )}
      </div>


      {/* Episodes Section */}
      {episodesLoading ? (
        <div className="pb-4 px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]">
          <div className="inline-block mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">Episodios</h2>
            <div className="border-b-2 border-primary"></div>
          </div>
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="w-full h-24" />
            ))}
          </div>
        </div>
      ) : episodes.length > 0 && seasons.length > 0 && (
        <div className="pb-4">
          <Tabs defaultValue={`season${seasons[0]}`} className="w-full">
            <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]">
              <div className="inline-block">
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">Episodios</h2>
                <div className="border-b-2 border-primary"></div>
              </div>
              
              <TabsList className="bg-transparent h-auto p-0 w-full flex-col items-stretch gap-0">
                {seasons.map((season) => (
                  <TabsTrigger 
                    key={season}
                    value={`season${season}`}
                    className="bg-transparent data-[state=active]:bg-transparent border-y border-border rounded-none px-0 py-2 break-800:py-4 text-foreground font-bold text-base break-800:text-lg justify-between flex items-center data-[state=active]:shadow-none hover:bg-foreground/5 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <ChevronDown className="w-4 h-4 break-800:w-5 break-800:h-5" />
                      <span>Temporada {season}</span>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEpisodeOrder(prev => prev === "asc" ? "desc" : "asc");
                      }}
                      className="p-1 rounded hover:bg-foreground/10 transition-colors"
                      title={episodeOrder === "asc" ? "Orden descendente" : "Orden ascendente"}
                    >
                      <ArrowUpDown className="w-4 h-4 break-800:w-5 break-800:h-5" />
                    </button>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {seasons.map((season) => (
              <TabsContent key={season} value={`season${season}`} className="mt-0">
                <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)] py-4">
                  <div className="space-y-2 break-500:hidden">
                    {(episodeOrder === "desc" ? [...episodesBySeason[season]].reverse() : episodesBySeason[season]).map((episode) => (
                      <EpisodeCardHorizontal
                        key={episode.id}
                        episodeId={episode.id}
                        animeSlug={slug || ""}
                        title={episode.title}
                        episodeNumber={episode.episode_number}
                        seasonNumber={episode.season_number}
                        thumbnail={episode.thumbnail_url || ""}
                        duration={episode.duration}
                        animeTitle={anime.title}
                      />
                    ))}
                  </div>
                </div>
                <div className="hidden break-500:block">
                  <AnimeSection title="" reducedTopPadding>
                    {(episodeOrder === "desc" ? [...episodesBySeason[season]].reverse() : episodesBySeason[season]).map((episode) => (
                      <div key={episode.id} className="w-[calc(((100vw-54px)/2.25)*2)] xs:w-[calc((100vw-60px)/2.25)] break-800:w-[calc((100vw-80px)/3.25)] lg:w-[calc((100vw-100px)/4.25)] xl:w-[calc((100vw-120px)/4.25)] break-1440:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/4.25)] 3xl:w-[calc((100vw-156px)/6.25)]">
                        <EpisodeCard
                          episodeId={episode.id}
                          animeSlug={slug || ""}
                          title={episode.title}
                          episodeNumber={episode.episode_number}
                          seasonNumber={episode.season_number}
                          thumbnail={episode.thumbnail_url || ""}
                          duration={episode.duration}
                          animeTitle={anime.title}
                        />
                      </div>
                    ))}
                  </AnimeSection>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>
      )}

      {/* Recommendations Section */}
      <AnimeSection title="Quizá también te guste">
        {allAnimes?.filter(a => a.id !== anime.id).map((item) => (
          <div key={item.id} className="w-[calc((100vw-54px)/2.25)] xs:w-[calc((100vw-60px)/3.25)] md:w-[calc((100vw-80px)/4.25)] lg:w-[calc((100vw-100px)/5.5)] xl:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/5.25)] 3xl:w-[calc((100vw-156px)/6.25)]">
            <AnimeCard 
              id={item.id}
              slug={item.slug}
              title={item.title}
              image={item.poster_url || ""}
              language={item.language || ""}
            />
          </div>
        ))}
      </AnimeSection>

      {/* Footer Space */}
      <div className="h-24"></div>
      </main>
    </div>
  );
};

export default SeriesDetail;
