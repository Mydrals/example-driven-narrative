import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff } from "lucide-react";
import { z } from "zod";

const emailSchema = z.string().email("Email inválido").max(255);
const passwordSchema = z.string().min(6, "La contraseña debe tener al menos 6 caracteres").max(100);
const usernameSchema = z.string().min(3, "El nombre de usuario debe tener al menos 3 caracteres").max(30, "El nombre de usuario debe tener máximo 30 caracteres").regex(/^[a-zA-Z0-9_]+$/, "Solo letras, números y guión bajo");

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Verificar si el usuario ya está autenticado
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    
    checkSession();

    // Escuchar cambios en autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar inputs
      emailSchema.parse(email);
      passwordSchema.parse(password);
      
      if (!isLogin) {
        usernameSchema.parse(username);
      }

      if (isLogin) {
        // Iniciar sesión
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });

        if (error) {
          if (error.message.includes("Invalid login credentials")) {
            toast({
              title: "Error de autenticación",
              description: "Email o contraseña incorrectos",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "¡Bienvenido!",
            description: "Has iniciado sesión correctamente",
          });
        }
      } else {
        // Registrarse
        const redirectUrl = `${window.location.origin}/`;
        
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            emailRedirectTo: redirectUrl,
            data: {
              username: username.trim(),
            },
          },
        });

        if (error) {
          if (error.message.includes("User already registered")) {
            toast({
              title: "Usuario existente",
              description: "Este email ya está registrado. Inicia sesión en su lugar.",
              variant: "destructive",
            });
          } else {
            throw error;
          }
        } else {
          toast({
            title: "¡Cuenta creada!",
            description: "Revisa tu email para confirmar tu cuenta (si está habilitado)",
          });
        }
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
          description: "Ocurrió un error. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      toast({
        title: "Email requerido",
        description: "Por favor ingresa tu email para recuperar tu contraseña",
        variant: "destructive",
      });
      return;
    }

    try {
      emailSchema.parse(email);
      setLoading(true);

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/`,
      });

      if (error) throw error;

      toast({
        title: "Email enviado",
        description: "Revisa tu correo para restablecer tu contraseña",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Email inválido",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "No se pudo enviar el email. Intenta de nuevo.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center relative overflow-hidden">
      {/* Fondo con gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-cr-dark-gray to-background">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      {/* Logo en la esquina superior izquierda */}
      <div 
        className="absolute top-8 left-8 cursor-pointer z-10"
        onClick={() => navigate("/")}
      >
        <img 
          src="/logo/logo.png" 
          alt="Nagaro logo" 
          className="h-10 w-auto opacity-60 hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Contenedor principal */}
      <div className="relative z-10 w-full max-w-md px-6">
        <div className="bg-card/50 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
          {/* Título */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {isLogin ? "Bienvenido" : "Crear cuenta"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin 
                ? "Inicia sesión para continuar" 
                : "Únete a la comunidad de Nagaro"}
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              {/* Email */}
              <div>
                <label htmlFor="email" className="text-sm font-medium text-foreground/80 block mb-2">
                  Email
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="bg-background/50 border-border/50 focus:border-primary transition-all h-12"
                  disabled={loading}
                />
              </div>

              {/* Nombre de usuario - solo en registro */}
              {!isLogin && (
                <div>
                  <label htmlFor="username" className="text-sm font-medium text-foreground/80 block mb-2">
                    Nombre de usuario
                  </label>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="usuario123"
                    required
                    className="bg-background/50 border-border/50 focus:border-primary transition-all h-12"
                    disabled={loading}
                  />
                </div>
              )}

              {/* Contraseña */}
              <div>
                <label htmlFor="password" className="text-sm font-medium text-foreground/80 block mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="bg-background/50 border-border/50 focus:border-primary transition-all h-12 pr-12"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    disabled={loading}
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Botón principal */}
            <Button
              type="submit"
              className="w-full h-12 text-base font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-lg hover:shadow-xl"
              disabled={loading}
            >
              {loading ? "Cargando..." : isLogin ? "Iniciar sesión" : "Crear cuenta"}
            </Button>
          </form>

          {/* Alternar entre login y registro */}
          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              {isLogin ? "¿No tienes cuenta?" : "¿Ya tienes cuenta?"}{" "}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setEmail("");
                  setPassword("");
                  setUsername("");
                }}
                className="text-primary hover:text-primary/80 font-semibold transition-colors"
                disabled={loading}
              >
                {isLogin ? "Regístrate" : "Inicia sesión"}
              </button>
            </p>
          </div>

          {/* Olvidaste tu contraseña */}
          {isLogin && (
            <div className="mt-4 text-center">
              <button 
                type="button"
                onClick={handleForgotPassword}
                className="text-sm text-muted-foreground hover:text-primary transition-colors"
                disabled={loading}
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
          )}
        </div>

        {/* Texto informativo */}
        <p className="text-center text-xs text-muted-foreground mt-6 px-4">
          Al continuar, aceptas nuestros Términos de Servicio y Política de Privacidad
        </p>
      </div>
    </div>
  );
};

export default Auth;
