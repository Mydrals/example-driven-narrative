import Header from "@/components/Header";
import { Shield, Chrome, Smartphone, Monitor, ChevronRight, ExternalLink, Apple, Globe } from "lucide-react";
import { useState } from "react";

type Platform = "android" | "ios" | "chrome" | "firefox" | "opera" | "brave" | "edge";

interface PlatformInfo {
  id: Platform;
  label: string;
  icon: React.ReactNode;
  category: "mobile" | "extension";
  steps: string[];
  downloadUrl: string;
  downloadLabel: string;
}

const platforms: PlatformInfo[] = [
  {
    id: "android",
    label: "Android",
    icon: <Smartphone className="w-5 h-5" />,
    category: "mobile",
    steps: [
      "Descarga AdGuard desde su página oficial (no está en Google Play).",
      "Abre el archivo APK descargado e instálalo. Si te lo pide, permite la instalación de fuentes desconocidas.",
      "Abre AdGuard y sigue la configuración inicial.",
      "Activa la protección. AdGuard creará una VPN local para filtrar anuncios.",
      "Listo. Los anuncios se bloquearán en el navegador y en apps.",
    ],
    downloadUrl: "https://adguard.com/es/adguard-android/overview.html",
    downloadLabel: "Descargar para Android",
  },
  {
    id: "ios",
    label: "iOS",
    icon: <Apple className="w-5 h-5" />,
    category: "mobile",
    steps: [
      "Descarga AdGuard desde la App Store.",
      "Abre la app y sigue la configuración inicial.",
      "Ve a Ajustes del iPhone → Safari → Bloqueadores de contenido.",
      "Activa todos los filtros de AdGuard.",
      "Para protección avanzada, activa la protección DNS en la app de AdGuard.",
    ],
    downloadUrl: "https://adguard.com/es/adguard-ios/overview.html",
    downloadLabel: "Descargar para iOS",
  },
  {
    id: "chrome",
    label: "Chrome",
    icon: <Chrome className="w-5 h-5" />,
    category: "extension",
    steps: [
      "Ve a la Chrome Web Store y busca \"AdGuard\".",
      "Haz clic en \"Añadir a Chrome\" y confirma.",
      "El icono de AdGuard aparecerá en la barra de extensiones.",
      "Haz clic en el icono para verificar que está activo.",
      "Los anuncios se bloquearán automáticamente en todas las páginas.",
    ],
    downloadUrl: "https://adguard.com/es/adguard-browser-extension/chrome/overview.html",
    downloadLabel: "Instalar extensión Chrome",
  },
  {
    id: "firefox",
    label: "Firefox",
    icon: <Globe className="w-5 h-5" />,
    category: "extension",
    steps: [
      "Ve a la página de complementos de Firefox (addons.mozilla.org) y busca \"AdGuard\".",
      "Haz clic en \"Agregar a Firefox\" y confirma los permisos.",
      "El icono de AdGuard aparecerá en la barra de herramientas.",
      "Haz clic en el icono para verificar que está activo.",
      "Los anuncios se bloquearán automáticamente.",
    ],
    downloadUrl: "https://adguard.com/es/adguard-browser-extension/firefox/overview.html",
    downloadLabel: "Instalar extensión Firefox",
  },
  {
    id: "opera",
    label: "Opera / Opera GX",
    icon: <Monitor className="w-5 h-5" />,
    category: "extension",
    steps: [
      "Abre Opera y ve a la tienda de extensiones (addons.opera.com).",
      "Busca \"AdGuard\" e instala la extensión.",
      "Confirma los permisos solicitados.",
      "El icono aparecerá en la barra de extensiones.",
      "Verifica que esté activo haciendo clic en el icono.",
    ],
    downloadUrl: "https://adguard.com/es/adguard-browser-extension/opera/overview.html",
    downloadLabel: "Instalar extensión Opera",
  },
  {
    id: "brave",
    label: "Brave",
    icon: <Shield className="w-5 h-5" />,
    category: "extension",
    steps: [
      "Brave ya incluye un bloqueador de anuncios integrado. Para protección extra instala AdGuard.",
      "Ve a la Chrome Web Store desde Brave (es compatible).",
      "Busca \"AdGuard\" y haz clic en \"Añadir a Brave\".",
      "Confirma la instalación.",
      "AdGuard complementará el bloqueo nativo de Brave.",
    ],
    downloadUrl: "https://adguard.com/es/adguard-browser-extension/chrome/overview.html",
    downloadLabel: "Instalar extensión Brave",
  },
  {
    id: "edge",
    label: "Edge",
    icon: <Monitor className="w-5 h-5" />,
    category: "extension",
    steps: [
      "Ve a la tienda de complementos de Microsoft Edge.",
      "Busca \"AdGuard\" e instálalo.",
      "Confirma los permisos solicitados.",
      "El icono aparecerá en la barra de extensiones.",
      "Verifica que esté activo haciendo clic en el icono.",
    ],
    downloadUrl: "https://adguard.com/es/adguard-browser-extension/edge/overview.html",
    downloadLabel: "Instalar extensión Edge",
  },
];

