import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { User, LogOut, Settings, Bookmark, Shield, Layers, Check } from "lucide-react";
import EyeForward from "@/components/icons/EyeForward";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import Header from "@/components/Header";
import { useUserRole } from "@/contexts/UserRoleContext";
import { useQuery } from "@tanstack/react-query";
import UserAnimeCard from "@/components/UserAnimeCard";

type TabType = "mi-lista" | "seguir-viendo" | "por-ver" | "completado";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("mi-lista");
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [username, setUsername] = useState<string>("");

  // Fetch user's anime lists
  const { data: userAnimeList = [], isLoading: listLoading } = useQuery({
    queryKey: ["user-anime-list", user?.id, activeTab],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("user_anime_lists")
        .select(`
          *,
          animes (
            id,
            title,
            slug,
            poster_url,
            language
          )
        `)
        .eq("user_id", user.id)
        .eq("status", activeTab)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  useEffect(() => {
    // Verificar sesión actual
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
        
        // Cargar username
        const { data: profile } = await supabase
          .from("profiles")
          .select("username")
          .eq("id", session.user.id)
          .single();
        
        if (profile?.username) {
          setUsername(profile.username);
        }
      }
      setLoading(false);
    };

    checkSession();

    // Escuchar cambios en autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión correctamente",
      });
      navigate("/");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cerrar la sesión",
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

  const tabs: { id: TabType; label: string; icon: any | null }[] = [
    { id: "mi-lista", label: "", icon: Bookmark },
    { id: "seguir-viendo", label: "Viendo", icon: EyeForward },
    { id: "por-ver", label: "Por ver", icon: Layers },
    { id: "completado", label: "Completado", icon: Check },
  ];

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

      {/* Contenido principal */}
      <main className={isIOSPWA() ? "pt-[calc(56px+env(safe-area-inset-top))] pb-12" : "pt-20 pb-12"}>
        {/* Header del perfil */}
        <div className="border-b border-border/30 pb-4 md:pb-6 mb-6 md:mb-8">
          <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]">
            <div className="flex flex-col gap-4 items-center">
              <div className="flex flex-col items-center gap-3 md:gap-4">
                <div className="h-12 w-12 md:h-16 md:w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center flex-shrink-0">
                  <User className="h-6 w-6 md:h-8 md:w-8 text-primary" strokeWidth={2} />
                </div>
                <div className="text-center">
                  <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-foreground">
                    {username || "Usuario"}
                  </h1>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {user?.email}
                  </p>
                </div>
              </div>
              
              {/* Botones de acción */}
              <div className="flex gap-2 flex-wrap justify-center">
                <Button
                  onClick={() => navigate("/profile/settings")}
                  variant="outline"
                  size="sm"
                  className="border-foreground/50 hover:bg-foreground hover:text-background text-xs md:text-sm transition-all"
                >
                  <Settings className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" strokeWidth={2} />
                  <span className="hidden xs:inline">Configuración</span>
                  <span className="xs:hidden">Config</span>
                </Button>
                
                {isAdmin && (
                  <Button
                    onClick={() => navigate("/admin")}
                    variant="outline"
                    size="sm"
                    className="border-foreground/50 hover:bg-foreground hover:text-background text-xs md:text-sm transition-all"
                  >
                    <Shield className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" strokeWidth={2} />
                    <span className="hidden xs:inline">Administración</span>
                    <span className="xs:hidden">Admin</span>
                  </Button>
                )}
                
                <Button
                  onClick={handleSignOut}
                  variant="outline"
                  size="sm"
                  className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground text-xs md:text-sm transition-all"
                >
                  <LogOut className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" strokeWidth={2} />
                  Salir
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Pestañas */}
        <div className="border-b border-border/30 mb-6">
          <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]">
            <div className="grid grid-cols-4 md:flex md:gap-6 lg:gap-8 md:justify-center">
              {tabs.map((tab) => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative pb-3 text-base md:text-lg font-medium transition-all flex items-center justify-center gap-1 md:gap-2 ${
                      activeTab === tab.id
                        ? "text-foreground"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {IconComponent && <IconComponent className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2} />}
                    {tab.label && <span className="text-xs md:text-base whitespace-nowrap">{tab.label}</span>}
                    {activeTab === tab.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Contenido de la pestaña */}
        <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]">
          <div className="mb-4 md:mb-6">
            <h2 className="text-lg md:text-xl lg:text-2xl font-bold text-foreground">
              {activeTab === "mi-lista" && "Tu lista completa"}
              {activeTab === "seguir-viendo" && "Continúa viendo"}
              {activeTab === "por-ver" && "Pendientes por ver"}
              {activeTab === "completado" && "Animes completados"}
            </h2>
          </div>

          {/* Área de contenido */}
          {listLoading ? (
            <div className="min-h-[300px] md:min-h-[400px] flex items-center justify-center">
              <div className="text-muted-foreground">Cargando...</div>
            </div>
          ) : userAnimeList.length === 0 ? (
            <div className="min-h-[300px] md:min-h-[400px] flex items-center justify-center">
              <div className="text-center px-4">
                <div className="mb-4">
                  <User className="h-12 w-12 md:h-16 md:w-16 text-muted-foreground/30 mx-auto" strokeWidth={1.5} />
                </div>
                <h3 className="text-lg md:text-xl font-semibold text-foreground mb-2">
                  No hay animes en esta sección
                </h3>
                <p className="text-sm md:text-base text-muted-foreground mb-6">
                  Comienza a agregar animes para verlos aquí
                </p>
                <Button onClick={() => navigate("/")}>
                  Explorar animes
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 md:gap-4">
              {userAnimeList.map((item: any) => (
                <UserAnimeCard
                  key={item.id}
                  animeId={item.anime_id}
                  slug={item.animes.slug}
                  title={item.animes.title}
                  image={item.animes.poster_url || ""}
                  progress={item.progress}
                  totalEpisodes={item.total_episodes}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Profile;
