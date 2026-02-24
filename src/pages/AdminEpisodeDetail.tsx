import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Save, Trash2, Plus, X, ChevronLeft, ChevronRight } from "lucide-react";
import { DatePicker } from "@/components/DatePicker";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import VideoPlayer from "@/components/VideoPlayer";
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
import { parseVideoSources, serializeVideoSources, isDirectVideoUrl, VIDEO_LANGUAGES, type VideoSource } from "@/lib/videoSources";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ApiEpisodeSearch from "@/components/ApiEpisodeSearch";

const AdminEpisodeDetail = () => {
  const { id: animeId, episodeId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [animeTitle, setAnimeTitle] = useState("");
  const [siblingEpisodes, setSiblingEpisodes] = useState<{ id: string; episode_number: number; season_number: number }[]>([]);

  const [videoSources, setVideoSources] = useState<VideoSource[]>([{ title: "", url: "", language: "" }]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    season_number: "1",
    episode_number: "",
    duration: "",
    thumbnail_url: "",
    thumbnail_sprite_url: "",
    thumbnail_count: "60",
    thumbnail_columns: "10",
    skip_credits_time_minutes: "",
    skip_credits_to_minutes: "",
    original_release_date: "",
  });
  const [initialFormData, setInitialFormData] = useState<typeof formData | null>(null);
  const [initialVideoSources, setInitialVideoSources] = useState<string>("");
  const [exitDialogOpen, setExitDialogOpen] = useState(false);
  
  const [previewSourceIndex, setPreviewSourceIndex] = useState(0);
  const [knownTitles, setKnownTitles] = useState<string[]>([]);
  const [activeTitleIndex, setActiveTitleIndex] = useState<number | null>(null);


  // Fetch known video source titles from all episodes
  useEffect(() => {
    const fetchKnownTitles = async () => {
      try {
        const { data } = await supabase.from("episodes").select("video_url");
        if (!data) return;
        const titlesSet = new Set<string>();
        data.forEach(ep => {
          const sources = parseVideoSources(ep.video_url);
          sources.forEach(s => {
            if (s.title && s.title !== "Video") titlesSet.add(s.title);
          });
        });
        setKnownTitles(Array.from(titlesSet).sort());
      } catch (e) {
        console.error("Error fetching known titles:", e);
      }
    };
    fetchKnownTitles();
  }, []);

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) navigate("/auth");
      else setUser(session.user);
    };
    checkSession();
  }, [navigate]);

  // Fetch anime title and sibling episodes
  useEffect(() => {
    const fetchAnimeData = async () => {
      if (!animeId) return;
      const [titleRes, epsRes] = await Promise.all([
        supabase.from("animes").select("title").eq("id", animeId).single(),
        supabase.from("episodes").select("id, episode_number, season_number").eq("anime_id", animeId).order("season_number").order("episode_number"),
      ]);
      if (titleRes.data?.title) setAnimeTitle(titleRes.data.title);
      if (epsRes.data) setSiblingEpisodes(epsRes.data);
    };
    fetchAnimeData();
  }, [animeId]);

  useEffect(() => {
    if (!roleLoading && !isAdmin && user) navigate("/profile");
  }, [isAdmin, roleLoading, user, navigate]);

  // Auto-set episode number for new episodes
  useEffect(() => {
    if (episodeId === "new" && siblingEpisodes.length > 0) {
      const currentSeason = parseInt(formData.season_number) || 1;
      const episodesInSeason = siblingEpisodes.filter(e => e.season_number === currentSeason);
      const maxEp = episodesInSeason.reduce((max, e) => Math.max(max, e.episode_number), 0);
      setFormData(prev => ({ ...prev, episode_number: (maxEp + 1).toString() }));
    } else if (episodeId === "new" && siblingEpisodes.length === 0) {
      setFormData(prev => ({ ...prev, episode_number: "1" }));
    }
  }, [episodeId, siblingEpisodes, formData.season_number]);

  useEffect(() => {
    const fetchEpisode = async () => {
      if (!episodeId || episodeId === "new") {
        setInitialFormData(formData);
        setInitialVideoSources(JSON.stringify(videoSources));
        setLoading(false);
        return;
      }
      try {
        const { data, error } = await supabase.from("episodes").select("*").eq("id", episodeId).single();
        if (error) throw error;

        const sources = parseVideoSources(data.video_url);
        setVideoSources(sources.length > 0 ? sources : [{ title: "", url: "", language: "" }]);

        const loadedFormData = {
          title: data.title || "",
          description: data.description || "",
          season_number: data.season_number?.toString() || "1",
          episode_number: data.episode_number?.toString() || "",
          duration: data.duration || "",
          thumbnail_url: data.thumbnail_url || "",
          thumbnail_sprite_url: data.thumbnail_sprite_url || "",
          thumbnail_count: data.thumbnail_count?.toString() || "60",
          thumbnail_columns: data.thumbnail_columns?.toString() || "10",
          skip_credits_time_minutes: data.skip_credits_time_minutes?.toString() || "",
          skip_credits_to_minutes: data.skip_credits_to_minutes?.toString() || "",
          original_release_date: data.original_release_date || "",
        };
        setFormData(loadedFormData);

        setInitialFormData(loadedFormData);
        setInitialVideoSources(JSON.stringify(sources.length > 0 ? sources : [{ title: "", url: "", language: "" }]));
      } catch (error) {
        console.error("Error fetching episode:", error);
        toast({ title: "Error", description: "No se pudo cargar el episodio", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    if (isAdmin && user) fetchEpisode();
  }, [episodeId, isAdmin, user, toast]);

  const handleSave = async () => {


    setSaving(true);
    try {
      const validSources = videoSources.filter(s => s.url.trim());
      const episodeData = {
        anime_id: animeId,
        title: formData.title,
        description: formData.description || null,
        season_number: parseInt(formData.season_number),
        episode_number: parseInt(formData.episode_number),
        duration: formData.duration,
        video_url: serializeVideoSources(validSources.map(s => ({ ...s, title: s.title || "Video" }))) || null,
        thumbnail_url: formData.thumbnail_url || null,
        thumbnail_sprite_url: formData.thumbnail_sprite_url || null,
        thumbnail_count: formData.thumbnail_count ? parseInt(formData.thumbnail_count) : 60,
        thumbnail_columns: formData.thumbnail_columns ? parseInt(formData.thumbnail_columns) : 10,
        skip_credits_time_minutes: formData.skip_credits_time_minutes ? parseFloat(formData.skip_credits_time_minutes) : null,
        skip_credits_to_minutes: formData.skip_credits_to_minutes ? parseFloat(formData.skip_credits_to_minutes) : null,
        original_release_date: formData.original_release_date || null,
      };

      if (episodeId === "new") {
        const { data: newEp, error } = await supabase.from("episodes").insert([episodeData]).select("id").single();
        if (error) throw error;
        toast({ title: "Éxito", description: "Episodio creado correctamente" });
        // Navigate to the newly created episode so user stays editing
        navigate(`/admin/anime/${animeId}/episode/${newEp.id}`, { replace: true });
      } else {
        const { error } = await supabase.from("episodes").update(episodeData).eq("id", episodeId);
        if (error) throw error;
        toast({ title: "Éxito", description: "Episodio actualizado correctamente" });
        // Update initial state so unsaved-changes detection resets
        setInitialFormData({ ...formData });
        setInitialVideoSources(JSON.stringify(videoSources));
      }

      // Auto-update anime language + updated_at based on all episodes' video sources
      try {
        const { data: allEpisodes } = await supabase
          .from("episodes")
          .select("video_url")
          .eq("anime_id", animeId!);
        
        if (allEpisodes) {
          const allLanguages = new Set<string>();
          allEpisodes.forEach(ep => {
            const sources = parseVideoSources(ep.video_url);
            sources.forEach(s => {
              if (s.language) allLanguages.add(s.language);
            });
          });
          validSources.forEach(s => {
            if (s.language) allLanguages.add(s.language);
          });

          let autoLanguage = "";
          const hasJa = allLanguages.has("ja");
          const hasEs = allLanguages.has("es");
          if (hasJa && hasEs) {
            autoLanguage = "Sub - Lat";
          } else if (hasEs) {
            autoLanguage = "Doblado";
          } else if (hasJa) {
            autoLanguage = "Subtitulado";
          }

          const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
          if (autoLanguage) updateData.language = autoLanguage;
          await supabase.from("animes").update(updateData).eq("id", animeId!);
        }
      } catch (langError) {
        console.error("Error updating anime language:", langError);
      }
    } catch (error) {
      console.error("Error saving episode:", error);
      toast({ title: "Error", description: "No se pudo guardar el episodio", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from("episodes").delete().eq("id", episodeId);
      if (error) throw error;
      toast({ title: "Éxito", description: "Episodio eliminado correctamente" });
      navigate(`/admin/anime/${animeId}?tab=episodes`);
    } catch (error) {
      console.error("Error deleting episode:", error);
      toast({ title: "Error", description: "No se pudo eliminar el episodio", variant: "destructive" });
    }
  };

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  const isIOSPWA = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    return isIOS && isStandalone;
  };

  const hasUnsavedChanges = () => {
    if (!initialFormData) return false;
    return JSON.stringify(formData) !== JSON.stringify(initialFormData) || JSON.stringify(videoSources) !== initialVideoSources;
  };

  const handleBackClick = () => {
    if (hasUnsavedChanges()) setExitDialogOpen(true);
    else navigate(`/admin/anime/${animeId}?tab=episodes`);
  };

  const handleExitWithoutSaving = () => { setExitDialogOpen(false); navigate(`/admin/anime/${animeId}?tab=episodes`); };
  const handleSaveAndExit = async () => { await handleSave(); setExitDialogOpen(false); navigate(`/admin/anime/${animeId}?tab=episodes`); };

  const addVideoSource = () => setVideoSources([...videoSources, { title: "", url: "", language: "" }]);
  const removeVideoSource = (index: number) => {
    if (videoSources.length <= 1) return;
    const newSources = videoSources.filter((_, i) => i !== index);
    setVideoSources(newSources);
    if (previewSourceIndex >= newSources.length) setPreviewSourceIndex(Math.max(0, newSources.length - 1));
  };
  const updateVideoSource = (index: number, field: 'title' | 'url' | 'language', value: string) => {
    const newSources = [...videoSources];
    const actualValue = field === 'language' && value === '_none' ? '' : value;
    newSources[index] = { ...newSources[index], [field]: actualValue };
    setVideoSources(newSources);
  };

  const currentEpIndex = siblingEpisodes.findIndex(e => e.id === episodeId);
  const prevEpisode = currentEpIndex > 0 ? siblingEpisodes[currentEpIndex - 1] : null;
  const nextEpisode = currentEpIndex >= 0 && currentEpIndex < siblingEpisodes.length - 1 ? siblingEpisodes[currentEpIndex + 1] : null;

  const currentPreviewSource = videoSources[previewSourceIndex];
  const hasPreviewUrl = currentPreviewSource?.url?.trim();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className={isIOSPWA() ? "pt-[calc(56px+env(safe-area-inset-top))] pb-12" : "pt-20 pb-12"}>
        <div className="max-w-4xl mx-auto px-6">
          <div className="flex items-center justify-between mb-4">
            <Button variant="ghost" onClick={handleBackClick} className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver
            </Button>
            <div className="flex items-center gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                <Save className="h-4 w-4" />
                {saving ? "Guardando..." : "Guardar"}
              </Button>
              {episodeId !== "new" && (
                <Button variant="destructive" onClick={() => setDeleteDialogOpen(true)} className="gap-2">
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </Button>
              )}
            </div>
          </div>

          {/* Episode Navigation */}
          {episodeId !== "new" && (prevEpisode || nextEpisode) && (
            <div className="flex items-center justify-between mb-6">
              {prevEpisode ? (
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/anime/${animeId}/episode/${prevEpisode.id}`)} className="gap-1.5">
                  <ChevronLeft className="h-4 w-4" />
                  T{prevEpisode.season_number} E{prevEpisode.episode_number}
                </Button>
              ) : <div />}
              {nextEpisode ? (
                <Button variant="outline" size="sm" onClick={() => navigate(`/admin/anime/${animeId}/episode/${nextEpisode.id}`)} className="gap-1.5">
                  T{nextEpisode.season_number} E{nextEpisode.episode_number}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              ) : <div />}
            </div>
          )}

          <Card className="p-6 bg-card border-border/50">
            <h2 className="text-2xl font-bold text-foreground mb-6">
              {episodeId === "new" ? "Nuevo Episodio" : "Editar Episodio"}
            </h2>

            <ApiEpisodeSearch
              currentEpisodeNumber={formData.episode_number ? parseInt(formData.episode_number) : undefined}
              onApplyField={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
              animeTitle={animeTitle}
            />

            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="Título del episodio" />
              </div>

              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea id="description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Descripción del episodio" rows={3} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="season_number">Temporada *</Label>
                  <Input id="season_number" type="number" value={formData.season_number} onChange={(e) => setFormData({ ...formData, season_number: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="episode_number">Episodio *</Label>
                  <Input id="episode_number" type="number" value={formData.episode_number} onChange={(e) => setFormData({ ...formData, episode_number: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="duration">Duración</Label>
                  <Input id="duration" value={formData.duration} onChange={(e) => setFormData({ ...formData, duration: e.target.value })} placeholder="24 min" />
                </div>
              </div>

              {/* Video Sources Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>URLs de Video</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addVideoSource} className="gap-1.5">
                    <Plus className="h-3.5 w-3.5" />
                    Añadir URL
                  </Button>
                </div>

                {videoSources.map((source, index) => (
                  <div key={index} className="flex gap-2 items-start p-3 rounded-lg bg-background border border-border/50">
                    <div className="flex-1 space-y-2">
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <Input
                            value={source.title}
                            onChange={(e) => {
                              updateVideoSource(index, 'title', e.target.value);
                              setActiveTitleIndex(index);
                            }}
                            onFocus={() => setActiveTitleIndex(index)}
                            onBlur={() => setTimeout(() => setActiveTitleIndex(null), 150)}
                            placeholder="Título (ej: Latino, Sub, HD...)"
                            className="text-sm"
                            autoComplete="off"
                          />
                          {activeTitleIndex === index && source.title.trim() !== "" && (() => {
                            const filtered = knownTitles.filter(t =>
                              t.toLowerCase().includes(source.title.toLowerCase()) && t.toLowerCase() !== source.title.toLowerCase()
                            );
                            if (filtered.length === 0) return null;
                            return (
                              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-40 overflow-y-auto">
                                {filtered.map(t => (
                                  <button
                                    key={t}
                                    type="button"
                                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      updateVideoSource(index, 'title', t);
                                      setActiveTitleIndex(null);
                                    }}
                                  >
                                    {t}
                                  </button>
                                ))}
                              </div>
                            );
                          })()}
                        </div>
                        <Select
                          value={source.language || ""}
                          onValueChange={(val) => updateVideoSource(index, 'language', val)}
                        >
                          <SelectTrigger className="w-[160px] text-sm">
                            <SelectValue placeholder="Idioma" />
                          </SelectTrigger>
                          <SelectContent>
                            {VIDEO_LANGUAGES.map(lang => (
                              <SelectItem key={lang.value} value={lang.value || "_none"}>
                                {lang.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Input
                        value={source.url}
                        onChange={(e) => updateVideoSource(index, 'url', e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="flex flex-col gap-1 pt-1">
                      {videoSources.length > 1 && (
                        <Button type="button" variant="ghost" size="icon" onClick={() => removeVideoSource(index)} className="h-8 w-8 text-destructive hover:text-destructive">
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Video Preview */}
                {videoSources.some(s => s.url.trim()) && (
                  <div className="mt-3">
                    <p className="text-sm text-muted-foreground mb-2">Vista previa:</p>
                    {videoSources.filter(s => s.url.trim()).length > 1 && (
                      <div className="flex gap-2 mb-2 flex-wrap">
                        {videoSources.map((s, i) => s.url.trim() && (
                          <Button
                            key={i}
                            type="button"
                            variant={previewSourceIndex === i ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPreviewSourceIndex(i)}
                          >
                            {s.title || `Video ${i + 1}`}
                          </Button>
                        ))}
                      </div>
                    )}
                    {hasPreviewUrl && (
                      !isDirectVideoUrl(currentPreviewSource.url) ? (
                        <div className="w-full aspect-video rounded-lg overflow-hidden">
                          <iframe
                            src={currentPreviewSource.url}
                            className="w-full h-full"
                            allowFullScreen
                            allow="autoplay; fullscreen"
                            frameBorder="0"
                          />
                        </div>
                      ) : (
                        <VideoPlayer
                          videoUrl={currentPreviewSource.url}
                          thumbnailUrl={formData.thumbnail_url}
                          episodeTitle={formData.title || "Vista previa"}
                          thumbnailSpriteUrl={formData.thumbnail_sprite_url}
                          thumbnailCount={formData.thumbnail_count ? parseInt(formData.thumbnail_count) : 60}
                          thumbnailColumns={formData.thumbnail_columns ? parseInt(formData.thumbnail_columns) : 10}
                          episodeId=""
                          skipCreditsTime={formData.skip_credits_time_minutes ? Math.floor(parseFloat(formData.skip_credits_time_minutes)) * 60 + Math.round((parseFloat(formData.skip_credits_time_minutes) - Math.floor(parseFloat(formData.skip_credits_time_minutes))) * 100) : undefined}
                          skipCreditsTo={formData.skip_credits_to_minutes ? Math.floor(parseFloat(formData.skip_credits_to_minutes)) * 60 + Math.round((parseFloat(formData.skip_credits_to_minutes) - Math.floor(parseFloat(formData.skip_credits_to_minutes))) * 100) : undefined}
                        />
                      )
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="thumbnail_url">URL del Thumbnail</Label>
                <Input id="thumbnail_url" value={formData.thumbnail_url} onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })} placeholder="https://..." />
              </div>

              <div>
                <Label htmlFor="thumbnail_sprite_url">URL del Sprite de Thumbnails</Label>
                <Input id="thumbnail_sprite_url" value={formData.thumbnail_sprite_url} onChange={(e) => setFormData({ ...formData, thumbnail_sprite_url: e.target.value })} placeholder="https://..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="thumbnail_count">Cantidad de Thumbnails</Label>
                  <Input id="thumbnail_count" type="number" value={formData.thumbnail_count} onChange={(e) => setFormData({ ...formData, thumbnail_count: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="thumbnail_columns">Columnas de Thumbnails</Label>
                  <Input id="thumbnail_columns" type="number" value={formData.thumbnail_columns} onChange={(e) => setFormData({ ...formData, thumbnail_columns: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="skip_credits_time_minutes">Saltar créditos (MM.SS)</Label>
                  <Input id="skip_credits_time_minutes" type="number" step="0.01" value={formData.skip_credits_time_minutes} onChange={(e) => setFormData({ ...formData, skip_credits_time_minutes: e.target.value })} placeholder="21.40" />
                </div>
                <div>
                  <Label htmlFor="skip_credits_to_minutes">Saltar hasta (MM.SS)</Label>
                  <Input id="skip_credits_to_minutes" type="number" step="0.01" value={formData.skip_credits_to_minutes} onChange={(e) => setFormData({ ...formData, skip_credits_to_minutes: e.target.value })} placeholder="22.30" />
                </div>
              </div>

              <div>
                <Label htmlFor="original_release_date">Fecha de Lanzamiento</Label>
                <DatePicker date={formData.original_release_date} onDateChange={(date) => setFormData({ ...formData, original_release_date: date })} />
              </div>
            </div>

          </Card>
        </div>
      </main>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará permanentemente el episodio. Esta operación no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={exitDialogOpen} onOpenChange={setExitDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Salir sin guardar?</AlertDialogTitle>
            <AlertDialogDescription>Tienes cambios sin guardar. ¿Qué deseas hacer?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction onClick={handleExitWithoutSaving} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Salir sin guardar</AlertDialogAction>
            <AlertDialogAction onClick={handleSaveAndExit}>Guardar y salir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminEpisodeDetail;
