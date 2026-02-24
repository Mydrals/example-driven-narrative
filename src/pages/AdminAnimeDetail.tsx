import { useState, useEffect } from "react";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, Plus } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { formatDateShort } from "@/lib/dateUtils";
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
import { GenreAutocomplete } from "@/components/GenreAutocomplete";
import ApiAnimeSearch from "@/components/ApiAnimeSearch";
import BannerFocusPicker from "@/components/BannerFocusPicker";

interface Episode {
  id: string;
  episode_number: number;
  season_number: number;
  title: string;
  duration: string;
  original_release_date: string | null;
  thumbnail_url: string | null;
}

const AdminAnimeDetail = () => {
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
    year: "",
    language: "",
    poster_url: "",
    hero_banner_url: "",
    mobile_hero_banner_url: "",
    mobile_banner_focus: "center",
    logo_url: "",
    genres: "",
    featured: false,
    alternative_titles: [] as string[],
  });
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);

  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [activeTab, setActiveTab] = useState<"anime" | "episodes">("anime");
  const [exitDialogOpen, setExitDialogOpen] = useState(false);

  // Read initial tab from URL search params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("tab") === "episodes") {
      setActiveTab("episodes");
    }
  }, []);

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
    const fetchAnime = async () => {
      if (!id || id === "new") {
        setInitialFormData(formData);
        setLoading(false);
        return;
      }

      try {
        const { data: anime, error: animeError } = await supabase
          .from("animes")
          .select("*")
          .eq("id", id)
          .single();

        if (animeError) throw animeError;

        const loadedFormData = {
          title: anime.title || "",
          slug: anime.slug || "",
          description: anime.description || "",
          year: anime.year?.toString() || "",
          language: anime.language || "",
          poster_url: anime.poster_url || "",
          hero_banner_url: anime.hero_banner_url || "",
          mobile_hero_banner_url: anime.mobile_hero_banner_url || "",
          mobile_banner_focus: (anime as any).mobile_banner_focus || "center",
          logo_url: anime.logo_url || "",
          genres: anime.genres?.join(", ") || "",
          featured: anime.featured || false,
          alternative_titles: (anime as any).alternative_titles || [],
        };

        setFormData(loadedFormData);
        setInitialFormData(loadedFormData);

        const { data: episodesData, error: episodesError } = await supabase
          .from("episodes")
          .select("id, episode_number, season_number, title, duration, original_release_date, thumbnail_url")
          .eq("anime_id", id)
          .order("season_number", { ascending: true })
          .order("episode_number", { ascending: true });

        if (episodesError) throw episodesError;
        setEpisodes(episodesData || []);
      } catch (error) {
        console.error("Error fetching anime:", error);
        toast({
          title: "Error",
          description: "No se pudo cargar el anime",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin && user) {
      fetchAnime();
    }
  }, [id, isAdmin, user, toast]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const animeData = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description || null,
        year: formData.year ? parseInt(formData.year) : null,
        language: formData.language || null,
        poster_url: formData.poster_url || null,
        hero_banner_url: formData.hero_banner_url || null,
        mobile_hero_banner_url: formData.mobile_hero_banner_url || null,
        mobile_banner_focus: formData.mobile_banner_focus || "center",
        logo_url: formData.logo_url || null,
        genres: formData.genres ? formData.genres.split(",").map(g => g.trim()) : null,
        featured: formData.featured,
        alternative_titles: formData.alternative_titles,
      };

      if (id === "new") {
        const { data, error } = await supabase
          .from("animes")
          .insert([animeData])
          .select()
          .single();

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Anime creado correctamente",
        });
        navigate(`/admin/anime/${data.id}`);
      } else {
        const { error } = await supabase
          .from("animes")
          .update(animeData)
          .eq("id", id);

        if (error) throw error;

        setInitialFormData({ ...formData });
        toast({
          title: "Éxito",
          description: "Anime actualizado correctamente",
        });
      }
    } catch (error) {
      console.error("Error saving anime:", error);
      toast({
        title: "Error",
        description: "No se pudo guardar el anime",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("animes")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Anime eliminado correctamente",
      });
      navigate("/admin");
    } catch (error) {
      console.error("Error deleting anime:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el anime",
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

  // Detectar si está en iOS PWA
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
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between mb-8">
            <Button
              variant="ghost"
              onClick={handleBackClick}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              {id !== "new" && (
                <Button
                  variant="destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>

          {/* Tab Selector */}
          {id !== "new" && (
            <div className="mb-6 inline-flex items-center rounded-full bg-muted/30 p-1.5 backdrop-blur-sm">
              <button
                onClick={() => setActiveTab("anime")}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "anime"
                    ? "bg-foreground text-background shadow-lg"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                EDITAR ANIME
              </button>
              <button
                onClick={() => setActiveTab("episodes")}
                className={`px-6 py-2 rounded-full text-sm font-bold transition-all ${
                  activeTab === "episodes"
                    ? "bg-foreground text-background shadow-lg"
                    : "text-foreground/60 hover:text-foreground"
                }`}
              >
                EDITAR EPISODIOS
              </button>
            </div>
          )}

          {/* Anime Edit Section */}
          {activeTab === "anime" && (
            <Card className="p-6 bg-card border-border/50 mb-8">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                {id === "new" ? "Nuevo Anime" : "Editar Anime"}
              </h2>

            <ApiAnimeSearch
              onApplyField={(field, value) => {
                if (field === 'alternative_titles' && typeof value === 'string') {
                  const newTitles = value.split('|||').filter(Boolean);
                  setFormData(prev => ({
                    ...prev,
                    alternative_titles: [...new Set([...prev.alternative_titles, ...newTitles])],
                  }));
                } else if (field === 'demographics') {
                  // Append demographics to genres
                  setFormData(prev => {
                    const existing = prev.genres ? prev.genres.split(",").map(g => g.trim()).filter(Boolean) : [];
                    const newDemos = value.split(",").map(d => d.trim()).filter(Boolean);
                    const merged = [...new Set([...existing, ...newDemos])];
                    return { ...prev, genres: merged.join(", ") };
                  });
                } else {
                  setFormData(prev => ({ ...prev, [field]: value }));
                }
              }}
              onApplyMultiple={(fields) => {
                const { alternative_titles: altStr, demographics: demosStr, ...rest } = fields;
                const updates: any = { ...rest };
                
                // Merge demographics into genres
                if (demosStr) {
                  const existingGenres = (rest.genres || '').split(",").map(g => g.trim()).filter(Boolean);
                  const newDemos = demosStr.split(",").map(d => d.trim()).filter(Boolean);
                  updates.genres = [...new Set([...existingGenres, ...newDemos])].join(", ");
                }
                
                if (altStr) {
                  const newTitles = altStr.split('|||').filter(Boolean);
                  setFormData(prev => ({
                    ...prev,
                    ...updates,
                    alternative_titles: [...new Set([...prev.alternative_titles, ...newTitles])],
                  }));
                  return;
                }
                setFormData(prev => ({ ...prev, ...updates }));
              }}
              currentTitle={formData.title}
            />

            <div className="space-y-4">
              <div>
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
                  placeholder="Título del anime"
                />
              </div>

              {/* Alternative Titles */}
              <div>
                <Label>Títulos alternativos</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Títulos en otros idiomas para que los usuarios encuentren la serie al buscar.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.alternative_titles.map((t, i) => (
                    <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-sm">
                      {t}
                      <button
                        type="button"
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          alternative_titles: prev.alternative_titles.filter((_, idx) => idx !== i),
                        }))}
                        className="text-muted-foreground hover:text-foreground ml-1"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <Input
                  placeholder="Añadir título alternativo y pulsar Enter..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value.trim();
                      if (val && !formData.alternative_titles.includes(val)) {
                        setFormData(prev => ({
                          ...prev,
                          alternative_titles: [...prev.alternative_titles, val],
                        }));
                        (e.target as HTMLInputElement).value = '';
                      }
                    }
                  }}
                />
              </div>

              <div>
                <Label htmlFor="slug">Slug * (generado automáticamente)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="nombre-del-anime"
                  className="bg-muted/30"
                />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Descripción del anime"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="year">Año</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: e.target.value })}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <Label htmlFor="language">Idioma</Label>
                  <Input
                    id="language"
                    value={formData.language}
                    onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                    placeholder="Japonés, Español, etc."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="genres">Géneros</Label>
                <GenreAutocomplete
                  value={formData.genres}
                  onChange={(value) => setFormData({ ...formData, genres: value })}
                  placeholder="Escribe para buscar géneros..."
                />
              </div>

              <div>
                <Label htmlFor="poster_url">URL del Poster</Label>
                <Input
                  id="poster_url"
                  value={formData.poster_url}
                  onChange={(e) => setFormData({ ...formData, poster_url: e.target.value })}
                  placeholder="https://..."
                />
                {formData.poster_url && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-border/50 bg-muted/30 w-64 h-96 flex items-center justify-center p-2">
                    <img
                      src={getProxiedImageUrl(formData.poster_url)}
                      alt="Poster preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="hero_banner_url">URL del Banner Hero</Label>
                <Input
                  id="hero_banner_url"
                  value={formData.hero_banner_url}
                  onChange={(e) => setFormData({ ...formData, hero_banner_url: e.target.value })}
                  placeholder="https://..."
                />
                {formData.hero_banner_url && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-border/50 bg-muted/30 w-full h-48 flex items-center justify-center p-2">
                    <img
                      src={getProxiedImageUrl(formData.hero_banner_url)}
                      alt="Hero banner preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="mobile_hero_banner_url">URL del Banner Hero Móvil</Label>
                <Input
                  id="mobile_hero_banner_url"
                  value={formData.mobile_hero_banner_url}
                  onChange={(e) => setFormData({ ...formData, mobile_hero_banner_url: e.target.value })}
                  placeholder="https://..."
                />
                {formData.mobile_hero_banner_url && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-border/50 bg-muted/30 w-64 h-48 flex items-center justify-center p-2">
                    <img
                      src={getProxiedImageUrl(formData.mobile_hero_banner_url)}
                      alt="Mobile hero banner preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              {!formData.mobile_hero_banner_url && formData.hero_banner_url && (
                <div>
                  <Label>Enfoque del banner en móviles</Label>
                  <BannerFocusPicker
                    bannerUrl={formData.hero_banner_url}
                    value={formData.mobile_banner_focus}
                    onChange={(val) => setFormData({ ...formData, mobile_banner_focus: val })}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="logo_url">URL del Logo</Label>
                <Input
                  id="logo_url"
                  value={formData.logo_url}
                  onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                  placeholder="https://..."
                />
                {formData.logo_url && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-border/50 bg-muted/30 w-full h-32 flex items-center justify-center p-4">
                    <img
                      src={getProxiedImageUrl(formData.logo_url)}
                      alt="Logo preview"
                      className="max-w-full max-h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                  className="rounded border-border"
                />
                <Label htmlFor="featured">Destacado</Label>
              </div>
            </div>

            </Card>
          )}

          {/* Episodes Section */}
          {activeTab === "episodes" && id !== "new" && (
            <Card className="p-6 bg-card border-border/50">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <h2 className="text-2xl font-bold text-foreground">Episodios</h2>
                <Button
                  onClick={() => navigate(`/admin/anime/${id}/episode/new`)}
                  className="gap-2 w-full sm:w-auto"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Episodio
                </Button>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {episodes.map((episode) => (
                  <div
                    key={episode.id}
                    className="group cursor-pointer flex-shrink-0 p-1"
                    onClick={() => navigate(`/admin/anime/${id}/episode/${episode.id}`)}
                  >
                    <div className="relative aspect-video w-full bg-card lg:group-hover:outline lg:group-hover:outline-[2px] lg:group-hover:outline-white lg:group-hover:outline-offset-2 overflow-hidden">
                      {episode.thumbnail_url ? (
                        <img
                          src={getProxiedImageUrl(episode.thumbnail_url)}
                          alt={episode.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground text-sm">
                          Sin thumbnail
                        </div>
                      )}
                      <div className="absolute bottom-2 right-2 bg-cr-black/90 px-2 py-1 rounded text-xs text-foreground">
                        {episode.duration}
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <h3 className="font-bold text-muted-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        T{episode.season_number} E{episode.episode_number} - {episode.title}
                      </h3>
                      {episode.original_release_date && (
                        <p className="text-xs text-muted-foreground">
                          {formatDateShort(episode.original_release_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}

                {episodes.length === 0 && (
                  <div className="col-span-full text-center text-muted-foreground py-8">
                    No hay episodios registrados
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción eliminará permanentemente el anime y todos sus episodios.
              Esta operación no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
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

export default AdminAnimeDetail;
