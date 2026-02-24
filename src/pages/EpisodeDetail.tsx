import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import VideoPlayer from "@/components/VideoPlayer";
import EpisodeCardHorizontal from "@/components/EpisodeCardHorizontal";
import { Button } from "@/components/ui/button";
import { Share2, List, Eye, EyeOff, Flag } from "lucide-react";
import LikeDislikeButton from "@/components/LikeDislikeButton";
import VideoSourceSelector from "@/components/VideoSourceSelector";
import LanguageSelector from "@/components/LanguageSelector";
import { Skeleton } from "@/components/ui/skeleton";
import { useEpisodeProgress } from "@/hooks/useEpisodeProgress";
import { useAutoTrackEpisode } from "@/hooks/useAutoTrackEpisode";
import { formatDateWithoutTimezone } from "@/lib/dateUtils";
import { parseVideoSources, isDirectVideoUrl, getLanguageLabel } from "@/lib/videoSources";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";

const EpisodeDetail = () => {
  const { slug, episodeId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { progress, saveProgress, user } = useEpisodeProgress(episodeId || "");
  const [activeSourceIndex, setActiveSourceIndex] = useState(0);
  // showLangMenu moved into LanguageSelector
  const [descExpanded, setDescExpanded] = useState(false);
  const [descClamped, setDescClamped] = useState(false);
  const descRefMobile = useRef<HTMLParagraphElement>(null);
  const descRefDesktop = useRef<HTMLParagraphElement>(null);



  // Detectar si está en iOS PWA
  const isIOSPWA = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    return isIOS && isStandalone;
  };

  const { data: episode, isLoading: episodeLoading } = useQuery({
    queryKey: ["episode", episodeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("episodes")
        .select(`
          *,
          animes (
            title,
            slug,
            language
          )
        `)
        .eq("id", episodeId)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
  });

  // Auto-track episode viewing after 10 seconds
  useAutoTrackEpisode(user, episodeId || "", episode?.anime_id, episode?.duration);

  // Check if episode is watched
  const isWatched = progress && progress.duration > 0 
    ? (progress.progress_time / progress.duration) * 100 >= 95 
    : false;

  const handleToggleWatched = async () => {
    if (!user) {
      toast.error("Debes iniciar sesión para marcar episodios como vistos");
      return;
    }
    if (!episodeId || !episode) return;

    try {
      const durationSeconds = (parseInt(episode.duration) || 24) * 60;
      const newProgressTime = isWatched ? 0 : durationSeconds;

      await supabase
        .from("episode_progress")
        .upsert({
          user_id: user.id,
          episode_id: episodeId,
          progress_time: newProgressTime,
          duration: durationSeconds,
        }, { onConflict: "user_id,episode_id" });

      // When marking as watched, add next episode to "continue watching"
      if (!isWatched) {
        const { data: nextEp } = await supabase
          .from("episodes")
          .select("id, duration")
          .eq("anime_id", episode.anime_id)
          .gt("episode_number", episode.episode_number)
          .order("episode_number", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (nextEp) {
          const nextDuration = (parseInt(nextEp.duration) || 24) * 60;
          await supabase
            .from("episode_progress")
            .upsert({
              user_id: user.id,
              episode_id: nextEp.id,
              progress_time: 1,
              duration: nextDuration,
            }, { onConflict: "user_id,episode_id" });
        }
      }

      toast.success(isWatched ? "Episodio desmarcado" : "Episodio marcado como visto");
      saveProgress(newProgressTime, durationSeconds);
      queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
    } catch (error) {
      console.error("Error toggling watched:", error);
      toast.error("Error al actualizar el estado");
    }
  };

  const { data: previousEpisodes, isLoading: previousLoading } = useQuery({
    queryKey: ["previous-episodes", episode?.anime_id, episode?.season_number, episode?.episode_number],
    queryFn: async () => {
      if (!episode) return [];
      
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("anime_id", episode.anime_id)
        .eq("season_number", episode.season_number)
        .lt("episode_number", episode.episode_number)
        .order("episode_number", { ascending: false })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!episode,
  });

  const { data: nextEpisodes, isLoading: nextLoading } = useQuery({
    queryKey: ["next-episodes", episode?.anime_id, episode?.season_number, episode?.episode_number],
    queryFn: async () => {
      if (!episode) return [];
      
      const { data, error } = await supabase
        .from("episodes")
        .select("*")
        .eq("anime_id", episode.anime_id)
        .eq("season_number", episode.season_number)
        .gt("episode_number", episode.episode_number)
        .order("episode_number", { ascending: true })
        .limit(3);

      if (error) throw error;
      return data || [];
    },
    enabled: !!episode,
  });

  // Check if description is clamped (needs "Ver más")
  useEffect(() => {
    setDescExpanded(false);
    const checkClamped = (ref: React.RefObject<HTMLParagraphElement>) => {
      if (ref.current) {
        return ref.current.scrollHeight > ref.current.clientHeight + 2;
      }
      return false;
    };
    const timer = setTimeout(() => {
      setDescClamped(checkClamped(descRefMobile) || checkClamped(descRefDesktop));
    }, 100);
    return () => clearTimeout(timer);
  }, [episode?.description]);

  // Add structured data and dynamic meta tags for SEO
  useEffect(() => {
    if (!episode) return;
    
    // Dynamic meta tags
    const animeTitle = episode.animes?.title || episode.anime_title || '';
    const isAnimeInSpanish = episode.animes?.language?.toLowerCase().includes('español');
    const isDubbed = episode.animes?.language?.toLowerCase().includes('doblado');
    const isSubtitled = episode.animes?.language?.toLowerCase().includes('subtitulado');
    
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
    
    const pageTitle = `Ver ${animeTitle} Temporada ${episode.season_number} Episodio ${episode.episode_number} ${languageText} en español - ${episode.title} - Nagaro`;
    const pageDescription = episode.description 
      ? `${episode.description.substring(0, 130)}... Ver ${animeTitle} T${episode.season_number}E${episode.episode_number} ${languageText} en español online gratis en HD sin anuncios.`
      : `Ver ${animeTitle} Temporada ${episode.season_number} Episodio ${episode.episode_number} - ${episode.title} ${languageText} en español latino online gratis en HD sin anuncios en Nagaro.`;
    
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
    const keywords = `ver ${animeTitle} episodio ${episode.episode_number}, ${animeTitle} T${episode.season_number}E${episode.episode_number}, ${animeTitle} ${languageText}, anime ${languageText}, ver anime sin anuncios`;
    metaKeywords.setAttribute('content', keywords);
    
    // Update Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    if (ogTitle) ogTitle.setAttribute('content', pageTitle);
    
    const ogDescription = document.querySelector('meta[property="og:description"]');
    if (ogDescription) ogDescription.setAttribute('content', pageDescription);
    
    const ogImage = document.querySelector('meta[property="og:image"]');
    if (ogImage && episode.thumbnail_url) ogImage.setAttribute('content', episode.thumbnail_url);
    
    const ogUrl = document.querySelector('meta[property="og:url"]');
    if (ogUrl) ogUrl.setAttribute('content', `https://nagaro.net/series/${slug}/episode/${episodeId}`);
    
    // Update Twitter Card tags
    const twitterTitle = document.querySelector('meta[name="twitter:title"]');
    if (twitterTitle) twitterTitle.setAttribute('content', pageTitle);
    
    const twitterDescription = document.querySelector('meta[name="twitter:description"]');
    if (twitterDescription) twitterDescription.setAttribute('content', pageDescription);
    
    const twitterImage = document.querySelector('meta[name="twitter:image"]');
    if (twitterImage && episode.thumbnail_url) twitterImage.setAttribute('content', episode.thumbnail_url);
    
    // Add canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.href = `https://nagaro.net/series/${slug}/episode/${episodeId}`;
    
    // Structured data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": "TVEpisode",
      "name": `${episode.title} - Episodio ${episode.episode_number}`,
      "description": pageDescription,
      "episodeNumber": episode.episode_number,
      "seasonNumber": episode.season_number,
      "partOfSeries": {
        "@type": "TVSeries",
        "name": animeTitle
      },
      "thumbnailUrl": episode.thumbnail_url,
      "inLanguage": "es",
      "datePublished": episode.original_release_date,
      "url": `https://nagaro.net/series/${slug}/episode/${episodeId}`
    };
    
    let script = document.querySelector('script[type="application/ld+json"][data-episode]') as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-episode', 'true');
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(structuredData);
    
    // Cleanup function to restore original meta tags
    return () => {
      document.title = 'Nagaro — Ver Animes Doblados y Subtitulados Online Gratis en Español';
      
      const scriptToRemove = document.querySelector('script[type="application/ld+json"][data-episode]');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
      
      const canonicalToRemove = document.querySelector('link[rel="canonical"]');
      if (canonicalToRemove) {
        canonicalToRemove.remove();
      }
    };
  }, [episode, slug, episodeId]);

  // Reset source index when episode changes
  useEffect(() => {
    setActiveSourceIndex(0);
  }, [episodeId]);

  if (episodeLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-14 flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!episode) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-14 flex items-center justify-center h-screen">
          <div className="text-foreground">Episodio no encontrado</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className={isIOSPWA() ? "pt-[calc(56px+env(safe-area-inset-top))]" : "pt-14"}>
        {/* Two Column Layout for Desktop (1024px+) */}
        <div className="lg:flex lg:gap-6 lg:px-[clamp(30px,5vw,78px)] lg:py-6">
          {/* Left Column - Video Player & Info */}
          <div className="lg:flex-1 lg:max-w-[calc(100%-400px)]">
            {/* Video Player Section */}
            <div className="w-full bg-cr-black flex justify-center lg:bg-transparent">
              <div className="w-full lg:max-w-none">
                {(() => {
                  const sources = parseVideoSources(episode.video_url);
                  const currentSource = sources[activeSourceIndex] || sources[0];
                  if (!currentSource?.url) {
                    return (
                      <div className="w-full aspect-video flex items-center justify-center text-muted-foreground bg-card">
                        Video no disponible
                      </div>
                    );
                  }
                  if (!isDirectVideoUrl(currentSource.url)) {
                    return (
                      <div className="w-full aspect-video">
                        <iframe
                          key={currentSource.url}
                          src={currentSource.url}
                          className="w-full h-full"
                          allowFullScreen
                          allow="autoplay; fullscreen; encrypted-media"
                          frameBorder="0"
                          style={{ border: 0 }}
                        />
                      </div>
                    );
                  }
                  return (
                    <VideoPlayer
                      videoUrl={currentSource.url}
                      thumbnailSpriteUrl={episode.thumbnail_sprite_url}
                      thumbnailCount={episode.thumbnail_count || 60}
                      thumbnailColumns={episode.thumbnail_columns || 10}
                      episodeTitle={`${episode.animes?.title || episode.anime_title} - Episodio ${episode.episode_number}`}
                      thumbnailUrl={episode.thumbnail_url}
                      skipCreditsTime={episode.skip_credits_time || 90}
                      skipCreditsTo={episode.skip_credits_to}
                      nextEpisode={nextEpisodes && nextEpisodes.length > 0 ? nextEpisodes[0] : undefined}
                      onNextEpisode={() => {
                        if (nextEpisodes && nextEpisodes.length > 0) {
                          navigate(`/series/${slug}/episode/${nextEpisodes[0].id}`);
                        }
                      }}
                      episodeId={episodeId || ""}
                      initialProgress={progress?.progress_time || 0}
                      onProgressUpdate={saveProgress}
                    />
                  );
                })()}
              </div>
            </div>

            {/* Controls Row - Below Player */}
            {(() => {
              const sources = parseVideoSources(episode.video_url);
              const activeLang = sources[activeSourceIndex]?.language || "";
              const filteredSources = sources.filter(s => (s.language || "") === activeLang);
              const filteredActiveIndex = filteredSources.indexOf(sources[activeSourceIndex]);
              const languages = Array.from(new Set(sources.map(s => s.language).filter(Boolean))) as string[];
              const hasMultipleLanguages = languages.length > 1;
              return (
                <div className="flex flex-col gap-2 px-[20px] xs:px-[30px] lg:px-0 py-3 lg:flex-row lg:items-center lg:justify-between">
                  {/* Top row - Language & Player selectors (scrollable) */}
                  <div className="flex items-center gap-2 min-w-0">
                    {/* Language Selector - same compact component for all screens */}
                    <div className="shrink-0">
                      <LanguageSelector sources={sources} activeIndex={activeSourceIndex} onSelect={setActiveSourceIndex} />
                    </div>
                    <div className="overflow-x-auto min-w-0 scrollbar-hide">
                      <VideoSourceSelector
                        sources={filteredSources}
                        activeIndex={filteredActiveIndex >= 0 ? filteredActiveIndex : 0}
                        onSelect={(i) => {
                          const originalIndex = sources.indexOf(filteredSources[i]);
                          if (originalIndex >= 0) setActiveSourceIndex(originalIndex);
                        }}
                      />
                    </div>
                  </div>
                  {/* Like/Dislike & Share - Desktop only in this row */}
                  <div className="hidden lg:flex items-center gap-2 shrink-0">
                    <LikeDislikeButton episodeId={episodeId || ""} size="default" />
                    <button className="flex items-center justify-center bg-card hover:bg-card/80 rounded-full px-3 py-2 transition-colors">
                      <Share2 className="w-5 h-5 text-foreground hover:text-primary transition-colors" />
                    </button>
                    <button 
                      onClick={handleToggleWatched}
                      className={`flex items-center justify-center rounded-full px-3 py-2 transition-colors ${isWatched ? 'bg-primary/20 text-primary' : 'bg-card hover:bg-card/80 text-foreground hover:text-primary'}`}
                      title={isWatched ? "Desmarcar como visto" : "Marcar como visto"}
                    >
                      {isWatched ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                    <button 
                      className="flex items-center justify-center bg-card hover:bg-card/80 rounded-full px-3 py-2 transition-colors"
                      title="Reportar"
                      onClick={() => toast.info("Función de reporte próximamente")}
                    >
                      <Flag className="w-5 h-5 text-foreground hover:text-primary transition-colors" />
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* Episode Info Section - Mobile/Tablet Only */}
            <div className="px-[20px] xs:px-[30px] lg:px-0 space-y-1.5 lg:hidden">
              {/* Episode Title */}
              <h1 className="text-2xl font-bold text-foreground">
                E{episode.episode_number} - {episode.title}
              </h1>

              {/* Series Name Label */}
              <p 
                className="text-primary text-base font-semibold cursor-pointer hover:opacity-80 transition-opacity inline-block"
                onClick={() => navigate(`/series/${slug}`)}
              >
                {episode.animes?.title || episode.anime_title}
              </p>

              {/* Like/Dislike & Share - Mobile/Tablet only */}
              <div className="flex items-center gap-2">
                <LikeDislikeButton episodeId={episodeId || ""} size="default" />
                <button className="flex items-center justify-center bg-card hover:bg-card/80 rounded-full px-3 py-2 transition-colors">
                  <Share2 className="w-5 h-5 text-foreground hover:text-primary transition-colors max-[500px]:w-4 max-[500px]:h-4" />
                </button>
                <button 
                  onClick={handleToggleWatched}
                  className={`flex items-center justify-center rounded-full px-3 py-2 transition-colors ${isWatched ? 'bg-primary/20 text-primary' : 'bg-card hover:bg-card/80 text-foreground hover:text-primary'}`}
                  title={isWatched ? "Desmarcar como visto" : "Marcar como visto"}
                >
                  {isWatched ? <EyeOff className="w-5 h-5 max-[500px]:w-4 max-[500px]:h-4" /> : <Eye className="w-5 h-5 max-[500px]:w-4 max-[500px]:h-4" />}
                </button>
                <button 
                  className="flex items-center justify-center bg-card hover:bg-card/80 rounded-full px-3 py-2 transition-colors"
                  title="Reportar"
                  onClick={() => toast.info("Función de reporte próximamente")}
                >
                  <Flag className="w-5 h-5 text-foreground hover:text-primary transition-colors max-[500px]:w-4 max-[500px]:h-4" />
                </button>
              </div>

              {/* Meta Info */}
              {episode.original_release_date && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    Lanzado el {formatDateWithoutTimezone(episode.original_release_date)}
                  </span>
                </div>
              )}

              {/* Description */}
              {episode.description && (
                <div 
                  className="cursor-pointer select-none"
                  onClick={() => setDescExpanded(prev => !prev)}
                >
                  <p 
                    ref={descRefMobile}
                    className={`text-foreground/90 text-sm leading-relaxed max-w-3xl ${!descExpanded ? 'line-clamp-3' : ''}`}
                  >
                    {episode.description}
                  </p>
                  {(descClamped || descExpanded) && (
                    <span className="text-primary text-sm font-semibold mt-1 inline-block">
                      {descExpanded ? 'Ver menos' : 'Ver más'}
                    </span>
                  )}
                </div>
              )}

              {/* Next Episodes Section */}
              {nextLoading ? (
                <div className="pt-6 space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="w-full h-24" />
                    ))}
                  </div>
                </div>
              ) : nextEpisodes && nextEpisodes.length > 0 && (
                <div className="pt-6 space-y-3">
                  <h2 className="text-lg font-bold text-foreground">
                    {nextEpisodes.length === 1 ? 'SIGUIENTE EPISODIO' : 'SIGUIENTES EPISODIOS'}
                  </h2>
                  <div className="space-y-3">
                    {nextEpisodes.map((ep) => (
                      <EpisodeCardHorizontal
                        key={ep.id}
                        episodeId={ep.id}
                        animeSlug={slug || ""}
                        title={ep.title}
                        episodeNumber={ep.episode_number}
                        seasonNumber={episode.season_number}
                        thumbnail={ep.thumbnail_url || ""}
                        duration={ep.duration}
                        animeTitle={episode.animes?.title || episode.anime_title || ""}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Previous Episodes Section */}
              {previousLoading ? (
                <div className="pt-6 space-y-3">
                  <Skeleton className="h-6 w-48" />
                  <div className="space-y-3">
                    {[...Array(2)].map((_, i) => (
                      <Skeleton key={i} className="w-full h-24" />
                    ))}
                  </div>
                </div>
              ) : previousEpisodes && previousEpisodes.length > 0 && (
                <div className="pt-6 space-y-3">
                  <h2 className="text-lg font-bold text-foreground">
                    {previousEpisodes.length === 1 ? 'EPISODIO ANTERIOR' : 'EPISODIOS ANTERIORES'}
                  </h2>
                  <div className="space-y-3">
                    {previousEpisodes.map((ep) => (
                      <EpisodeCardHorizontal
                        key={ep.id}
                        episodeId={ep.id}
                        animeSlug={slug || ""}
                        title={ep.title}
                        episodeNumber={ep.episode_number}
                        seasonNumber={episode.season_number}
                        thumbnail={ep.thumbnail_url || ""}
                        duration={ep.duration}
                        animeTitle={episode.animes?.title || episode.anime_title || ""}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* View All Episodes Button */}
              <div className="pt-4">
                <Button
                  variant="outline"
                  className="border-2 border-foreground/30 bg-transparent text-foreground hover:bg-foreground hover:text-background"
                  onClick={() => navigate(`/series/${slug}`)}
                >
                  <List className="w-4 h-4 mr-2" />
                  VER MÁS EPISODIOS
                </Button>
              </div>
            </div>

            {/* Episode Info Section - Desktop Only */}
            <div className="hidden lg:block space-y-1.5">
              {/* Episode Title */}
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">
                E{episode.episode_number} - {episode.title}
              </h1>

              {/* Series Name Label */}
              <p 
                className="text-primary text-base font-semibold cursor-pointer hover:opacity-80 transition-opacity inline-block"
                onClick={() => navigate(`/series/${slug}`)}
              >
                {episode.animes?.title || episode.anime_title}
              </p>

              {/* Meta Info */}
              {episode.original_release_date && (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span>
                    Lanzado el {formatDateWithoutTimezone(episode.original_release_date)}
                  </span>
                </div>
              )}

              {/* Description */}
              {episode.description && (
                <div 
                  className="cursor-pointer select-none"
                  onClick={() => setDescExpanded(prev => !prev)}
                >
                  <p 
                    ref={descRefDesktop}
                    className={`text-foreground/90 text-sm lg:text-base leading-relaxed ${!descExpanded ? 'line-clamp-3' : ''}`}
                  >
                    {episode.description}
                  </p>
                  {(descClamped || descExpanded) && (
                    <span className="text-primary text-sm font-semibold mt-1 inline-block">
                      {descExpanded ? 'Ver menos' : 'Ver más'}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Episodes List (Desktop Only) */}
          <div className="hidden lg:block lg:w-[380px] lg:flex-shrink-0 space-y-4 lg:-mt-2">
            {/* Next Episodes Section */}
            {nextLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="w-full h-24" />
                  ))}
                </div>
              </div>
            ) : nextEpisodes && nextEpisodes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">
                  {nextEpisodes.length === 1 ? 'SIGUIENTE EPISODIO' : 'SIGUIENTES EPISODIOS'}
                </h2>
                <div className="space-y-3">
                  {nextEpisodes.map((ep) => (
                    <EpisodeCardHorizontal
                      key={ep.id}
                      episodeId={ep.id}
                      animeSlug={slug || ""}
                      title={ep.title}
                      episodeNumber={ep.episode_number}
                      seasonNumber={episode.season_number}
                      thumbnail={ep.thumbnail_url || ""}
                      duration={ep.duration}
                      animeTitle={episode.animes?.title || episode.anime_title || ""}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Previous Episodes Section */}
            {previousLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <div className="space-y-3">
                  {[...Array(2)].map((_, i) => (
                    <Skeleton key={i} className="w-full h-24" />
                  ))}
                </div>
              </div>
            ) : previousEpisodes && previousEpisodes.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-bold text-foreground">
                  {previousEpisodes.length === 1 ? 'EPISODIO ANTERIOR' : 'EPISODIOS ANTERIORES'}
                </h2>
                <div className="space-y-3">
                  {previousEpisodes.map((ep) => (
                    <EpisodeCardHorizontal
                      key={ep.id}
                      episodeId={ep.id}
                      animeSlug={slug || ""}
                      title={ep.title}
                      episodeNumber={ep.episode_number}
                      seasonNumber={episode.season_number}
                      thumbnail={ep.thumbnail_url || ""}
                      duration={ep.duration}
                      animeTitle={episode.animes?.title || episode.anime_title || ""}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* View All Episodes Button */}
            <div className="pt-2">
              <Button
                variant="outline"
                className="w-full border-2 border-foreground/30 bg-transparent text-foreground hover:bg-foreground hover:text-background"
                onClick={() => navigate(`/series/${slug}`)}
              >
                <List className="w-4 h-4 mr-2" />
                VER MÁS EPISODIOS
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Space */}
        <div className="h-24"></div>
      </main>
    </div>
  );
};

export default EpisodeDetail;
