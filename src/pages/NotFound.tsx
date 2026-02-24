import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/Header";
import { Frown, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="relative">
              <Frown className="w-32 h-32 text-primary" strokeWidth={1.5} />
              <div className="absolute inset-0 blur-2xl opacity-30">
                <Frown className="w-32 h-32 text-primary" />
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <h1 className="text-6xl md:text-7xl font-black text-foreground">
              404
            </h1>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground">
              ¡Ups! Página no encontrada
            </h2>
          </div>
          
          <p className="text-lg text-muted-foreground">
            Parece que esta página se fue de aventura y no dejó dirección. 
            <br />
            ¿Qué tal si volvemos al inicio?
          </p>
          
          <Link to="/">
            <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
              <Home className="w-4 h-4 mr-2" />
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
