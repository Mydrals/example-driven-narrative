import { useNavigate, useLocation } from "react-router-dom";
import { Search, Home, Calendar } from "lucide-react";
import { useEffect, useState } from "react";

const BottomNav = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());

  useEffect(() => {
    if (!isIOS || !window.visualViewport) return;
    const handle = () => {
      setIsKeyboardOpen(window.innerHeight - window.visualViewport!.height > 150);
    };
    window.visualViewport.addEventListener('resize', handle);
    window.visualViewport.addEventListener('scroll', handle);
    return () => {
      window.visualViewport?.removeEventListener('resize', handle);
      window.visualViewport?.removeEventListener('scroll', handle);
    };
  }, [isIOS]);

  if (isKeyboardOpen || location.pathname === '/auth') return null;

  const items = [
    { path: "/", label: "Inicio", icon: <Home strokeWidth={2} className="h-6 w-6" /> },
    {
      path: "/explorar", label: "Explorar", icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
      )
    },
    { path: "/calendario", label: "Calendario", icon: <Calendar strokeWidth={2} className="h-6 w-6" /> },
    { path: "/search", label: "Buscar", icon: <Search strokeWidth={2} className="h-6 w-6" /> },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-background/95 backdrop-blur-sm border-t border-border/50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-center justify-around h-14">
        {items.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
              isActive(item.path) ? 'text-foreground' : 'text-foreground/50'
            }`}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
