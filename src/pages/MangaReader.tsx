import { useEffect, useState } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, Columns2, RectangleVertical, Maximize, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User } from "@supabase/supabase-js";

interface ChapterInfo {
  chapter_number: number;
  start_page: number;
  end_page?: number;
  title: string;
  first_page_single?: boolean;
}

interface GlobalChapterInfo extends ChapterInfo {
  tomo_number: number; // Número del tomo al que pertenece
  tomo_id: string; // ID del tomo
}

interface MangaTomo {
  id: string;
  manga_id: string;
  chapter_number: number;
  title: string;
  folder_url: string;
  total_pages: number;
  filename_pattern: string;
  default_view_mode: string;
  file_extensions?: string[];
  single_pages?: number[];
  chapters_info?: ChapterInfo[];
}

const MangaReader = () => {
  const { slug, chapterNumber } = useParams<{ slug: string; chapterNumber: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [tomo, setTomo] = useState<MangaTomo | null>(null);
  const [mangaId, setMangaId] = useState<string | null>(null);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [singlePageMode, setSinglePageMode] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [allChapters, setAllChapters] = useState<GlobalChapterInfo[]>([]); // Todos los capítulos del manga
  const [spreads, setSpreads] = useState<number[][]>([]); // Pares precomputados sin solapamientos
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"tomo" | "chapter">("tomo"); // Modo de vista
  const [currentChapterInfo, setCurrentChapterInfo] = useState<ChapterInfo | null>(null);
  const [user, setUser] = useState<User | null>(null);


  // Obtener usuario autenticado
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchTomo = async () => {
      if (!slug || !chapterNumber) return;

      setLoading(true);
      
      const { data: manga } = await supabase
        .from("mangas")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (!manga) {
        setLoading(false);
        return;
      }

      setMangaId(manga.id);

      // Cargar TODOS los tomos del manga para construir la lista completa de capítulos
      const { data: allTomos } = await supabase
        .from("manga_chapters")
        .select("*")
        .eq("manga_id", manga.id)
        .order("chapter_number", { ascending: true });

      // Construir lista global de capítulos
      const globalChapters: GlobalChapterInfo[] = [];
      if (allTomos) {
        allTomos.forEach(tomo => {
          const chaptersInfo = (tomo.chapters_info as unknown) as ChapterInfo[] | undefined;
          if (chaptersInfo && chaptersInfo.length > 0) {
            chaptersInfo.forEach(ch => {
              globalChapters.push({
                ...ch,
                tomo_number: tomo.chapter_number,
                tomo_id: tomo.id
              });
            });
          }
        });
      }
      setAllChapters(globalChapters);

      // Cargar el tomo actual
      const { data: tomoData } = await supabase
        .from("manga_chapters")
        .select("*")
        .eq("manga_id", manga.id)
        .eq("chapter_number", parseFloat(chapterNumber))
        .maybeSingle();

      if (tomoData) {
        const tomoTyped: MangaTomo = {
          ...tomoData,
          chapters_info: (tomoData.chapters_info as unknown) as ChapterInfo[] | undefined
        } as MangaTomo;
        setTomo(tomoTyped);
        
        // Detectar si viene del modo capítulos o tomos, o recuperar de localStorage
        const state = location.state as { startPage?: number; viewMode?: "tomo" | "chapter"; chapterNumber?: number; fromProgress?: boolean } | null;
        
        // Intentar recuperar viewMode de localStorage si no viene en el state
        let mode: "tomo" | "chapter" = state?.viewMode || "tomo";
        let chapterNumberToLoad = state?.chapterNumber;
        
        if (!state?.viewMode && manga.id) {
          const savedViewMode = localStorage.getItem(`manga_${manga.id}_viewMode`);
          if (savedViewMode) {
            try {
              const parsed = JSON.parse(savedViewMode);
              mode = parsed.mode;
              chapterNumberToLoad = parsed.chapterNumber;
            } catch (e) {
              // Ignorar errores de parsing
            }
          }
        }
        
        setViewMode(mode);
        
        let shouldLoadProgress = !state?.fromProgress && state?.startPage === undefined;
        let targetPage = 0;

        // Si viene de modo capítulos, encontrar el capítulo específico y configurar totalPages
        if (mode === "chapter" && chapterNumberToLoad && tomoTyped.chapters_info) {
          const chapter = tomoTyped.chapters_info.find(ch => ch.chapter_number === chapterNumberToLoad);
          if (chapter) {
            setCurrentChapterInfo(chapter);
            const endPage = chapter.end_page || tomoTyped.total_pages;
            const chapterPages = endPage - chapter.start_page + 1;
            setTotalPages(chapterPages);
            
            // Si viene con una página específica (incluyendo desde progreso)
            if (state?.startPage !== undefined) {
              targetPage = state.startPage - 1; // La página relativa al capítulo
              shouldLoadProgress = false;
            }
          } else {
            setTotalPages(tomoTyped.total_pages);
          }
        } else {
          setTotalPages(tomoTyped.total_pages);
          setCurrentChapterInfo(null);
          
          // Si hay una página de inicio en el estado de navegación (modo tomo)
          if (state?.startPage !== undefined) {
            targetPage = state.startPage - 1;
            shouldLoadProgress = false;
          }
        }

        // Cargar progreso si el usuario está logueado y no viene de un enlace específico
        if (user && shouldLoadProgress) {
          const { data: progress } = await supabase
            .from("manga_progress")
            .select("*")
            .eq("manga_id", manga.id)
            .eq("user_id", user.id)
            .maybeSingle();

          if (progress && progress.chapter_id === tomoTyped.id) {
            targetPage = progress.current_page - 1;
          }
        }

        setCurrentPageIndex(targetPage);
        
        // En móviles siempre vista simple, en desktop según configuración
        setSinglePageMode(isMobile || tomoTyped.default_view_mode === "single");
        
        // Limpiar el estado para que no se aplique en recargas
        window.history.replaceState({}, document.title);
      }
      
      setLoading(false);
    };

    fetchTomo();
  }, [slug, chapterNumber, isMobile, location.state, user]);

  // Efecto adicional para forzar vista simple en móviles cuando cambia isMobile
  useEffect(() => {
    if (isMobile) {
      setSinglePageMode(true);
    }
  }, [isMobile]);

  const isSinglePage = (pageIndex: number) => {
    // single_pages está en 0-indexed en la BD
    // pageIndex ya es 0-indexed tanto en modo tomo como capítulo
    
    // En modo capítulo, verificar si es la primera página del capítulo y está marcada como individual
    if (viewMode === "chapter" && currentChapterInfo && pageIndex === 0 && currentChapterInfo.first_page_single) {
      return true;
    }
    
    // Convertir pageIndex a índice absoluto del tomo para verificar single_pages
    const absoluteIndex = viewMode === "chapter" && currentChapterInfo 
      ? currentChapterInfo.start_page - 1 + pageIndex 
      : pageIndex;
    return tomo?.single_pages?.includes(absoluteIndex) || false;
  };

  // Construir spreads sin solapamientos (RTL):
  // - Si la página es "sola" -> [i]
  // - Si la siguiente NO es "sola" -> [i+1, i]
  // - En otro caso -> [i]
  const buildSpreads = (): number[][] => {
    const s: number[][] = [];
    if (!tomo) return s;
    let i = 0;
    while (i < totalPages) {
      if (isSinglePage(i)) {
        s.push([i]);
        i += 1;
        continue;
      }
      if (i + 1 < totalPages && !isSinglePage(i + 1)) {
        s.push([i + 1, i]); // izquierda = mayor índice
        i += 2;
      } else {
        s.push([i]);
        i += 1;
      }
    }
    return s;
  };

  // Recalcular spreads cuando cambia el tomo, total de páginas, viewMode o currentChapterInfo
  useEffect(() => {
    const s = buildSpreads();
    setSpreads(s);
    // Ajustar spreadIndex para incluir la página actual
    const idx = s.findIndex(sp => sp.includes(currentPageIndex));
    if (idx >= 0) setSpreadIndex(idx);
    else setSpreadIndex(0);
  }, [tomo, totalPages, viewMode, currentChapterInfo]);

  // Al salir de modo simple, sincronizar spreadIndex con la página actual
  useEffect(() => {
    if (!singlePageMode && spreads.length > 0) {
      const idx = spreads.findIndex(sp => sp.includes(currentPageIndex));
      if (idx >= 0) setSpreadIndex(idx);
    }
  }, [singlePageMode]);
  const goToNextPage = () => {
    if (singlePageMode) {
      // En modo simple, siempre avanzar de 1 en 1
      if (currentPageIndex + 1 < totalPages) {
        setCurrentPageIndex(currentPageIndex + 1);
      } else if (viewMode === "chapter" && currentChapterInfo && allChapters.length > 0) {
        // Si estamos en la última página del capítulo, ir al siguiente capítulo
        const currentChapterIndex = allChapters.findIndex(ch => ch.chapter_number === currentChapterInfo.chapter_number);
        if (currentChapterIndex >= 0 && currentChapterIndex < allChapters.length - 1) {
          const nextChapter = allChapters[currentChapterIndex + 1];
          navigate(`/mangas/${slug}/${nextChapter.tomo_number}`, {
            state: { viewMode: "chapter", chapterNumber: nextChapter.chapter_number }
          });
        }
      }
      return;
    }
    // En vista doble, avanzar por spreads sin solapamientos
    if (spreadIndex + 1 < spreads.length) {
      const nextIdx = spreadIndex + 1;
      setSpreadIndex(nextIdx);
      const nextSpread = spreads[nextIdx];
      setCurrentPageIndex(Math.min(...nextSpread));
    } else if (viewMode === "chapter" && currentChapterInfo && allChapters.length > 0) {
      // Si estamos en el último spread del capítulo, ir al siguiente capítulo
      const currentChapterIndex = allChapters.findIndex(ch => ch.chapter_number === currentChapterInfo.chapter_number);
      if (currentChapterIndex >= 0 && currentChapterIndex < allChapters.length - 1) {
        const nextChapter = allChapters[currentChapterIndex + 1];
        navigate(`/mangas/${slug}/${nextChapter.tomo_number}`, {
          state: { viewMode: "chapter", chapterNumber: nextChapter.chapter_number }
        });
      }
    }
  };

  const goToPrevPage = () => {
    if (singlePageMode) {
      // En modo simple, siempre retroceder de 1 en 1
      if (currentPageIndex > 0) {
        setCurrentPageIndex(currentPageIndex - 1);
      } else if (viewMode === "chapter" && currentChapterInfo && allChapters.length > 0) {
        // Si estamos en la primera página del capítulo, ir al capítulo anterior
        const currentChapterIndex = allChapters.findIndex(ch => ch.chapter_number === currentChapterInfo.chapter_number);
        if (currentChapterIndex > 0) {
          const prevChapter = allChapters[currentChapterIndex - 1];
          navigate(`/mangas/${slug}/${prevChapter.tomo_number}`, {
            state: { viewMode: "chapter", chapterNumber: prevChapter.chapter_number }
          });
        }
      }
      return;
    }
    // En vista doble, retroceder por spreads sin solapamientos
    if (spreadIndex - 1 >= 0) {
      const prevIdx = spreadIndex - 1;
      setSpreadIndex(prevIdx);
      const prevSpread = spreads[prevIdx];
      setCurrentPageIndex(Math.min(...prevSpread));
    } else if (viewMode === "chapter" && currentChapterInfo && allChapters.length > 0) {
      // Si estamos en el primer spread del capítulo, ir al capítulo anterior
      const currentChapterIndex = allChapters.findIndex(ch => ch.chapter_number === currentChapterInfo.chapter_number);
      if (currentChapterIndex > 0) {
        const prevChapter = allChapters[currentChapterIndex - 1];
        navigate(`/mangas/${slug}/${prevChapter.tomo_number}`, {
          state: { viewMode: "chapter", chapterNumber: prevChapter.chapter_number }
        });
      }
    }
  };

  const getImageUrl = (pageIndex: number, extensionIndex: number = 0) => {
    if (!tomo) return "";
    
    const pattern = tomo.filename_pattern || "000";
    const extensions = tomo.file_extensions || ['webp', 'jpg', 'png'];
    const ext = extensions[extensionIndex] || extensions[0];
    
    // Calcular el número de archivo real basado en si estamos en modo capítulo o tomo
    let fileNumber: number;
    if (viewMode === "chapter" && currentChapterInfo) {
      // En modo capítulo, sumar el índice de página al start_page del capítulo
      fileNumber = currentChapterInfo.start_page + pageIndex;
    } else {
      // En modo tomo, los archivos empiezan desde 1
      fileNumber = pageIndex + 1;
    }
    let filename: string;
    
    switch (pattern) {
      case "0":
        filename = `${fileNumber}`;
        break;
      case "00":
        filename = fileNumber.toString().padStart(2, "0");
        break;
      case "0000":
        filename = fileNumber.toString().padStart(4, "0");
        break;
      case "000":
      default:
        filename = fileNumber.toString().padStart(3, "0");
        break;
    }
    
    const baseUrl = tomo.folder_url.endsWith('/') ? tomo.folder_url : `${tomo.folder_url}/`;
    return `${baseUrl}${filename}.${ext}`;
  };

  const [imageErrors, setImageErrors] = useState<Record<number, number>>({});

  const handleImageError = (pageIndex: number) => {
    if (!tomo) return;
    
    const currentExtIndex = imageErrors[pageIndex] || 0;
    const extensions = tomo.file_extensions || ['webp', 'jpg', 'png'];
    
    if (currentExtIndex < extensions.length - 1) {
      // Intentar con la siguiente extensión
      setImageErrors(prev => ({ ...prev, [pageIndex]: currentExtIndex + 1 }));
    }
  };

  // Precargar imágenes siguientes
  useEffect(() => {
    if (!tomo || totalPages === 0) return;
    
    const preloadImages = () => {
      if (singlePageMode) {
        const limit = 8;
        for (let i = 1; i <= limit; i++) {
          const nextPageIndex = currentPageIndex + i;
          if (nextPageIndex < totalPages) {
            const img = new Image();
            const extIndex = imageErrors[nextPageIndex] || 0;
            img.src = getImageUrl(nextPageIndex, extIndex);
          }
        }
      } else {
        const nextSpreads = [spreads[spreadIndex + 1], spreads[spreadIndex + 2]].filter(Boolean) as number[][];
        nextSpreads.flat().forEach((idx) => {
          if (idx < totalPages) {
            const img = new Image();
            const extIndex = imageErrors[idx] || 0;
            img.src = getImageUrl(idx, extIndex);
          }
        });
      }
    };

    preloadImages();
  }, [currentPageIndex, spreadIndex, spreads, tomo, totalPages, singlePageMode, imageErrors]);

  // Guardar progreso cuando cambia la página, incluyendo el viewMode
  useEffect(() => {
    const saveProgress = async () => {
      if (!user || !tomo || !mangaId) return;

      const actualPage = viewMode === "chapter" && currentChapterInfo 
        ? currentChapterInfo.start_page + currentPageIndex 
        : currentPageIndex + 1;

      const currentChapterNum = viewMode === "chapter" && currentChapterInfo
        ? currentChapterInfo.chapter_number
        : tomo.chapter_number;

      await supabase.from("manga_progress").upsert({
        user_id: user.id,
        manga_id: mangaId,
        chapter_id: tomo.id,
        current_page: actualPage,
        total_pages: tomo.total_pages,
        last_chapter_number: currentChapterNum,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "user_id,manga_id"
      });
      
      // Guardar viewMode en localStorage para mantenerlo al recargar
      if (viewMode === "chapter" && currentChapterInfo) {
        localStorage.setItem(`manga_${mangaId}_viewMode`, JSON.stringify({
          mode: "chapter",
          chapterNumber: currentChapterInfo.chapter_number
        }));
      } else {
        localStorage.removeItem(`manga_${mangaId}_viewMode`);
      }
    };

    const debounceTimeout = setTimeout(saveProgress, 1000);
    return () => clearTimeout(debounceTimeout);
  }, [currentPageIndex, user, tomo, mangaId, viewMode, currentChapterInfo]);

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        goToNextPage();
      } else if (e.key === "ArrowLeft") {
        goToPrevPage();
      }
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [currentPageIndex, totalPages]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Cargando...</p>
      </div>
    );
  }

  if (!tomo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Tomo no encontrado</p>
      </div>
    );
  }

  // Determinar si hay página siguiente o anterior
  const hasNext = singlePageMode 
    ? currentPageIndex + 1 < totalPages
    : spreadIndex + 1 < spreads.length;
  
  const hasPrev = singlePageMode
    ? currentPageIndex > 0
    : spreadIndex > 0;
  
  // Verificar si estamos en la última página del capítulo en modo chapter
  const isLastPageOfChapter = viewMode === "chapter" && currentChapterInfo && allChapters.length > 0 && !hasNext;
  const hasNextChapter = isLastPageOfChapter && allChapters.findIndex(ch => ch.chapter_number === currentChapterInfo.chapter_number) < allChapters.length - 1;
  
  // Verificar si estamos en la primera página del capítulo en modo chapter
  const isFirstPageOfChapter = viewMode === "chapter" && currentChapterInfo && allChapters.length > 0 && currentPageIndex === 0;
  const hasPrevChapter = isFirstPageOfChapter && allChapters.findIndex(ch => ch.chapter_number === currentChapterInfo.chapter_number) > 0;

  // Calcula qué páginas mostrar en vista doble (orden RTL: izquierda, derecha)
  const getDisplayIndices = () => {
    if (singlePageMode) return [currentPageIndex];
    if (spreads.length === 0) return [currentPageIndex];
    return spreads[Math.min(spreadIndex, spreads.length - 1)];
  };

  const displayIndices = getDisplayIndices();

  const handleScreenClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const screenWidth = window.innerWidth;
    const clickX = e.clientX;
    
    // Lectura oriental (RTL): izquierda = avanzar, derecha = retroceder
    if (clickX < screenWidth / 2) {
      goToNextPage(); // Click izquierdo avanza
    } else {
      goToPrevPage(); // Click derecho retrocede
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    // Lectura oriental RTL: swipe derecha = avanzar, swipe izquierda = retroceder
    if (isRightSwipe) {
      goToNextPage();
    } else if (isLeftSwipe) {
      goToPrevPage();
    }
  };


  // Obtener el capítulo actual basado en la página
  const getCurrentChapter = () => {
    if (viewMode === "chapter" && currentChapterInfo) {
      return currentChapterInfo;
    }
    
    if (!tomo?.chapters_info || tomo.chapters_info.length === 0) return null;
    
    const actualPage = currentPageIndex + 1; // Convertir de 0-indexed a 1-indexed
    return tomo.chapters_info.find(ch => {
      const endPage = ch.end_page || tomo.total_pages;
      return actualPage >= ch.start_page && actualPage <= endPage;
    });
  };

  const currentChapter = getCurrentChapter();

  const handleChapterSelect = (chapterNum: string) => {
    if (allChapters.length === 0) return;
    
    const chapter = allChapters.find(ch => ch.chapter_number.toString() === chapterNum);
    if (!chapter) return;
    
    // Si estamos en modo capítulo, mantener el modo capítulo
    if (viewMode === "chapter") {
      navigate(`/mangas/${slug}/${chapter.tomo_number}`, {
        state: { viewMode: "chapter", chapterNumber: chapter.chapter_number }
      });
    } else {
      // Verificar si el capítulo está en el tomo actual o en otro
      if (tomo && chapter.tomo_id === tomo.id) {
        // El capítulo está en el tomo actual, solo cambiar la página
        const targetPage = chapter.start_page - 1;
        setCurrentPageIndex(targetPage);
        if (!singlePageMode && spreads.length > 0) {
          const idx = spreads.findIndex(sp => sp.includes(targetPage));
          if (idx >= 0) setSpreadIndex(idx);
        }
      } else {
        // El capítulo está en otro tomo, navegar a ese tomo con la página de inicio del capítulo
        navigate(`/mangas/${slug}/${chapter.tomo_number}`, {
          state: { startPage: chapter.start_page }
        });
      }
    }
  };

  return (
    <div className="min-h-screen h-screen overflow-hidden bg-black select-none flex">
      {/* Left Sidebar */}
      {showSidebar && !isMobile && (
        <div className="w-56 bg-background/95 backdrop-blur-sm border-r border-border/50 hidden min-[1400px]:flex flex-col pointer-events-auto z-20">
          <div className="p-4 border-b border-border/50">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/mangas/${slug}`);
              }}
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-transparent transition-all font-bold text-sm"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Volver
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              {allChapters.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2 text-foreground flex items-center gap-2">
                    <List className="w-4 h-4" />
                    Capítulos
                  </h3>
                  <Select 
                    value={currentChapter?.chapter_number.toString() || ""} 
                    onValueChange={handleChapterSelect}
                  >
                    <SelectTrigger className="w-full bg-background">
                      <SelectValue placeholder="Seleccionar capítulo" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border-border z-50">
                      {allChapters.map((chapter) => (
                        <SelectItem 
                          key={`${chapter.tomo_id}-${chapter.chapter_number}`} 
                          value={chapter.chapter_number.toString()}
                          className="cursor-pointer"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">Capítulo {chapter.chapter_number}</span>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {chapter.title && <span>{chapter.title}</span>}
                              <span className="text-primary/60">• Tomo {chapter.tomo_number}</span>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar for <1400px (replaces sidebar) */}
        <div 
          className="hidden max-[1399px]:grid grid-cols-3 items-center bg-background/95 backdrop-blur-sm border-b border-border/50 px-2 sm:px-4 pointer-events-auto flex-shrink-0" 
          style={{
            height: 'calc(56px + env(safe-area-inset-top))',
            paddingTop: 'env(safe-area-inset-top)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-start">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => { e.stopPropagation(); navigate(`/mangas/${slug}`); }}
              className="justify-start text-muted-foreground hover:text-foreground hover:bg-transparent transition-all font-bold text-xs sm:text-sm"
            >
              <ChevronLeft className="w-4 h-4 sm:mr-2" />
              <span className="hidden sm:inline">Volver</span>
            </Button>
          </div>

          <div className="flex items-center justify-center">
            {allChapters.length > 0 && (
              <Select 
                value={currentChapter?.chapter_number.toString() || ""} 
                onValueChange={handleChapterSelect}
              >
                <SelectTrigger className="w-32 sm:w-40 bg-background">
                  <SelectValue placeholder="Capítulo" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  {allChapters.map((chapter) => (
                    <SelectItem 
                      key={`${chapter.tomo_id}-${chapter.chapter_number}`} 
                      value={chapter.chapter_number.toString()}
                      className="cursor-pointer"
                    >
                      Cap. {chapter.chapter_number}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSinglePageMode(!singlePageMode)}
              disabled={isMobile}
              className={`text-muted-foreground hover:text-foreground hover:bg-transparent transition-all font-bold text-xs sm:text-sm ${isMobile ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {singlePageMode ? (
                <>
                  <Columns2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Vista Doble</span>
                </>
              ) : (
                <>
                  <RectangleVertical className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Vista Simple</span>
                </>
              )}
            </Button>
          </div>
        </div>

        <div 
          className="flex-1 w-full flex items-center justify-center bg-black cursor-pointer select-none overflow-hidden"
          onClick={handleScreenClick}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Page display - single or double */}
          <div className="flex h-full w-full items-center justify-center gap-1">
            {displayIndices.length === 1 ? (
              /* Modo de una sola página o página marcada como individual */
              <img
                src={getImageUrl(displayIndices[0], imageErrors[displayIndices[0]] || 0)}
                alt={`Página ${displayIndices[0] + 1} de ${totalPages}`}
                className="max-h-full max-w-full object-contain pointer-events-none select-none"
                onError={() => handleImageError(displayIndices[0])}
                onDragStart={(e) => e.preventDefault()}
                loading="eager"
              />
            ) : (
              /* Vista doble con emparejamiento inteligente (RTL) */
              <>
                {/* Página izquierda (la de mayor número en RTL) */}
                <img
                  src={getImageUrl(displayIndices[0], imageErrors[displayIndices[0]] || 0)}
                  alt={`Página ${displayIndices[0] + 1} de ${totalPages}`}
                  className="max-h-full max-w-[50%] object-contain pointer-events-none select-none"
                  onError={() => handleImageError(displayIndices[0])}
                  onDragStart={(e) => e.preventDefault()}
                  loading="eager"
                />
                {/* Página derecha */}
                <img
                  src={getImageUrl(displayIndices[1], imageErrors[displayIndices[1]] || 0)}
                  alt={`Página ${displayIndices[1] + 1} de ${totalPages}`}
                  className="max-h-full max-w-[50%] object-contain pointer-events-none select-none"
                  onError={() => handleImageError(displayIndices[1])}
                  onDragStart={(e) => e.preventDefault()}
                  loading="eager"
                />
              </>
            )}
          </div>
        </div>

        {/* Bottom Bar - Full Width */}
        <div className="h-14 bg-background/95 backdrop-blur-sm border-t border-border/50 flex items-center justify-center px-2 sm:px-4 md:px-6 pointer-events-auto flex-shrink-0 relative" onClick={(e) => e.stopPropagation()}>
          {/* View Mode Toggle - Left (only visible on screens >= 1400px) */}
          <div className="absolute left-2 sm:left-4 md:left-6 hidden min-[1400px]:flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSinglePageMode(!singlePageMode)}
              disabled={isMobile}
              className={`text-muted-foreground hover:text-foreground hover:bg-transparent transition-all ${isMobile ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {singlePageMode ? (
                <>
                  <Columns2 className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Vista Doble</span>
                </>
              ) : (
                <>
                  <RectangleVertical className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Vista Simple</span>
                </>
              )}
            </Button>
          </div>

          {/* Navigation - Center */}
          <div className="grid grid-cols-3 items-center gap-4 w-full max-w-4xl">
            {/* Left: Next button */}
            <div className="flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToNextPage}
                disabled={!hasNext && !hasNextChapter}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent transition-all font-bold text-xs sm:text-sm disabled:text-muted-foreground/50 disabled:hover:text-muted-foreground/50 whitespace-nowrap"
              >
                <ChevronLeft className="w-4 h-4 sm:mr-1" />
                <span className="hidden sm:inline">Siguiente</span>
              </Button>
            </div>

            {/* Center: Page counter - always centered */}
            <div className="flex justify-center">
              <span className="text-foreground font-bold text-xs sm:text-sm whitespace-nowrap">
                {displayIndices.length === 1
                  ? `${displayIndices[0] + 1} / ${totalPages}`
                  : `${Math.min(displayIndices[0], displayIndices[1]) + 1} - ${Math.max(displayIndices[0], displayIndices[1]) + 1} / ${totalPages}`
                }
              </span>
            </div>

            {/* Right: Previous button */}
            <div className="flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={goToPrevPage}
                disabled={!hasPrev && !hasPrevChapter}
                className="text-muted-foreground hover:text-foreground hover:bg-transparent transition-all font-bold text-xs sm:text-sm disabled:text-muted-foreground/50 disabled:hover:text-muted-foreground/50 whitespace-nowrap"
              >
                <span className="hidden sm:inline">Anterior</span>
                <ChevronRight className="w-4 h-4 sm:ml-1" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MangaReader;
