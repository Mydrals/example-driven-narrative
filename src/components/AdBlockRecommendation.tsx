import { Shield, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AdBlockRecommendation = () => {
  const navigate = useNavigate();

  return (
    <section className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)] pt-6 max-[500px]:pt-1 pb-6 max-[500px]:pb-1">
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-card/50 backdrop-blur-sm">
        {/* Subtle gradient accent */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
        <div className="flex items-center gap-3 xs:gap-4 p-4 xs:p-5 md:p-6">
          {/* Icon */}
          <div className="flex-shrink-0 w-9 h-9 xs:w-10 xs:h-10 md:w-11 md:h-11 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 xs:w-5 xs:h-5 md:w-[22px] md:h-[22px] text-primary" strokeWidth={1.8} />
          </div>

          {/* Text */}
          <div className="flex-1 min-w-0">
            <p className="text-sm xs:text-[15px] md:text-base font-semibold text-foreground leading-snug">
              Te recomendamos usar AdGuard
            </p>
            <p className="text-xs xs:text-[13px] md:text-sm text-muted-foreground mt-0.5 leading-snug">
              Bloquea anuncios de los reproductores externos para una mejor experiencia. <span className="hidden xs:inline text-muted-foreground/70">AdGuard es un software de terceros no afiliado a Nagaro.</span>
            </p>
          </div>

          {/* CTA */}
          <button
            onClick={() => navigate("/adguard")}
            className="flex-shrink-0 flex items-center gap-1 text-xs xs:text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
          >
            <span className="hidden xs:inline">Cómo instalar</span>
            <span className="xs:hidden">Ver</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </section>
  );
};

export default AdBlockRecommendation;
