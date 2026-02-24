import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus, Settings } from "lucide-react";
import type { User } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { useUserRole } from "@/contexts/UserRoleContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Anime {
  id: string;
  title: string;
  poster_url: string | null;
  year: number | null;
  language: string | null;
  slug: string;
}

interface Manga {
  id: string;
  title: string;
  poster_url: string | null;
  slug: string;
}

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [animes, setAnimes] = useState<Anime[]>([]);
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);
  const { role, isAdmin, loading: roleLoading } = useUserRole();
  const [activeTab, setActiveTab] = useState("animes");

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

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    console.log("Admin check:", { roleLoading, isAdmin, role, user: !!user });
    
    // Solo verificar cuando roleLoading sea false y tengamos un usuario
    if (!roleLoading && user) {
      if (!isAdmin) {
        toast({
          title: "Acceso denegado",
          description: "No tienes permisos de administrador",
          variant: "destructive",
        });
        navigate("/profile");
      }
    }
  }, [isAdmin, roleLoading, role, user, navigate, toast]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [animesResult, mangasResult] = await Promise.all([
          supabase
            .from("animes")
            .select("id, title, poster_url, year, language, slug")
            .order("updated_at", { ascending: false }),
          supabase
            .from("mangas")
            .select("id, title, poster_url, slug")
            .order("updated_at", { ascending: false })
        ]);

        if (animesResult.error) throw animesResult.error;
        if (mangasResult.error) throw mangasResult.error;

        setAnimes(animesResult.data || []);
        setMangas(mangasResult.data || []);
      } catch (error) {
        console.error("Error fetching data:", error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin && user) {
      fetchData();
    }
  }, [isAdmin, user, toast]);

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

  // Detectar si está en iOS PWA
  const isIOSPWA = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                        (window.navigator as any).standalone === true;
    return isIOS && isStandalone;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className={isIOSPWA() ? "pt-[calc(56px+env(safe-area-inset-top))] pb-12" : "pt-20 pb-12"}>
        <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground flex items-center gap-3">
              <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Settings className="h-6 w-6 sm:h-7 sm:w-7 text-primary" strokeWidth={2} />
              </div>
              <span className="break-words">Panel de Administración</span>
            </h1>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <TabsList>
                <TabsTrigger value="animes">Animes</TabsTrigger>
                <TabsTrigger value="mangas">Mangas</TabsTrigger>
              </TabsList>
              
              <Button 
                onClick={() => navigate(activeTab === "animes" ? "/admin/anime/new" : "/admin/manga/new")} 
                className="gap-2 w-full sm:w-auto"
              >
                <Plus className="h-5 w-5" />
                {activeTab === "animes" ? "Nuevo Anime" : "Nuevo Manga"}
              </Button>
            </div>

            <TabsContent value="animes" className="mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-4">
                {animes.map((anime) => (
                  <div
                    key={anime.id}
                    className="group cursor-pointer flex-shrink-0 p-1"
                    onClick={() => navigate(`/admin/anime/${anime.id}`)}
                  >
                    <div className="relative aspect-[2/3] bg-card lg:group-hover:outline lg:group-hover:outline-[2px] lg:group-hover:outline-white lg:group-hover:outline-offset-2 overflow-hidden">
                      {anime.poster_url ? (
                        <img
                          src={anime.poster_url}
                          alt={anime.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">Sin imagen</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      <h3 className="font-bold text-muted-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {anime.title}
                      </h3>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {anime.year && <span>{anime.year}</span>}
                        {anime.language && (
                          <>
                            <span>•</span>
                            <span>{anime.language}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {animes.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No hay animes registrados</p>
                  <Button onClick={() => navigate("/admin/anime/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primer anime
                  </Button>
                </div>
              )}
            </TabsContent>

            <TabsContent value="mangas" className="mt-0">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-7 gap-4">
                {mangas.map((manga) => (
                  <div
                    key={manga.id}
                    className="group cursor-pointer flex-shrink-0 p-1"
                    onClick={() => navigate(`/admin/manga/${manga.id}`)}
                  >
                    <div className="relative aspect-[2/3] bg-card lg:group-hover:outline lg:group-hover:outline-[2px] lg:group-hover:outline-white lg:group-hover:outline-offset-2 overflow-hidden">
                      {manga.poster_url ? (
                        <img
                          src={manga.poster_url}
                          alt={manga.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center">
                          <span className="text-muted-foreground text-sm">Sin imagen</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-2 space-y-1">
                      <h3 className="font-bold text-muted-foreground text-sm line-clamp-2 group-hover:text-primary transition-colors">
                        {manga.title}
                      </h3>
                    </div>
                  </div>
                ))}
              </div>

              {mangas.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">No hay mangas registrados</p>
                  <Button onClick={() => navigate("/admin/manga/new")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Crear primer manga
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default Admin;
