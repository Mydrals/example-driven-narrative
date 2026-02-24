import { ChevronRight, ChevronLeft } from "lucide-react";
import { ReactNode, useRef, useEffect } from "react";
import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";

interface MangaCarouselProps {
  children: ReactNode;
}

const MangaCarousel = ({ children }: MangaCarouselProps) => {
  const childrenArray = Array.isArray(children) ? children : [children];
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
  }, [children]);

  return (
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
            {childrenArray.map((child, index) => (
              <CarouselItem 
                key={index} 
                className="basis-auto pl-1.5 md:pl-3 3xl:pl-4"
              >
                <div className="p-1">
                  {child}
                </div>
              </CarouselItem>
            ))}
            {/* Spacer element to maintain right margin */}
            <div className="min-w-[18.5px] xs:min-w-[28.5px] lg:min-w-[clamp(28.5px,4.8vw,76.5px)] shrink-0" aria-hidden="true" />
          </CarouselContent>
          {canScrollPrev && isHovered && imageHeight > 0 && (
            <div 
              className="group absolute left-0 w-20 hidden break-800:flex items-center justify-start pl-2 cursor-pointer z-10 transition-all duration-300"
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
              className="group absolute right-0 w-20 hidden break-800:flex items-center justify-end pr-2 cursor-pointer z-10 transition-all duration-300"
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
  );
};

export default MangaCarousel;
