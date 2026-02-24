import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useRef, useEffect } from "react";
import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import AnimeCard from "@/components/AnimeCard";
import { useNavigate } from "react-router-dom";

interface CollectionItem {
  id: string;
  slug: string;
  title: string;
  poster_url: string;
  language: string;
  isManga?: boolean;
}

interface CollectionSectionProps {
  title?: string;
  logo?: string;
  description: string;
  backgroundImage: string;
  items: CollectionItem[];
  buttonText?: string;
  onButtonClick?: () => void;
}

const CollectionSection = ({
  title,
  logo,
  description,
  backgroundImage,
  items,
  buttonText = "Explora más",
  onButtonClick,
}: CollectionSectionProps) => {
  const navigate = useNavigate();
  const [api, setApi] = React.useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = React.useState(false);
  const [canScrollNext, setCanScrollNext] = React.useState(false);
  const [isHovered, setIsHovered] = React.useState(false);
  const [imageHeight, setImageHeight] = React.useState<number>(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!api) return;

    const updateScrollState = () => {
      setCanScrollPrev(api.canScrollPrev());
      setCanScrollNext(api.canScrollNext());
    };

    updateScrollState();
    api.on("select", updateScrollState);
    api.on("reInit", updateScrollState);

    return () => {
      api.off("select", updateScrollState);
      api.off("reInit", updateScrollState);
    };
  }, [api]);

  useEffect(() => {
    const updateImageHeight = () => {
      if (carouselRef.current) {
        const firstImage = carouselRef.current.querySelector('.aspect-\\[2\\/3\\]');
        if (firstImage) {
          const height = firstImage.getBoundingClientRect().height;
          setImageHeight(height);
        }
      }
    };

    updateImageHeight();
    window.addEventListener('resize', updateImageHeight);
    
    const timer = setTimeout(updateImageHeight, 100);

    return () => {
      window.removeEventListener('resize', updateImageHeight);
      clearTimeout(timer);
    };
  }, [items]);

  return (
    <section className="relative w-full overflow-hidden py-1 min-[501px]:py-3 break-800:py-4">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${backgroundImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/80 to-background/60" />
      </div>

      {/* Mobile/Tablet Layout (< 800px) */}
      <div className="block break-800:hidden relative py-2 min-[501px]:py-3">
        <div className="space-y-2 md:space-y-3 mb-4 text-center px-[20px] xs:px-[30px]">
          {logo ? (
            <img 
              src={logo} 
              alt={title || "Collection"}
              className="h-16 md:h-20 w-auto object-contain mx-auto"
            />
          ) : title ? (
            <h2 className="text-2xl md:text-3xl font-bold text-primary uppercase tracking-wider">
              {title}
            </h2>
          ) : null}
          
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
              COLECCIÓN
            </p>
            <p className="text-sm md:text-base text-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </div>

        <div 
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          ref={carouselRef}
        >
          <Carousel
            opts={{
              align: "start",
              loop: false,
              dragFree: false,
              slidesToScroll: "auto",
              skipSnaps: false,
              containScroll: "keepSnaps",
              inViewThreshold: 0,
            }}
            setApi={setApi}
            className="w-full"
          >
            <CarouselContent className="-ml-1.5 md:-ml-3 pl-[18.5px] xs:pl-[28.5px]">
              {items.map((item) => (
                <CarouselItem 
                  key={item.id}
                  className="basis-auto pl-1.5 md:pl-3"
                >
                  <div className="w-[calc((100vw-54px)/2.25)] xs:w-[calc((100vw-60px)/3.25)] md:w-[calc((100vw-80px)/4.25)]">
                    <AnimeCard
                      id={item.id}
                      slug={item.slug}
                      title={item.title}
                      image={item.poster_url}
                      language={item.language}
                      isManga={item.isManga}
                      hideInfo={true}
                      showMangaBadge={true}
                    />
                  </div>
                </CarouselItem>
              ))}
              <div className="min-w-[18.5px] xs:min-w-[28.5px] shrink-0" aria-hidden="true" />
            </CarouselContent>
          </Carousel>
        </div>
      </div>

      {/* Desktop Layout (>= 800px) - Text as first carousel item */}
      <div className="hidden break-800:block relative py-4 lg:py-6">
        <div 
          className="relative"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          ref={carouselRef}
        >
          <Carousel
            opts={{
              align: "start",
              loop: false,
              dragFree: false,
              slidesToScroll: "auto",
              skipSnaps: false,
              containScroll: "keepSnaps",
              inViewThreshold: 0,
            }}
            setApi={setApi}
            className="w-full"
          >
            <div className="relative">
              <CarouselContent className="-ml-1.5 md:-ml-3 3xl:-ml-4 pl-[18.5px] xs:pl-[28.5px] lg:pl-[clamp(28.5px,4.8vw,76.5px)]">
                {/* First Item - Collection Info */}
                <CarouselItem className="basis-auto pl-1.5 md:pl-3 3xl:pl-4">
                  <div className="w-[calc((100vw-100px)/3.5)] xl:w-[calc((100vw-120px)/3.8)] 2xl:w-[calc((100vw-130px)/3.8)] 3xl:w-[calc((100vw-156px)/4.2)] flex flex-col justify-center py-8" style={{ minHeight: imageHeight > 0 ? `${imageHeight}px` : 'auto' }}>
                    {logo ? (
                      <img 
                        src={logo} 
                        alt={title || "Collection"}
                        className="h-16 lg:h-20 xl:h-24 w-auto object-contain mb-4 lg:mb-6"
                      />
                    ) : title ? (
                      <h2 className="text-3xl lg:text-4xl xl:text-5xl font-bold text-primary uppercase tracking-wider mb-4 lg:mb-6">
                        {title}
                      </h2>
                    ) : null}
                    
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                        COLECCIÓN
                      </p>
                      <p className="text-sm lg:text-base text-foreground leading-relaxed">
                        {description}
                      </p>
                    </div>
                  </div>
                </CarouselItem>

                {/* Anime Cards */}
                {items.map((item) => (
                  <CarouselItem 
                    key={item.id}
                    className="basis-auto pl-1.5 md:pl-3 3xl:pl-4"
                  >
                    <div className="w-[calc((100vw-100px)/5.7)] xl:w-[calc((100vw-120px)/5.4)] 2xl:w-[calc((100vw-130px)/5.4)] 3xl:w-[calc((100vw-156px)/6.4)]">
                      <AnimeCard
                        id={item.id}
                      slug={item.slug}
                      title={item.title}
                      image={item.poster_url}
                      language={item.language}
                      isManga={item.isManga}
                      hideInfo={true}
                      showMangaBadge={true}
                    />
                    </div>
                  </CarouselItem>
                ))}
                
                {/* Spacer element to maintain right margin */}
                <div className="min-w-[28.5px] lg:min-w-[clamp(28.5px,4.8vw,76.5px)] shrink-0" aria-hidden="true" />
              </CarouselContent>
              
              {/* Navigation Arrows */}
              {canScrollPrev && isHovered && imageHeight > 0 && (
                <div 
                  className="group absolute left-0 w-20 flex items-center justify-start pl-2 cursor-pointer z-10 transition-all duration-300"
                  style={{ 
                    top: '0px',
                    height: `${imageHeight + 8}px`,
                    background: 'linear-gradient(to right, rgba(10, 10, 10, 0.5) 0%, rgba(10, 10, 10, 0.35) 40%, transparent 100%)' 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, rgba(10, 10, 10, 0.9) 0%, rgba(10, 10, 10, 0.7) 40%, transparent 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, rgba(10, 10, 10, 0.5) 0%, rgba(10, 10, 10, 0.35) 40%, transparent 100%)';
                  }}
                  onClick={() => api?.scrollPrev()}
                >
                  <ChevronLeft className="w-5 h-5 3xl:w-[25px] 3xl:h-[25px] text-white/80 group-hover:text-white transition-colors pointer-events-none" strokeWidth={2.5} />
                </div>
              )}
              {canScrollNext && isHovered && imageHeight > 0 && (
                <div 
                  className="group absolute right-0 w-20 flex items-center justify-end pr-2 cursor-pointer z-10 transition-all duration-300"
                  style={{ 
                    top: '0px',
                    height: `${imageHeight + 8}px`,
                    background: 'linear-gradient(to left, rgba(10, 10, 10, 0.5) 0%, rgba(10, 10, 10, 0.35) 40%, transparent 100%)' 
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to left, rgba(10, 10, 10, 0.9) 0%, rgba(10, 10, 10, 0.7) 40%, transparent 100%)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to left, rgba(10, 10, 10, 0.5) 0%, rgba(10, 10, 10, 0.35) 40%, transparent 100%)';
                  }}
                  onClick={() => api?.scrollNext()}
                >
                  <ChevronRight className="w-5 h-5 3xl:w-[25px] 3xl:h-[25px] text-white/80 group-hover:text-white transition-colors pointer-events-none" strokeWidth={2.5} />
                </div>
              )}
            </div>
          </Carousel>
        </div>
      </div>
    </section>
  );
};

export default CollectionSection;
