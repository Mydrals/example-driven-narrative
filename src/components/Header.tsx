import { Search, User } from "lucide-react";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const [isIOS, setIsIOS] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    const iOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    setIsIOS(iOS);
    if (iOS) {
      document.body.classList.add("ios");
    }
  }, []);

  // Usar visualViewport API para detectar teclado en iOS
  useEffect(() => {
    if (!isIOS || !window.visualViewport) return;

    const handleViewportChange = () => {
      // Si el visualViewport es significativamente más pequeño que innerHeight, el teclado está abierto
      const keyboardOpen = window.innerHeight - window.visualViewport.height > 150;
      setIsKeyboardOpen(keyboardOpen);
    };

    window.visualViewport.addEventListener('resize', handleViewportChange);
    window.visualViewport.addEventListener('scroll', handleViewportChange);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleViewportChange);
        window.visualViewport.removeEventListener('scroll', handleViewportChange);
      }
    };
  }, [isIOS]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 300);
    };

    window.addEventListener("scroll", handleScroll);
    
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    // Verificar sesión actual
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
    };

    checkSession();

    // Escuchar cambios en autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Ocultar header completamente cuando el teclado está abierto
  if (isKeyboardOpen) {
    return null;
  }

  // Detectar si estamos en páginas con header sólido
  const isEpisodePage = location.pathname.includes('/episode/');
  const isAdminPage = location.pathname.includes('/admin') || location.pathname.includes('/profile');
  const isGenresPage = location.pathname === '/generos';
  const hasSolidHeader = isEpisodePage || isAdminPage || isGenresPage;

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500 ease-out"
      style={{
        height: 'calc(56px + env(safe-area-inset-top))',
        paddingTop: isKeyboardOpen ? '0' : 'env(safe-area-inset-top)',
        top: isKeyboardOpen ? '0' : undefined,
        background: (isScrolled || hasSolidHeader) ? 'rgba(10, 10, 10, 1)' : undefined,
        backdropFilter: (isScrolled || hasSolidHeader) ? 'none' : undefined,
        transform: 'translateZ(0)' // Fuerza aceleración por hardware para mejor rendering en iOS
      }}
    >
      {/* Shader degradado */}
      <div 
        className="absolute top-0 left-0 w-full h-full pointer-events-none transition-opacity duration-500 ease-out"
        style={{
          background: 'linear-gradient(to bottom, rgba(10, 10, 10, 0.85) 0%, rgba(10, 10, 10, 0.6) 50%, transparent 100%)',
          opacity: (isScrolled || hasSolidHeader) ? 0 : 1
        }}
      />
      
      <div className="relative flex items-center justify-between px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)] h-14">
        {/* Logo */}
        <div 
          className="flex items-center cursor-pointer ml-0.5" 
          onClick={() => navigate("/")}
        >
          <img 
            src="/logo/logo.png" 
            alt="Nagaro logo" 
            className={`h-8 w-auto transition-opacity ${isTouchDevice ? 'opacity-100' : 'opacity-60 hover:opacity-100'}`}
            loading="eager"
            decoding="async"
            fetchPriority="high"
          />
        </div>

        {/* Navigation - Centered */}
        <nav className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-8">
          <button 
            onClick={() => navigate("/")} 
            className={`transition-all text-base font-bold ${
              location.pathname === '/' 
                ? 'text-foreground' 
                : isTouchDevice ? 'text-foreground/80' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Inicio
          </button>
          <button 
            onClick={() => navigate("/explorar")}
            className={`transition-all text-base font-bold ${
              location.pathname === '/explorar' 
                ? 'text-foreground' 
                : isTouchDevice ? 'text-foreground/80' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Explorar
          </button>
          <button 
            onClick={() => navigate("/calendario")}
            className={`transition-all text-base font-bold ${
              location.pathname === '/calendario' 
                ? 'text-foreground' 
                : isTouchDevice ? 'text-foreground/80' : 'text-foreground/60 hover:text-foreground'
            }`}
          >
            Calendario
          </button>
        </nav>

        {/* Right side icons */}
        <div className="flex items-center gap-2">
          {/* Buscar - solo desktop */}
          <Button 
            variant="ghost" 
            size="icon" 
            className={`hidden md:flex hover:bg-transparent transition-all [&_svg]:!w-auto [&_svg]:!h-6 ${
              location.pathname === '/search'
                ? 'text-foreground'
                : isTouchDevice ? 'text-foreground/80' : 'text-foreground/60 hover:text-foreground'
            }`}
            onClick={() => navigate("/search")}
          >
            <Search strokeWidth={2} />
          </Button>
          {/* Perfil */}
          <Avatar
            className="h-8 w-8 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={() => navigate(user ? "/profile" : "/auth")}
          >
            <AvatarFallback className="bg-foreground/10">
              <User className="h-5 w-5 text-foreground/60" strokeWidth={2} />
            </AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
};

export default Header;
