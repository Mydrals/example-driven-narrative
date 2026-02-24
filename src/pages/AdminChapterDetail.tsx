import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, Eye, ChevronLeft, ChevronRight, X, Plus, Trash, RectangleVertical } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { useUserRole } from "@/contexts/UserRoleContext";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const AdminChapterDetail = () => {
  const { id, chapterId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { isAdmin, loading: roleLoading } = useUserRole();

  const [formData, setFormData] = useState({
    chapter_number: "",
    title: "",
    folder_url: "",
    total_pages: "",
    filename_pattern: "000",
    default_view_mode: "double",
    single_pages: "",
  });
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
  const [initialChaptersInfo, setInitialChaptersInfo] = useState<string>("");
  const [chaptersInfo, setChaptersInfo] = useState<Array<{
    chapter_number: number;
    start_page: number;
    end_page?: number;
    title: string;
    first_page_single?: boolean;
  }>>([]);
  const [detecting, setDetecting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [currentViewPage, setCurrentViewPage] = useState(0);
  const [suggestedChapterNumber, setSuggestedChapterNumber] = useState<number | null>(null);
  const [imageAspectRatios, setImageAspectRatios] = useState<Record<number, number>>({});
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  const [exitDestination, setExitDestination] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"info" | "chapters" | "preview">("info");

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    };

    checkSession();
  }, [navigate]);

  useEffect(() => {
    if (!roleLoading && !isAdmin && user) {
      navigate("/profile");
    }
  }, [isAdmin, roleLoading, user, navigate]);

  useEffect(() => {
    const fetchChapter = async () => {
      if (!chapterId || chapterId === "new") {
        // Si es nuevo, buscar el último capítulo de todos los tomos anteriores
        try {
          const { data: allChapters } = await supabase
            .from("manga_chapters")
            .select("chapters_info")
            .eq("manga_id", id)
            .order("chapter_number", { ascending: false });

          if (allChapters && allChapters.length > 0) {
            let maxChapterNum = 0;
            allChapters.forEach((chapter) => {
              const chaptersInfo = (chapter as any).chapters_info as Array<{chapter_number: number}>;
              if (chaptersInfo && chaptersInfo.length > 0) {
                chaptersInfo.forEach((ch) => {
                  if (ch.chapter_number > maxChapterNum) {
                    maxChapterNum = ch.chapter_number;
                  }
                });
              }
            });
            if (maxChapterNum > 0) {
              setSuggestedChapterNumber(maxChapterNum + 1);
            }
          }
        } catch (error) {
          console.error("Error fetching previous chapters:", error);
        }
        setInitialFormData(formData);
        setInitialChaptersInfo(JSON.stringify([]));
        setLoading(false);
        return;
      }

      try {
        const { data: chapter, error } = await supabase
          .from("manga_chapters")
          .select("*")
          .eq("id", chapterId)
          .single();

        if (error) throw error;

        const loadedFormData = {
          chapter_number: chapter.chapter_number?.toString() || "",
          title: chapter.title || "",
          folder_url: chapter.folder_url || "",
          total_pages: chapter.total_pages?.toString() || "",
          filename_pattern: chapter.filename_pattern || "000",
          default_view_mode: chapter.default_view_mode || "double",
          single_pages: (chapter as any).single_pages ? (chapter as any).single_pages.map((p: number) => p + 1).join(", ") : "",
        };
        
        setFormData(loadedFormData);
        setInitialFormData(loadedFormData);
        
        // Cargar información de capítulos
        if ((chapter as any).chapters_info) {
          setChaptersInfo((chapter as any).chapters_info);
          setInitialChaptersInfo(JSON.stringify((chapter as any).chapters_info));
        } else {
          setInitialChaptersInfo(JSON.stringify([]));
        }
      } catch (error) {
        console.error("Error fetching chapter:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar el tomo",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin && user) {
      fetchChapter();
    }
  }, [chapterId, isAdmin, user, toast, id]);

  const handleSave = async () => {
    if (!formData.chapter_number || !formData.folder_url || !formData.total_pages) {
      toast({
        title: "Error",
        description: "El número de tomo, URL de carpeta y total de páginas son obligatorios",
        variant: "destructive",
      });
      return;
    }

    const chapterNum = parseFloat(formData.chapter_number);
    if (isNaN(chapterNum) || chapterNum <= 0) {
      toast({
        title: "Error",
        description: "El número de tomo debe ser un número válido mayor que 0",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      // Parse single_pages from comma-separated string to array (convert from 1-indexed to 0-indexed)
      const singlePagesArray = formData.single_pages
        ? formData.single_pages.split(",").map(p => parseInt(p.trim()) - 1).filter(p => !isNaN(p) && p >= 0)
        : [];

      // Calcular end_page automáticamente si no está especificado
      const processedChaptersInfo = chaptersInfo
        .sort((a, b) => a.start_page - b.start_page)
        .map((chapter, index, array) => {
          if (chapter.end_page !== undefined && chapter.end_page > 0) {
            return chapter as any;
          }
          // Si no hay end_page, calcular automáticamente
          const nextChapter = array[index + 1];
          const autoEndPage = nextChapter ? nextChapter.start_page - 1 : parseInt(formData.total_pages);
          return { ...chapter, end_page: autoEndPage } as any;
        });

      // Normalizar chapter_number a número (soporta strings como "0.1")
      const normalizedChaptersInfo = processedChaptersInfo.map((ch: any) => ({
        ...ch,
        chapter_number: typeof ch.chapter_number === 'string' ? parseFloat(ch.chapter_number) : ch.chapter_number,
      }));

      if (chapterId === "new") {
        const { error } = await supabase.from("manga_chapters").insert([
          {
            manga_id: id,
            chapter_number: chapterNum,
            title: formData.title,
            folder_url: formData.folder_url,
            total_pages: parseInt(formData.total_pages),
            filename_pattern: formData.filename_pattern,
            default_view_mode: formData.default_view_mode,
            single_pages: singlePagesArray,
            chapters_info: normalizedChaptersInfo,
          },
        ]);

        if (error) throw error;

        toast({
          title: "Tomo creado",
          description: "El tomo se ha creado correctamente",
        });
        navigate(`/admin/manga/${id}`);
      } else {
        const { error } = await supabase
          .from("manga_chapters")
          .update({
            chapter_number: chapterNum,
            title: formData.title,
            folder_url: formData.folder_url,
            total_pages: parseInt(formData.total_pages),
            filename_pattern: formData.filename_pattern,
            default_view_mode: formData.default_view_mode,
            single_pages: singlePagesArray,
            chapters_info: normalizedChaptersInfo,
          })
          .eq("id", chapterId);

        if (error) throw error;

        toast({
          title: "Tomo actualizado",
          description: "Los cambios se han guardado correctamente",
        });
      }
    } catch (error: any) {
      console.error("Error saving chapter:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el tomo",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const detectTotalPages = async () => {
    if (!formData.folder_url) {
      toast({
        title: "Error",
        description: "Primero ingresa la URL de la carpeta",
        variant: "destructive",
      });
      return;
    }

    setDetecting(true);
    let pageCount = 0;
    let detectedPattern = "000";

    try {
      const baseUrl = formData.folder_url.endsWith("/")
        ? formData.folder_url.slice(0, -1)
        : formData.folder_url;

      // Detectar el patrón probando diferentes formatos
      const patterns = [
        { pattern: "0", format: (n: number) => `${n}` },
        { pattern: "00", format: (n: number) => n.toString().padStart(2, "0") },
        { pattern: "000", format: (n: number) => n.toString().padStart(3, "0") },
        { pattern: "0000", format: (n: number) => n.toString().padStart(4, "0") },
      ];

      let foundPattern = null;

      // Encontrar el patrón que funciona (comenzar desde 1, no desde 0)
      for (const { pattern, format } of patterns) {
        const testUrl = `${baseUrl}/${format(1)}.webp`;
        try {
          const response = await fetch(testUrl, { method: "HEAD" });
          if (response.ok) {
            foundPattern = { pattern, format };
            detectedPattern = pattern;
            break;
          }
        } catch (error) {
          continue;
        }
      }

      if (!foundPattern) {
        toast({
          title: "No se encontraron páginas",
          description: "Verifica que la URL sea correcta y las imágenes tengan formato numérico (001.webp, 002.webp, 003.webp, etc.)",
          variant: "destructive",
        });
        setDetecting(false);
        return;
      }

      // Usar búsqueda binaria para encontrar el último archivo más rápidamente
      // Los archivos comienzan desde 1, no desde 0
      let low = 1;
      let high = 1000;
      let lastFound = 0;

      while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const imageUrl = `${baseUrl}/${foundPattern.format(mid)}.webp`;

        try {
          const response = await fetch(imageUrl, { method: "HEAD" });
          if (response.ok) {
            lastFound = mid;
            low = mid + 1;
          } else {
            high = mid - 1;
          }
        } catch (error) {
          high = mid - 1;
        }
      }

      pageCount = lastFound;

      if (pageCount > 0) {
        setFormData({ 
          ...formData, 
          total_pages: pageCount.toString(),
          filename_pattern: detectedPattern 
        });
        toast({
          title: "Páginas detectadas",
          description: `Se encontraron ${pageCount} páginas con patrón "${detectedPattern}"`,
        });
      } else {
        toast({
          title: "No se encontraron páginas",
          description: "Verifica que la URL sea correcta",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error("Error detecting pages:", error);
      toast({
        title: "Error",
        description: "No se pudo detectar las páginas. Verifica la URL.",
        variant: "destructive",
      });
    } finally {
      setDetecting(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("manga_chapters")
        .delete()
        .eq("id", chapterId);

      if (error) throw error;

      toast({
        title: "Tomo eliminado",
        description: "El tomo se ha eliminado correctamente",
      });
      navigate(`/admin/manga/${id}`);
    } catch (error: any) {
      console.error("Error deleting chapter:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el tomo",
        variant: "destructive",
      });
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  const isIOSPWA = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    return isIOS && isStandalone;
  };

  const generateImageUrl = (pageIndex: number) => {
    if (!formData.folder_url || !formData.filename_pattern) return "";
    const baseUrl = formData.folder_url.endsWith("/")
      ? formData.folder_url.slice(0, -1)
      : formData.folder_url;
    const paddedNumber = (pageIndex + 1).toString().padStart(formData.filename_pattern.length, "0");
    return `${baseUrl}/${paddedNumber}.webp`;
  };

  const handleImageLoad = (pageIndex: number, event: React.SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    const aspectRatio = img.naturalWidth / img.naturalHeight;
    setImageAspectRatios(prev => ({ ...prev, [pageIndex]: aspectRatio }));
  };

  const addChapterFromPage = (pageNumber: number) => {
    // Calcular el máximo número de capítulo considerando:
    // 1. El suggestedChapterNumber (último capítulo de tomos anteriores + 1)
    // 2. Los capítulos ya agregados en este tomo
    const maxFromCurrentTomo = chaptersInfo.length > 0 
      ? Math.max(...chaptersInfo.map(ch => ch.chapter_number))
      : 0;
    
    const maxGlobal = suggestedChapterNumber || 0;
    
    // Usar el máximo entre ambos y sumar 1
    const newChapterNumber = Math.max(maxFromCurrentTomo, maxGlobal - 1) + 1;
    
    setChaptersInfo([...chaptersInfo, { 
      chapter_number: newChapterNumber, 
      start_page: pageNumber, 
      title: "" 
    }]);
    
    toast({
      title: "Capítulo agregado",
      description: `Capítulo ${newChapterNumber} agregado en la página ${pageNumber}`,
    });
  };

  const toggleSinglePage = (pageNumber: number) => {
    const singlePagesArray = formData.single_pages
      ? formData.single_pages.split(",").map(p => parseInt(p.trim())).filter(p => !isNaN(p))
      : [];
    
    const index = singlePagesArray.indexOf(pageNumber);
    if (index > -1) {
      singlePagesArray.splice(index, 1);
      toast({
        title: "Página actualizada",
        description: `Página ${pageNumber} se verá en vista doble`,
      });
    } else {
      singlePagesArray.push(pageNumber);
      singlePagesArray.sort((a, b) => a - b);
      toast({
        title: "Página actualizada",
        description: `Página ${pageNumber} se verá individualmente`,
      });
    }
    
    setFormData({ ...formData, single_pages: singlePagesArray.join(", ") });
  };

  const isSinglePage = (pageNumber: number) => {
    const singlePagesArray = formData.single_pages
      ? formData.single_pages.split(",").map(p => parseInt(p.trim())).filter(p => !isNaN(p))
      : [];
    return singlePagesArray.includes(pageNumber);
  };

  const hasUnsavedChanges = () => {
    if (!initialFormData) return false;
    const formChanged = JSON.stringify(formData) !== JSON.stringify(initialFormData);
    const chaptersChanged = JSON.stringify(chaptersInfo) !== initialChaptersInfo;
    return formChanged || chaptersChanged;
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges()) {
      setExitDestination(`/admin/manga/${id}`);
      setExitDialogOpen(true);
    } else {
      navigate(`/admin/manga/${id}`);
    }
  };

  const handleExitWithoutSaving = () => {
    setExitDialogOpen(false);
    navigate(exitDestination);
  };

  const handleSaveAndExit = async () => {
    await handleSave();
    setExitDialogOpen(false);
    navigate(exitDestination);
  };

  const totalPagesNum = parseInt(formData.total_pages) || 0;
  const pageNumbers = Array.from({ length: totalPagesNum }, (_, i) => i);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className={isIOSPWA() ? "pt-[calc(56px+env(safe-area-inset-top))] pb-12" : "pt-20 pb-12"}>
        <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackClick}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {chapterId === "new" ? "Nuevo Tomo" : "Editar Tomo"}
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mb-6 border-b border-border">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "info"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("info")}
            >
              Información del Tomo
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "chapters"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("chapters")}
            >
              Capítulos ({chaptersInfo.length})
            </button>
            {totalPagesNum > 0 && formData.folder_url && (
              <button
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "preview"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("preview")}
              >
                Vista Previa ({totalPagesNum})
              </button>
            )}
          </div>

          {/* Tab: Información del Tomo */}
          {activeTab === "info" && (
            <Card className="p-6">
              <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="chapter_number">Número de Tomo *</Label>
                  <Input
                    id="chapter_number"
                    type="text"
                    inputMode="decimal"
                    value={formData.chapter_number}
                    onChange={(e) =>
                      setFormData({ ...formData, chapter_number: e.target.value })
                    }
                    placeholder="Ej: 1, 2, 3, 1.1, 0.1"
                  />
                  <p className="text-xs text-muted-foreground">
                    Puede ser un número entero (1, 2, 3) o decimal (1.1, 1.2, 0.1)
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título (opcional)</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Ej: El comienzo"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="folder_url">URL de la Carpeta con JPGs *</Label>
                <Input
                  id="folder_url"
                  value={formData.folder_url}
                  onChange={(e) =>
                    setFormData({ ...formData, folder_url: e.target.value })
                  }
                  placeholder="https://example.com/mangas/one-piece/capitulo-1"
                />
                <p className="text-xs text-muted-foreground">
                  URL base donde están los archivos 000.jpg, 001.jpg, etc.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="total_pages">Total de Páginas *</Label>
                <div className="flex gap-2">
                  <Input
                    id="total_pages"
                    type="number"
                    value={formData.total_pages}
                    onChange={(e) =>
                      setFormData({ ...formData, total_pages: e.target.value })
                    }
                    placeholder="Ej: 20"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={detectTotalPages}
                    disabled={detecting || !formData.folder_url}
                  >
                    {detecting ? "Detectando..." : "Auto-detectar"}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  El sistema buscará imágenes nombradas como 000.jpg, 001.jpg, etc.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_view_mode">Modo de Vista por Defecto</Label>
                <select
                  id="default_view_mode"
                  value={formData.default_view_mode}
                  onChange={(e) =>
                    setFormData({ ...formData, default_view_mode: e.target.value })
                  }
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="single">Vista Simple (1 página)</option>
                  <option value="double">Vista Doble (2 páginas)</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Vista simple: para tomos que ya tienen páginas dobles combinadas. Vista doble: para tomos con páginas individuales.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="single_pages">Páginas Individuales en Vista Doble</Label>
                <Input
                  id="single_pages"
                  value={formData.single_pages}
                  onChange={(e) =>
                    setFormData({ ...formData, single_pages: e.target.value })
                  }
                  placeholder="Ej: 1, 6, 11, 16"
                />
                <p className="text-xs text-muted-foreground">
                  Números de página que deben verse individualmente en vista doble. La primera página (001.webp) es 1, la segunda (002.webp) es 2, etc. Separados por comas.
                </p>
              </div>

              <div className="flex justify-between pt-4">
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Guardando..." : "Guardar"}
                  </Button>
                </div>

                {chapterId !== "new" && (
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </Card>
          )}

          {/* Tab: Capítulos */}
          {activeTab === "chapters" && (
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Capítulos en este Tomo</h2>
                    <p className="text-xs text-muted-foreground">
                      Marca qué capítulos contiene este tomo y en qué páginas están
                      {suggestedChapterNumber && chaptersInfo.length === 0 && (
                        <span className="text-primary font-medium ml-2">
                          · Sugerencia: empezar desde el capítulo {suggestedChapterNumber}
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const newChapterNumber = suggestedChapterNumber && chaptersInfo.length === 0 
                        ? suggestedChapterNumber 
                        : chaptersInfo.length > 0 
                          ? Math.max(...chaptersInfo.map(ch => ch.chapter_number)) + 1 
                          : 1;
                      setChaptersInfo([...chaptersInfo, { chapter_number: newChapterNumber, start_page: 1, title: "" }]);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Añadir Capítulo
                  </Button>
                </div>

                {chaptersInfo.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {chaptersInfo
                      .map((chapterInfo, originalIndex) => ({ chapterInfo, originalIndex }))
                      .sort((a, b) => {
                        const an = typeof (a.chapterInfo as any).chapter_number === 'string' ? parseFloat((a.chapterInfo as any).chapter_number) : (a.chapterInfo as any).chapter_number;
                        const bn = typeof (b.chapterInfo as any).chapter_number === 'string' ? parseFloat((b.chapterInfo as any).chapter_number) : (b.chapterInfo as any).chapter_number;
                        const aNum = isNaN(an as any) ? Number.POSITIVE_INFINITY : (an as number);
                        const bNum = isNaN(bn as any) ? Number.POSITIVE_INFINITY : (bn as number);
                        return aNum - bNum;
                      })
                      .map(({ chapterInfo, originalIndex }, displayIndex) => (
                      <Card key={originalIndex} className="group overflow-hidden">
                        {/* Portada del capítulo clicable */}
                        {formData.folder_url && chapterInfo.start_page && (
                          <div 
                            className="relative aspect-[2/3] bg-muted overflow-hidden cursor-pointer [@media(hover:hover)]:group-hover:outline [@media(hover:hover)]:group-hover:outline-[2px] [@media(hover:hover)]:group-hover:outline-primary [@media(hover:hover)]:group-hover:outline-offset-2"
                            onClick={() => {
                              setCurrentViewPage(chapterInfo.start_page - 1);
                              setViewerOpen(true);
                            }}
                          >
                            <img
                              src={generateImageUrl(chapterInfo.start_page - 1)}
                              alt={`Portada Capítulo ${chapterInfo.chapter_number}`}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                            <div className="absolute top-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                              Pág. {chapterInfo.start_page}
                            </div>
                          </div>
                        )}
                        
                        {/* Campos del capítulo */}
                        <div className="p-4 space-y-3">
                          <div className="space-y-2">
                            <Label htmlFor={`chapter-num-${originalIndex}`} className="text-xs">Capítulo #</Label>
                            <Input
                              id={`chapter-num-${originalIndex}`}
                              type="text"
                              inputMode="decimal"
                              value={String((chapterInfo as any).chapter_number ?? "")}
                              onChange={(e) => {
                                const newChapters = [...chaptersInfo];
                                (newChapters[originalIndex] as any).chapter_number = e.target.value;
                                setChaptersInfo(newChapters);
                              }}
                              placeholder="1, 1.1, 0.1"
                              className="h-9"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`start-page-${originalIndex}`} className="text-xs">Pág. Inicial</Label>
                            <Input
                              id={`start-page-${originalIndex}`}
                              type="number"
                              value={chapterInfo.start_page}
                              onChange={(e) => {
                                const newChapters = [...chaptersInfo];
                                newChapters[originalIndex].start_page = parseInt(e.target.value) || 1;
                                setChaptersInfo(newChapters);
                              }}
                              placeholder="1"
                              className="h-9"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`end-page-${originalIndex}`} className="text-xs">Pág. Final</Label>
                            <Input
                              id={`end-page-${originalIndex}`}
                              type="number"
                              value={chapterInfo.end_page || ""}
                              onChange={(e) => {
                                const newChapters = [...chaptersInfo];
                                const value = e.target.value ? parseInt(e.target.value) : undefined;
                                newChapters[originalIndex].end_page = value;
                                setChaptersInfo(newChapters);
                              }}
                              placeholder="Auto"
                              className="h-9"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`chapter-title-${originalIndex}`} className="text-xs">Título</Label>
                            <Input
                              id={`chapter-title-${originalIndex}`}
                              value={chapterInfo.title}
                              onChange={(e) => {
                                const newChapters = [...chaptersInfo];
                                newChapters[originalIndex].title = e.target.value;
                                setChaptersInfo(newChapters);
                              }}
                              placeholder="Título del capítulo"
                              className="h-9"
                            />
                          </div>

                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id={`first-page-single-${originalIndex}`}
                              checked={chapterInfo.first_page_single || false}
                              onChange={(e) => {
                                const newChapters = [...chaptersInfo];
                                newChapters[originalIndex].first_page_single = e.target.checked;
                                setChaptersInfo(newChapters);
                              }}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                            <Label 
                              htmlFor={`first-page-single-${originalIndex}`}
                              className="text-xs font-normal cursor-pointer"
                            >
                              Primera página individual
                            </Label>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const newChapters = chaptersInfo.filter((_, i) => i !== originalIndex);
                              setChaptersInfo(newChapters);
                            }}
                            className="w-full mt-2"
                          >
                            <Trash className="h-4 w-4 mr-2 text-destructive" />
                            Eliminar
                          </Button>
                        </div>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      No hay capítulos registrados
                      {suggestedChapterNumber && (
                        <span className="block text-sm text-primary font-medium mt-2">
                          Sugerencia: empezar desde el capítulo {suggestedChapterNumber}
                        </span>
                      )}
                    </p>
                  </div>
                )}

                <div className="flex justify-between pt-4">
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Guardando..." : "Guardar Capítulos"}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Vista Previa */}
          {activeTab === "preview" && totalPagesNum > 0 && formData.folder_url && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-7 lg:grid-cols-9 gap-2">
                {pageNumbers.map((pageIndex) => {
                  const aspectRatio = imageAspectRatios[pageIndex];
                  const isWide = aspectRatio && aspectRatio > 0.8;
                  const pageNumber = pageIndex + 1;
                  const isSingle = isSinglePage(pageNumber);
                  
                  return (
                    <div
                      key={pageIndex}
                      className={`relative group ${isWide ? 'col-span-2' : ''}`}
                      style={{ aspectRatio: aspectRatio || 2/3 }}
                    >
                      <img
                        src={generateImageUrl(pageIndex)}
                        alt={`Página ${pageNumber}`}
                        className="w-full h-full object-cover rounded border border-border group-hover:border-primary transition-colors cursor-pointer"
                        loading="lazy"
                        onLoad={(e) => handleImageLoad(pageIndex, e)}
                        onClick={() => {
                          setCurrentViewPage(pageIndex);
                          setViewerOpen(true);
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs py-1.5 px-2">
                        <div className="flex items-center justify-between gap-1">
                          <span className="flex-shrink-0">{pageNumber}</span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={`h-7 w-7 p-0 hover:bg-white/20 ${isSingle ? 'text-primary' : 'text-white'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleSinglePage(pageNumber);
                              }}
                              title={isSingle ? "Vista doble" : "Vista individual"}
                            >
                              <RectangleVertical className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-white hover:text-primary hover:bg-white/20"
                              onClick={(e) => {
                                e.stopPropagation();
                                addChapterFromPage(pageNumber);
                              }}
                              title="Agregar capítulo"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between pt-4">
                <Button onClick={handleSave} disabled={saving}>
                  <Save className="h-4 w-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar"}
                </Button>

                {chapterId !== "new" && (
                  <Button
                    variant="destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el tomo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>
              Tienes cambios sin guardar. ¿Qué deseas hacer?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleExitWithoutSaving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Salir sin guardar
            </AlertDialogAction>
            <AlertDialogAction onClick={handleSaveAndExit}>
              Guardar y salir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Visor de páginas */}
      {viewerOpen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-background/10">
            <div className="text-white text-sm">
              Página {currentViewPage + 1} / {totalPagesNum}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentViewPage(Math.max(0, currentViewPage - 1))}
                disabled={currentViewPage === 0}
                className="text-white hover:bg-white/10"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentViewPage(Math.min(totalPagesNum - 1, currentViewPage + 1))}
                disabled={currentViewPage === totalPagesNum - 1}
                className="text-white hover:bg-white/10"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const pageNumber = currentViewPage + 1;
                  toggleSinglePage(pageNumber);
                }}
                className={`${isSinglePage(currentViewPage + 1) ? 'text-primary' : 'text-white'} hover:bg-white/10`}
                title={isSinglePage(currentViewPage + 1) ? "Vista doble" : "Vista individual"}
              >
                <RectangleVertical className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const pageNumber = currentViewPage + 1;
                  addChapterFromPage(pageNumber);
                }}
                className="text-white hover:text-primary hover:bg-white/10"
                title="Agregar capítulo"
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewerOpen(false)}
                className="text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
            <img
              src={generateImageUrl(currentViewPage)}
              alt={`Página ${currentViewPage + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminChapterDetail;
