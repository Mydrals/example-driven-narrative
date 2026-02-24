import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, User, Mail, Lock, Save } from "lucide-react";
import Header from "@/components/Header";
import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3, "El nombre de usuario debe tener al menos 3 caracteres")
  .max(30, "El nombre de usuario debe tener máximo 30 caracteres")
  .regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo");

const ProfileSettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        navigate("/auth");
        return;
      }

      setUserId(session.user.id);
      setEmail(session.user.email || "");

      // Cargar username desde profiles
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", session.user.id)
        .single();

      if (profile?.username) {
        setUsername(profile.username);
      }
    };

    loadProfile();
  }, [navigate]);

  const handleUpdateUsername = async () => {
    if (!userId) return;

    try {
      usernameSchema.parse(username);
      setLoading(true);

      const { error } = await supabase
        .from("profiles")
        .update({ username: username.trim() })
        .eq("id", userId);

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation
          toast({
            title: "Nombre no disponible",
            description: "Este nombre de usuario ya está en uso",
            variant: "destructive",
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "¡Actualizado!",
          description: "Tu nombre de usuario ha sido actualizado",
        });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Error de validación",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo actualizar el nombre de usuario",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Detectar si está en iOS PWA
  const isIOSPWA = () => {
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone === true;
    return isIOS && isStandalone;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main
        className={
          isIOSPWA()
            ? "pt-[calc(56px+env(safe-area-inset-top))] pb-12"
            : "pt-20 pb-12"
        }
      >
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          {/* Botón de regresar */}
          <Button
            variant="ghost"
            onClick={() => navigate("/profile")}
            className="mb-6 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al perfil
          </Button>

          {/* Título */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Configuración de perfil
            </h1>
            <p className="text-muted-foreground">
              Personaliza tu cuenta y preferencias
            </p>
          </div>

          {/* Secciones de configuración */}
          <div className="space-y-6">
            {/* Información del perfil */}
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-5 w-5 text-primary" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Información del perfil
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Actualiza tu nombre de usuario
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    htmlFor="username"
                    className="text-sm font-medium text-foreground/80 block mb-2"
                  >
                    Nombre de usuario
                  </label>
                  <div className="flex gap-3">
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="usuario123"
                      className="bg-background/50 border-border/50 focus:border-primary transition-all"
                      disabled={loading}
                    />
                    <Button
                      onClick={handleUpdateUsername}
                      disabled={loading}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Guardar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Solo letras, números y guión bajo. Mínimo 3 caracteres.
                  </p>
                </div>
              </div>
            </div>

            {/* Email (solo lectura por ahora) */}
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Email
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Tu dirección de correo electrónico
                  </p>
                </div>
              </div>

              <div>
                <Input
                  type="email"
                  value={email}
                  disabled
                  className="bg-background/30 border-border/30 text-muted-foreground"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Próximamente podrás cambiar tu email
                </p>
              </div>
            </div>

            {/* Contraseña (próximamente) */}
            <div className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-xl p-6 opacity-60">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Lock className="h-5 w-5 text-primary" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    Contraseña
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Cambia tu contraseña
                  </p>
                </div>
              </div>

              <div className="text-center py-4">
                <p className="text-muted-foreground">
                  Esta función estará disponible próximamente
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ProfileSettings;
