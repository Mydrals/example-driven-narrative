import { useEffect, useState } from "react";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import { BookOpen, Bookmark, Search, ArrowUpDown } from "lucide-react";
import { useAnimeList } from "@/hooks/useAnimeList";
import type { User } from "@supabase/supabase-js";
import MangaCarousel from "@/components/MangaCarousel";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

interface Manga {
  id: string;
  slug: string;
  title: string;
  description: string;
  poster_url: string;
  hero_banner_url?: string;
  mobile_hero_banner_url?: string;
}

interface ChapterInfo {
  chapter_number?: number;
  number?: number;
  title: string;
  start_page: number;
  end_page?: number;
}

interface MangaChapter {
  id: string;
  chapter_number: number;
  title: string;
  total_pages: number;
  folder_url: string;
  filename_pattern: string;
  file_extensions?: string[];
  chapters_info?: ChapterInfo[];
}

const MangaDetail = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [manga, setManga] = useState<Manga | null>(null);
  const [chapters, setChapters] = useState<MangaChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tomos" | "capitulos">("tomos");
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [user, setUser] = useState<User | null>(null);
  const [imageLoading, setImageLoading] = useState<Record<string, boolean>>({});
  const [mangaProgress, setMangaProgress] = useState<any>(null);
  const [chapterSearch, setChapterSearch] = useState("");
  const [chapterSortOrder, setChapterSortOrder] = useState<"asc" | "desc">("asc");
  
  const { isInList, loading: listLoading, toggleList } = useAnimeList(manga?.id || "");

  const getChapterCoverUrl = (chapter: MangaChapter, pageNumber: number = 1) => {
    const pattern = chapter.filename_pattern || "000";
    const extensions = chapter.file_extensions || ['jpg', 'webp', 'png'];
    const ext = extensions[0];
    let filename: string;
    
    switch (pattern) {
      case "0":
        filename = `${pageNumber}`;
        break;
      case "00":
        filename = pageNumber.toString().padStart(2, "0");
        break;
      case "0000":
        filename = pageNumber.toString().padStart(4, "0");
        break;
      case "000":
      default:
        filename = pageNumber.toString().padStart(3, "0");
        break;
    }
    
    const baseUrl = chapter.folder_url.endsWith('/') ? chapter.folder_url : `${chapter.folder_url}/`;
    return `${baseUrl}${filename}.${ext}`;
  };

  const getAllChaptersFromTomos = () => {
    const allChapters: Array<
      (ChapterInfo & { tomoId: string; tomoNumber: number; tomoTitle: string }) & { number: number }
    > = [];
    
    chapters.forEach((tomo) => {
      if (tomo.chapters_info && Array.isArray(tomo.chapters_info)) {
        tomo.chapters_info.forEach((chapter) => {
          const num = (chapter as any).number ?? (chapter as any).chapter_number;
          allChapters.push({
            ...chapter,
            number: typeof num === 'number' ? num : 0,
            tomoId: tomo.id,
            tomoNumber: tomo.chapter_number,
            tomoTitle: tomo.title || "",
          });
        });
      }
    });
    
    let filteredChapters = allChapters
      .filter((c) => typeof c.number === 'number' && c.number > 0);

    // Filtrar por búsqueda
    if (chapterSearch.trim()) {
      const searchTerm = chapterSearch.toLowerCase();
      filteredChapters = filteredChapters.filter((c) => {
        const numberMatch = c.number.toString().includes(searchTerm);
        const titleMatch = c.title?.toLowerCase().includes(searchTerm);
        return numberMatch || titleMatch;
      });

      // Si hay búsqueda, ordenar por coincidencia exacta primero, luego por número ascendente
      filteredChapters.sort((a, b) => {
        const aExactMatch = a.number.toString() === searchTerm;
        const bExactMatch = b.number.toString() === searchTerm;
        
        if (aExactMatch && !bExactMatch) return -1;
        if (!aExactMatch && bExactMatch) return 1;
        
        return a.number - b.number;
      });
    } else {
      // Solo aplicar ordenamiento si no hay búsqueda
      filteredChapters.sort((a, b) => 
        chapterSortOrder === "asc" ? a.number - b.number : b.number - a.number
      );
    }

    return filteredChapters;
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    const fetchMangaData = async () => {
      if (!slug) return;

      setLoading(true);

      // Fetch manga
      const { data: mangaData } = await supabase
        .from("mangas")
        .select("*")
        .eq("slug", slug)
        .single();

      if (mangaData) {
        setManga(mangaData);

        // Fetch chapters
        const { data: chaptersData } = await supabase
          .from("manga_chapters")
          .select("*")
          .eq("manga_id", mangaData.id)
          .order("chapter_number", { ascending: true });

        if (chaptersData) {
          // Cast chapters_info from Json to ChapterInfo[]
          const typedChapters = chaptersData.map((chapter) => ({
            ...chapter,
            chapters_info: (chapter.chapters_info as unknown as ChapterInfo[]) || [],
          }));
          setChapters(typedChapters);
        }

        // Cargar progreso si el usuario está logueado
        if (user) {
          const { data: progress } = await supabase
            .from("manga_progress")
            .select("*")
            .eq("manga_id", mangaData.id)
            .eq("user_id", user.id)
            .maybeSingle();

          setMangaProgress(progress);
        }
      }

      setLoading(false);
    };

    fetchMangaData();
  }, [slug, user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-14 flex items-center justify-center h-screen">
          <div className="animate-pulse text-muted-foreground">Cargando...</div>
        </div>
      </div>
    );
  }

  if (!manga) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="pt-14 flex items-center justify-center h-screen">
          <div className="text-foreground">Manga no encontrado</div>
        </div>
      </div>
    );
  }

  const firstChapter = getAllChaptersFromTomos()[0];
  const firstTomo = chapters[0];
  
  const getReadButtonText = () => {
    if (mangaProgress) {
      return 'CONTINUAR LEYENDO';
    }
    if (activeTab === "capitulos" && firstChapter) {
      return `LEER CAPÍTULO ${firstChapter.number}`;
    }
    if (firstTomo) {
      return `LEER TOMO ${firstTomo.chapter_number}`;
    }
    return 'LEER';
  };

  const handleReadClick = () => {
    // Si hay progreso guardado, continuar desde ahí
    if (mangaProgress) {
      const progressChapter = chapters.find(c => c.id === mangaProgress.chapter_id);
      if (progressChapter) {
        // Encontrar si el progreso está en un capítulo específico dentro del tomo
        const chapterInfo = progressChapter.chapters_info?.find(
          ch => ch.chapter_number === mangaProgress.last_chapter_number
        );

        if (chapterInfo) {
          // Continuar desde el capítulo específico en la página exacta
          // La página guardada es absoluta del tomo, necesitamos calcular la relativa al capítulo
          const relativePageInChapter = mangaProgress.current_page - chapterInfo.start_page + 1;
          navigate(`/mangas/${slug}/${progressChapter.chapter_number}`, {
            state: { 
              viewMode: "chapter", 
              chapterNumber: chapterInfo.chapter_number,
              startPage: relativePageInChapter,
              fromProgress: true 
            }
          });
        } else {
          // Continuar desde el tomo en la página exacta
          navigate(`/mangas/${slug}/${progressChapter.chapter_number}`, {
            state: { 
              startPage: mangaProgress.current_page,
              fromProgress: true 
            }
          });
        }
        return;
      }
    }

    // Si no hay progreso, comportamiento normal
    if (activeTab === "capitulos" && firstChapter) {
      const tomo = chapters.find((c) => c.id === firstChapter.tomoId);
      if (tomo) {
        navigate(`/mangas/${slug}/${tomo.chapter_number}`, {
          state: { viewMode: "chapter", chapterNumber: firstChapter.number }
        });
      }
    } else if (firstTomo) {
      navigate(`/mangas/${slug}/${firstTomo.chapter_number}`);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main>
        {/* Hero Section */}
        {manga.hero_banner_url && (
          <div
            className="relative w-full overflow-hidden aspect-[3/4] break-500:aspect-[4/3] break-800:aspect-auto break-800:h-[40vh] sm:break-800:h-[50vh] md:break-800:h-[60vh] lg:break-800:h-[70vh] xl:break-800:h-[80vh] bg-cover bg-center break-800:bg-top"
            style={{
              backgroundImage: (windowWidth < 500 && manga.mobile_hero_banner_url) 
                ? `url(${getProxiedImageUrl(manga.mobile_hero_banner_url)})` 
                : `url(${getProxiedImageUrl(manga.hero_banner_url)})`,
              backgroundPosition: windowWidth < 800 && !manga.mobile_hero_banner_url
                ? `${(manga as any).mobile_banner_focus || 'center'} center`
                : undefined,
            }}
          >
            {/* Gradient Overlay */}
            <div className="absolute inset-0 hidden break-800:block bg-gradient-to-r from-cr-black/75 via-cr-black/50 via-30% to-transparent to-55%"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-cr-black via-cr-black/80 via-10% to-transparent to-50%"></div>
            
            <div className="relative h-full flex flex-col justify-end items-center break-800:items-start pb-0 px-[20px] xs:px-[30px] break-800:pl-8 lg:px-[clamp(30px,5vw,78px)]">
              <div className="max-w-full break-800:max-w-[30vw] space-y-2 w-full break-800:w-auto text-center break-800:text-left">
                {/* Title */}
                <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl xl:text-7xl font-black text-foreground leading-tight drop-shadow-2xl break-800:pb-0">
                  {manga.title}
                </h1>

                {/* Action Buttons - Desktop Only */}
                <div className="hidden break-800:flex flex-col gap-2 pt-1 sm:pt-2 w-full break-800:w-auto">
                  <Button 
                    className="relative overflow-hidden bg-foreground/70 hover:bg-foreground text-cr-black w-full break-800:w-[400px] h-[52px] text-xs sm:text-sm font-bold rounded transition-all flex items-center justify-center"
                    onClick={handleReadClick}
                    disabled={!firstTomo && !firstChapter}
                  >
                    <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 fill-current" />
                    {getReadButtonText()}
                  </Button>
                  <div className="flex items-center gap-2">
                    <Button 
                      variant="outline" 
                      size="icon" 
                      className="w-[44px] h-[44px] border-2 border-foreground/30 bg-cr-black/50 text-foreground hover:bg-foreground hover:text-cr-black transition-all"
                      onClick={toggleList}
                      disabled={listLoading}
                    >
                      <Bookmark className={`w-4 h-4 ${isInList ? 'fill-current' : ''}`} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons - Mobile Only */}
        <div className="px-[20px] xs:px-[30px] pt-4 pb-2 break-800:hidden">
          <div className="flex flex-col gap-2">
            <Button 
              className="relative overflow-hidden bg-foreground/70 hover:bg-foreground text-cr-black w-full h-[52px] text-xs font-bold rounded transition-all flex items-center justify-center"
              onClick={handleReadClick}
              disabled={!firstTomo && !firstChapter}
            >
              <BookOpen className="w-4 h-4 mr-1 fill-current" />
              {getReadButtonText()}
            </Button>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="w-[44px] h-[44px] border-2 border-foreground/30 bg-background text-foreground hover:bg-foreground hover:text-cr-black transition-all"
                onClick={toggleList}
                disabled={listLoading}
              >
                <Bookmark className={`w-4 h-4 ${isInList ? 'fill-current' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Description Section */}
        <div className="px-[20px] xs:px-[30px] break-800:pl-8 lg:px-[clamp(30px,5vw,78px)] break-800:pt-[9px] pb-4 space-y-2">
          <p className="text-sm break-800:text-base text-foreground/90 text-center break-800:text-left line-clamp-3 break-800:max-w-2xl break-800:leading-relaxed">
            {manga.description || ""}
          </p>
        </div>

        
        <div className="pt-1 pb-8">

          {/* Tabs Section */}
          <div className="space-y-6">
          <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]">
            <div className="flex gap-6 border-b border-border">
              <button
                className={`py-2 font-bold transition-colors ${
                  activeTab === "tomos"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("tomos")}
              >
                Tomos ({chapters.length})
              </button>
              <button
                className={`py-2 font-bold transition-colors ${
                  activeTab === "capitulos"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("capitulos")}
              >
                Capítulos ({getAllChaptersFromTomos().length})
              </button>
            </div>
          </div>

          {/* Tomos Tab */}
          {activeTab === "tomos" && (
            <>
              {chapters.length > 0 ? (
                <MangaCarousel>
                  {chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="group cursor-pointer w-[calc((100vw-54px)/2.25)] xs:w-[calc((100vw-60px)/3.25)] md:w-[calc((100vw-80px)/4.25)] lg:w-[calc((100vw-100px)/5.5)] xl:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/5.25)] 3xl:w-[calc((100vw-156px)/6.25)]"
                      onClick={() => navigate(`/mangas/${slug}/${chapter.chapter_number}`)}
                    >
                      <div className="relative aspect-[2/3] bg-card [@media(hover:hover)]:group-hover:outline [@media(hover:hover)]:group-hover:outline-[2px] [@media(hover:hover)]:group-hover:outline-white [@media(hover:hover)]:group-hover:outline-offset-2 overflow-hidden">
                        {imageLoading[`tomo-${chapter.id}`] !== false && (
                          <Skeleton className="absolute inset-0 w-full h-full animate-pulse" />
                        )}
                        <img
                          src={getChapterCoverUrl(chapter)}
                          alt={`Tomo ${chapter.chapter_number}`}
                          className={`w-full h-full object-cover transition-opacity duration-300 ${
                            imageLoading[`tomo-${chapter.id}`] === false ? 'opacity-100' : 'opacity-0'
                          }`}
                          loading="lazy"
                          decoding="async"
                          onLoad={() => setImageLoading(prev => ({ ...prev, [`tomo-${chapter.id}`]: false }))}
                          onError={() => setImageLoading(prev => ({ ...prev, [`tomo-${chapter.id}`]: false }))}
                        />
                      </div>
                      <div className="mt-2">
                        <h3 className="font-bold text-foreground [@media(hover:hover)]:text-muted-foreground text-sm line-clamp-2 [@media(hover:hover)]:group-hover:text-primary transition-colors">
                          Tomo {chapter.chapter_number}
                          {chapter.title && `: ${chapter.title}`}
                        </h3>
                      </div>
                    </div>
                  ))}
                </MangaCarousel>
              ) : (
                <p className="text-muted-foreground px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]">No hay tomos disponibles</p>
              )}
            </>
          )}

          {/* Capítulos Tab */}
          {activeTab === "capitulos" && (
            <>
              {/* Controles de búsqueda y ordenamiento */}
              <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)] -mb-3">
                <div className="flex gap-2 items-center">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar por número o título..."
                      value={chapterSearch}
                      onChange={(e) => setChapterSearch(e.target.value)}
                      className="pl-10 bg-card border-border/50 focus:border-primary transition-colors"
                    />
                  </div>
                  <button
                    onClick={() => setChapterSortOrder(chapterSortOrder === "asc" ? "desc" : "asc")}
                    className="text-muted-foreground hover:text-primary transition-colors p-2 shrink-0"
                    title={chapterSortOrder === "asc" ? "Cambiar a Último → Primero" : "Cambiar a Primero → Último"}
                  >
                    <ArrowUpDown className="h-6 w-6" strokeWidth={2.5} />
                  </button>
                </div>
              </div>

              {getAllChaptersFromTomos().length > 0 ? (
                <MangaCarousel>
                  {getAllChaptersFromTomos().map((chapter) => {
                    const tomo = chapters.find((c) => c.id === chapter.tomoId);
                    if (!tomo) return null;

                    return (
                      <div
                        key={`${chapter.tomoId}-${chapter.number}`}
                        className="group cursor-pointer w-[calc((100vw-54px)/2.25)] xs:w-[calc((100vw-60px)/3.25)] md:w-[calc((100vw-80px)/4.25)] lg:w-[calc((100vw-100px)/5.5)] xl:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/5.25)] 3xl:w-[calc((100vw-156px)/6.25)]"
                        onClick={() => navigate(`/mangas/${slug}/${tomo.chapter_number}`, {
                          state: { viewMode: "chapter", chapterNumber: chapter.number }
                        })}
                      >
                        <div className="relative aspect-[2/3] bg-card [@media(hover:hover)]:group-hover:outline [@media(hover:hover)]:group-hover:outline-[2px] [@media(hover:hover)]:group-hover:outline-white [@media(hover:hover)]:group-hover:outline-offset-2 overflow-hidden">
                          {imageLoading[`chapter-${chapter.tomoId}-${chapter.number}`] !== false && (
                            <Skeleton className="absolute inset-0 w-full h-full animate-pulse" />
                          )}
                          <img
                            src={getChapterCoverUrl(tomo, chapter.start_page)}
                            alt={`Capítulo ${chapter.number}`}
                            className={`w-full h-full object-cover transition-opacity duration-300 ${
                              imageLoading[`chapter-${chapter.tomoId}-${chapter.number}`] === false ? 'opacity-100' : 'opacity-0'
                            }`}
                            loading="lazy"
                            decoding="async"
                            onLoad={() => setImageLoading(prev => ({ ...prev, [`chapter-${chapter.tomoId}-${chapter.number}`]: false }))}
                            onError={() => setImageLoading(prev => ({ ...prev, [`chapter-${chapter.tomoId}-${chapter.number}`]: false }))}
                          />
                        </div>
                        <div className="mt-2 space-y-1">
                          <h3 className="font-bold text-foreground [@media(hover:hover)]:text-muted-foreground text-sm line-clamp-2 [@media(hover:hover)]:group-hover:text-primary transition-colors">
                            Capítulo {chapter.number}
                            {chapter.title && `: ${chapter.title}`}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            Tomo {chapter.tomoNumber}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </MangaCarousel>
              ) : (
                <p className="text-muted-foreground px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]">No hay capítulos disponibles</p>
              )}
            </>
          )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default MangaDetail;