const AdGuard = () => {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>("android");

  const currentPlatform = platforms.find((p) => p.id === selectedPlatform)!;
  const mobilePlatforms = platforms.filter((p) => p.category === "mobile");
  const extensionPlatforms = platforms.filter((p) => p.category === "extension");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main>
        <h1 className="sr-only">Cómo instalar AdGuard - Nagaro</h1>

        {/* Hero section */}
        <section className="relative pt-20 pb-10 md:pt-28 md:pb-14 overflow-hidden">
          {/* Background glow */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-primary/5 rounded-full blur-[120px]" />
          </div>

          <div className="relative px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)] text-center max-w-3xl mx-auto">
            <div className="inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-primary/10 mb-5">
              <Shield className="w-7 h-7 md:w-8 md:h-8 text-primary" strokeWidth={1.6} />
            </div>
            <h2 className="text-2xl xs:text-3xl md:text-4xl font-bold text-foreground mb-3 leading-tight">
              Navega sin anuncios molestos
            </h2>
            <p className="text-sm xs:text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
              Te recomendamos instalar <span className="text-foreground font-semibold">AdGuard</span> para bloquear los anuncios de los reproductores externos y disfrutar de una experiencia limpia.
            </p>
          </div>
        </section>

        {/* Platform selector + Steps */}
        <section className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)] pb-16 md:pb-24 max-w-4xl mx-auto">
          
          {/* Platform tabs */}
          <div className="mb-8 md:mb-10">
            {/* Mobile category */}
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2.5">
              Dispositivos móviles
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {mobilePlatforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlatform === p.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>

            {/* Extension category */}
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold mb-2.5">
              Extensiones de navegador
            </p>
            <div className="flex flex-wrap gap-2">
              {extensionPlatforms.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlatform(p.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    selectedPlatform === p.id
                      ? "bg-foreground text-background"
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  {p.icon}
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Steps card */}
          <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
            <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
            
            <div className="p-5 xs:p-6 md:p-8">
              {/* Platform header */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                  {currentPlatform.icon}
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-foreground">
                    {currentPlatform.label}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {currentPlatform.category === "mobile" ? "Aplicación móvil" : "Extensión de navegador"}
                  </p>
                </div>
              </div>

              {/* Steps */}
              <ol className="space-y-4">
                {currentPlatform.steps.map((step, i) => (
                  <li key={i} className="flex gap-3.5">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm md:text-[15px] text-foreground/90 leading-relaxed pt-0.5">
                      {step}
                    </p>
                  </li>
                ))}
              </ol>

              {/* Download button */}
              <div className="mt-8 pt-6 border-t border-border/50">
                <a
                  href={currentPlatform.downloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-foreground text-background text-sm font-semibold hover:bg-foreground/90 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  {currentPlatform.downloadLabel}
                </a>
              </div>
            </div>
          </div>

          {/* Extra note */}
          <div className="mt-6 flex items-start gap-3 px-1">
            <Shield className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              AdGuard es un software de terceros. Nagaro no está afiliado ni es responsable de su funcionamiento. Recomendamos su uso únicamente para mejorar la experiencia al usar reproductores externos.
            </p>
          </div>
        </section>

        <div className="h-24"></div>
      </main>
    </div>
  );
};

export default AdGuard;
