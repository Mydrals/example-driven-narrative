import { Link } from "react-router-dom";
import Header from "@/components/Header";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

const ComingSoon = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="flex justify-center">
            <div className="relative">
              <Sparkles className="w-24 h-24 text-primary animate-pulse" />
              <div className="absolute inset-0 blur-xl opacity-50">
                <Sparkles className="w-24 h-24 text-primary" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold text-foreground">
            Próximamente
          </h1>
          
          <p className="text-lg text-muted-foreground">
            Estamos trabajando en algo increíble. 
            <br />
            ¡Vuelve pronto para descubrirlo!
          </p>
          
          <Link to="/">
            <Button className="mt-4 bg-primary text-primary-foreground hover:bg-primary/90">
              Volver al inicio
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ComingSoon;
