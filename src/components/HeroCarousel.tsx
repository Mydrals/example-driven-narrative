import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Play, Bookmark } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { getProxiedImageUrl } from "@/lib/imageProxy";

const SLIDE_DURATION = 10000; // 10 seconds per slide

interface Anime {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  year: number | null;
  language: string | null;
  poster_url: string | null;
  hero_banner_url: string | null;
  logo_url: string | null;
  mobile_hero_banner_url: string | null;
  mobile_banner_focus?: string | null;
}

interface HeroCarouselProps {
  animes: Anime[];
}

const HeroCarousel = ({ animes }: HeroCarouselProps) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [progress, setProgress] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);
  const navigate = useNavigate();

  const slides = animes.map((anime) => ({
    id: anime.id,
    slug: anime.slug,
    title: anime.title,
    logo: anime.logo_url,
    description: anime.description,
    image: anime.hero_banner_url,
    mobileImage: anime.mobile_hero_banner_url,
    mobileFocus: (anime as any).mobile_banner_focus || 'center',
    year: anime.year,
    language: anime.language,
  }));

  // Auto-advance slides
  useEffect(() => {
    if (slides.length === 0) return;
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentSlide((current) => (current + 1) % slides.length);
          return 0;
        }
        return prev + (100 / (SLIDE_DURATION / 100));
      });
    }, 100);

    return () => clearInterval(interval);
  }, [slides.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % slides.length);
    setProgress(0);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    setProgress(0);
  };

  const goToSlide = (index: number) => {
    setCurrentSlide(index);
    setProgress(0);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const minSwipeDistance = 50;
    
    if (distance > minSwipeDistance) {
      nextSlide();
    } else if (distance < -minSwipeDistance) {
      prevSlide();
    }
    
    setTouchStart(0);
    setTouchEnd(0);
  };

  // Return early if no slides
  if (slides.length === 0) {
    return (
      <div className="relative h-[40vh] sm:h-[50vh] md:h-[60vh] lg:h-[70vh] xl:h-[80vh] w-full bg-background flex items-center justify-center">
        <p className="text-muted-foreground">No hay contenido disponible</p>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full overflow-hidden aspect-[3/4] break-500:aspect-[4/3] break-800:aspect-auto break-800:h-[40vh] sm:break-800:h-[50vh] md:break-800:h-[60vh] lg:break-800:h-[70vh] xl:break-800:h-[80vh]"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Slide */}
      <div
        className="absolute inset-0 bg-cover bg-center break-800:bg-top transition-all duration-700 break-800:cursor-default cursor-pointer"
        style={{ 
          backgroundImage: slides[currentSlide]
            ? `url(${getProxiedImageUrl(window.innerWidth < 500 && slides[currentSlide].mobileImage 
                ? slides[currentSlide].mobileImage 
                : slides[currentSlide].image)})` 
            : 'none',
          backgroundColor: 'hsl(var(--background))',
          backgroundPosition: window.innerWidth < 800 && !slides[currentSlide]?.mobileImage
            ? slides[currentSlide]?.mobileFocus || 'center'
            : undefined,
        }}
        onClick={(e) => {
          if (window.innerWidth < 800) {
            navigate(`/series/${slides[currentSlide].slug}`);
          }
        }}
      >
        {/* Gradient Overlay - Shadows on content area and bottom */}
        <div className="absolute inset-0 hidden break-800:block bg-gradient-to-r from-cr-black/75 via-cr-black/50 via-30% to-transparent to-55%"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-cr-black via-cr-black/80 via-10% to-transparent to-50%"></div>

        {/* Content */}
        <div className="relative h-full flex items-end break-800:items-center justify-center break-800:justify-start pb-9 break-800:pb-0 px-[20px] xs:px-[30px] break-800:pl-8 lg:px-[clamp(30px,5vw,78px)]">
          <div className="max-w-full break-800:max-w-[30vw] space-y-2 sm:space-y-3 md:space-y-4 animate-fade-in w-full break-800:w-auto text-center break-800:text-left lg:ml-0.5">
            {/* Year and Language */}
            <div className="flex items-center justify-center break-800:justify-start gap-1.5 text-xs sm:text-sm">
              <span className="bg-cr-black/50 border-2 border-foreground/30 px-1.5 sm:px-2 py-0.5 rounded text-foreground">
                {slides[currentSlide].year}
              </span>
              <span className="text-foreground/90">
                • {slides[currentSlide].language}
              </span>
            </div>

            {/* Logo or Title */}
            {slides[currentSlide].logo ? (
              <div className="flex justify-center break-800:justify-start">
                <img 
                  src={getProxiedImageUrl(slides[currentSlide].logo)} 
                  alt={slides[currentSlide].title}
                  className="h-auto max-h-28 xs:max-h-32 sm:max-h-36 break-800:max-h-20 lg:max-h-28 xl:max-h-36 w-auto object-contain drop-shadow-2xl cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => navigate(`/series/${slides[currentSlide].slug}`)}
                  loading="eager"
                  decoding="async"
                  fetchPriority="high"
                />
              </div>
            ) : (
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-6xl xl:text-7xl font-black text-foreground leading-tight drop-shadow-2xl">
                {slides[currentSlide].title}
              </h1>
            )}

            {/* Description */}
            <p className="hidden lg:[display:-webkit-box] text-base text-foreground/90 max-w-lg xl:max-w-xl leading-relaxed drop-shadow-lg clamp-3 mx-auto break-800:mx-0">
              {slides[currentSlide].description}
            </p>

            {/* Buttons */}
            <div className="hidden break-800:flex items-center justify-start gap-2 pt-1 sm:pt-2">
              <Button className="bg-foreground/70 hover:bg-foreground text-cr-black w-[201px] h-[44px] text-xs sm:text-sm font-bold rounded transition-all">
                <Play className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2 fill-current" />
                <span>COMENZAR A VER</span>
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="w-[44px] h-[44px] border-2 border-foreground/30 bg-cr-black/50 text-foreground hover:bg-foreground hover:text-cr-black transition-all"
              >
                <Bookmark className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Arrows */}
      <button
        onClick={prevSlide}
        className="hidden lg:block absolute left-1 sm:left-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-all z-10"
        aria-label="Previous slide"
      >
        <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2} />
      </button>
      <button
        onClick={nextSlide}
        className="hidden lg:block absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground transition-all z-10"
        aria-label="Next slide"
      >
        <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10" strokeWidth={2} />
      </button>

      {/* Progress Indicators */}
      <div className="absolute bottom-0 break-800:bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10 pb-2 break-800:pb-0">
        {slides.map((_, index) => (
          <button
            key={index}
            onClick={() => goToSlide(index)}
            className={`relative rounded-full overflow-hidden backdrop-blur-sm transition-all ${
              index === currentSlide 
                ? 'w-12 sm:w-12 h-2 bg-cr-gray/60' 
                : 'w-2 h-2 bg-cr-gray/40 hover:bg-cr-gray/60'
            }`}
            aria-label={`Go to slide ${index + 1}`}
          >
            {index === currentSlide && (
              <div 
                className="absolute inset-0 bg-primary rounded-full transition-all duration-100 ease-linear"
                style={{
                  width: `${progress}%`
                }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};

export default HeroCarousel;
