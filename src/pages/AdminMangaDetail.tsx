import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { useUserRole } from "@/contexts/UserRoleContext";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
import { GenreAutocomplete } from "@/components/GenreAutocomplete";

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  total_pages: number;
  folder_url: string;
  filename_pattern: string;
  file_extensions?: string[];
}

const AdminMangaDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { isAdmin, loading: roleLoading } = useUserRole();

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    description: "",
    poster_url: "",
    hero_banner_url: "",
    mobile_hero_banner_url: "",
    mobile_banner_focus: "center",
    featured: false,
  });
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);

  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [activeTab, setActiveTab] = useState<"manga" | "chapters">("manga");
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

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
    const fetchManga = async () => {
      if (!id || id === "new") {
        setInitialFormData(formData);
        setLoading(false);
        return;
      }

      try {
        const { data: manga, error: mangaError } = await supabase
          .from("mangas")
          .select("*")
          .eq("id", id)
          .single();

        if (mangaError) throw mangaError;

        const loadedFormData = {
          title: manga.title || "",
          slug: manga.slug || "",
          description: manga.description || "",
          poster_url: manga.poster_url || "",
          hero_banner_url: (manga as any).hero_banner_url || "",
          mobile_hero_banner_url: (manga as any).mobile_hero_banner_url || "",
          mobile_banner_focus: (manga as any).mobile_banner_focus || "center",
          featured: manga.featured || false,
        };

        setFormData(loadedFormData);
        setInitialFormData(loadedFormData);

        const { data: chaptersData, error: chaptersError } = await supabase
          .from("manga_chapters")
          .select("*")
          .eq("manga_id", id)
          .order("chapter_number", { ascending: true });

        if (chaptersError) throw chaptersError;
        setChapters(chaptersData || []);
      } catch (error) {
        console.error("Error fetching manga:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar el manga",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin && user) {
      fetchManga();
    }
  }, [id, isAdmin, user, toast]);

  const handleSave = async () => {
    if (!formData.title || !formData.slug) {
      toast({
        title: "Error",
        description: "El título y el slug son obligatorios",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);

    try {
      if (id === "new") {
        const { error } = await supabase.from("mangas").insert([
          {
            title: formData.title,
            slug: formData.slug,
            description: formData.description,
            poster_url: formData.poster_url,
            hero_banner_url: formData.hero_banner_url,
            mobile_hero_banner_url: formData.mobile_hero_banner_url,
            mobile_banner_focus: formData.mobile_banner_focus || "center",
            featured: formData.featured,
          },
        ]);

        if (error) throw error;

        toast({
          title: "Manga creado",
          description: "El manga se ha creado correctamente",
        });
        navigate("/admin");
      } else {
        const { error } = await supabase
          .from("mangas")
          .update({
            title: formData.title,
            slug: formData.slug,
            description: formData.description,
            poster_url: formData.poster_url,
            hero_banner_url: formData.hero_banner_url,
            mobile_hero_banner_url: formData.mobile_hero_banner_url,
            mobile_banner_focus: formData.mobile_banner_focus || "center",
            featured: formData.featured,
          })
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "Manga actualizado",
          description: "Los cambios se han guardado correctamente",
        });
      }
    } catch (error: any) {
      console.error("Error saving manga:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo guardar el manga",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("mangas").delete().eq("id", id);

      if (error) throw error;

      toast({
        title: "Manga eliminado",
        description: "El manga se ha eliminado correctamente",
      });
      navigate("/admin");
    } catch (error: any) {
      console.error("Error deleting manga:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo eliminar el manga",
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

  const getChapterCoverUrl = (chapter: Chapter) => {
    const pattern = chapter.filename_pattern || "000";
    const extensions = chapter.file_extensions || ['jpg', 'webp', 'png'];
    const ext = extensions[0];
    const fileNumber = 1; // Primera página
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
    
    const baseUrl = chapter.folder_url.endsWith('/') ? chapter.folder_url : `${chapter.folder_url}/`;
    return `${baseUrl}${filename}.${ext}`;
  };

  const isIOSPWA = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    return isIOS && isStandalone;
  };

  const hasUnsavedChanges = () => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData);
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges()) {
      setExitDialogOpen(true);
    } else {
      navigate("/admin");
    }
  };

  const handleExitWithoutSaving = () => {
    setExitDialogOpen(false);
    navigate("/admin");
  };

  const handleSaveAndExit = async () => {
    await handleSave();
    setExitDialogOpen(false);
    navigate("/admin");
  };

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
              {id === "new" ? "Nuevo Manga" : "Editar Manga"}
            </h1>
          </div>

          <div className="flex gap-4 mb-6 border-b border-border">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === "manga"
                  ? "text-primary border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => setActiveTab("manga")}
            >
              Información del Manga
            </button>
            {id !== "new" && (
              <button
                className={`px-4 py-2 font-medium transition-colors ${
                  activeTab === "chapters"
                    ? "text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setActiveTab("chapters")}
              >
                Tomos ({chapters.length})
              </button>
            )}
          </div>

          {activeTab === "manga" && (
            <Card className="p-6">
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Título *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => {
                        const newTitle = e.target.value;
                        const slug = newTitle
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9\s-]/g, "")
                          .replace(/\s+/g, "-")
                          .replace(/-+/g, "-")
                          .trim();
                        
                        setFormData({ ...formData, title: newTitle, slug });
                      }}
                      placeholder="Ej: One Piece"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (URL) * (generado automáticamente)</Label>
                    <Input
                      id="slug"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({ ...formData, slug: e.target.value })
                      }
                      placeholder="Ej: one-piece"
                      className="bg-muted/30"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    placeholder="Descripción del manga"
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="poster_url">URL del Poster</Label>
                  <Input
                    id="poster_url"
                    value={formData.poster_url}
                    onChange={(e) =>
                      setFormData({ ...formData, poster_url: e.target.value })
                    }
                    placeholder="https://..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hero_banner_url">URL del Hero Banner (Desktop)</Label>
                  <Input
                    id="hero_banner_url"
                    value={formData.hero_banner_url}
                    onChange={(e) =>
                      setFormData({ ...formData, hero_banner_url: e.target.value })
                    }
                    placeholder="https://... (Recomendado: Ancho completo, horizontal)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mobile_hero_banner_url">URL del Hero Banner (Mobile)</Label>
                  <Input
                    id="mobile_hero_banner_url"
                    value={formData.mobile_hero_banner_url}
                    onChange={(e) =>
                      setFormData({ ...formData, mobile_hero_banner_url: e.target.value })
                    }
                    placeholder="https://... (Opcional: Vertical para mobile)"
                  />
                </div>

                {!formData.mobile_hero_banner_url && formData.hero_banner_url && (
                  <div className="space-y-2">
                    <Label>Enfoque del banner en móviles</Label>
                    <p className="text-xs text-muted-foreground mb-2">
                      Cuando no hay imagen móvil, elige dónde se enfoca el banner principal en pantallas pequeñas.
                    </p>
                    <div className="flex gap-2">
                      {[
                        { value: "left", label: "Izquierda" },
                        { value: "center", label: "Centro" },
                        { value: "right", label: "Derecha" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, mobile_banner_focus: option.value })}
                          className={`px-4 py-2 rounded-md text-sm font-medium transition-all border ${
                            formData.mobile_banner_focus === option.value
                              ? "bg-foreground text-background border-foreground"
                              : "bg-muted/30 text-foreground/60 border-border hover:text-foreground"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <Switch
                    id="featured"
                    checked={formData.featured}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, featured: checked })
                    }
                  />
                  <Label htmlFor="featured">Destacado</Label>
                </div>

                <div className="flex justify-between pt-4">
                  <div className="flex gap-2">
                    <Button onClick={handleSave} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" />
                      {saving ? "Guardando..." : "Guardar"}
                    </Button>
                  </div>

                  {id !== "new" && (
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

          {activeTab === "chapters" && id !== "new" && (
            <div className="space-y-4">
              <div className="flex justify-end">
                <Button onClick={() => navigate(`/admin/manga/${id}/chapter/new`)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Nuevo Tomo
                </Button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {chapters.map((chapter) => (
                  <div
                    key={chapter.id}
                    className="group cursor-pointer"
                    onClick={() => navigate(`/admin/manga/${id}/chapter/${chapter.id}`)}
                  >
                    <div className="relative aspect-[2/3] bg-card [@media(hover:hover)]:group-hover:outline [@media(hover:hover)]:group-hover:outline-[2px] [@media(hover:hover)]:group-hover:outline-white [@media(hover:hover)]:group-hover:outline-offset-2 overflow-hidden">
                      <img
                        src={getChapterCoverUrl(chapter)}
                        alt={`Tomo ${chapter.chapter_number}`}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        decoding="async"
                      />
                    </div>
                    <div className="mt-2 space-y-1">
                      <h3 className="font-bold text-foreground [@media(hover:hover)]:text-muted-foreground text-sm line-clamp-2 [@media(hover:hover)]:group-hover:text-primary transition-colors">
                        Tomo {chapter.chapter_number}
                        {chapter.title && `: ${chapter.title}`}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {chapter.total_pages} páginas
                      </p>
                    </div>
                  </div>
                ))}

                {chapters.length === 0 && (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">
                      No hay tomos registrados
                    </p>
                    <Button onClick={() => navigate(`/admin/manga/${id}/chapter/new`)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Crear primer tomo
                    </Button>
                  </div>
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
              Esta acción eliminará permanentemente el manga y todos sus tomos.
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
    </div>
  );
};

export default AdminMangaDetail;
