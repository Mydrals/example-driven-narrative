import { ReactNode, useEffect, useState } from "react";
import { Carousel, CarouselContent, CarouselItem } from "@/components/ui/carousel";
import type { CarouselApi } from "@/components/ui/carousel";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface WeeklyCarouselProps {
  title: string;
  children: ReactNode;
}

const DAYS_OF_WEEK = ["LUNE", "MAR", "MIER", "JUE", "VIER", "SÁB", "DOM"];

const WeeklyCarousel = ({ title, children }: WeeklyCarouselProps) => {
  const [api, setApi] = useState<CarouselApi>();
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [imageHeight, setImageHeight] = useState(0);

  useEffect(() => {
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
    };
  }, [api]);

  useEffect(() => {
    const updateImageHeight = () => {
      const firstImage = document.querySelector('.weekly-carousel-item img');
      if (firstImage) {
        setImageHeight(firstImage.clientHeight);
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
    <section 
      className="relative pb-6 max-[500px]:pb-1"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Title */}
      <div className="px-[20px] xs:px-[30px] lg:px-[clamp(30px,4.95vw,78px)] mb-1.5">
        <h2 className="text-xl md:text-2xl font-bold text-foreground">
          {title}
        </h2>
      </div>

      {/* Carousel Container */}
      <div className="relative">
        <Carousel
          opts={{
            align: "start",
            loop: false,
            slidesToScroll: "auto",
          }}
          setApi={setApi}
          className="w-full"
        >
          <CarouselContent className="-ml-[100px] sm:-ml-[100px] md:-ml-[100px] lg:-ml-[100px] pl-[54px] sm:pl-[54px] md:pl-[90px]">
            {Array.isArray(children) ? 
              children.map((child, index) => (
                <CarouselItem
                  key={index}
                  className="weekly-carousel-item pl-[100px] sm:pl-[100px] md:pl-[100px] lg:pl-[100px] relative group"
                  style={{ flex: '0 0 auto' }}
                >
                  {/* Day of week text - at the bottom of the card */}
                  <div 
                    className="absolute left-0 bottom-8 pointer-events-none select-none z-0"
                    style={{ 
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'left bottom',
                      left: '110px'
                    }}
                  >
                    <span 
                      className="text-[48px] sm:text-[56px] md:text-[64px] font-black whitespace-nowrap transition-all duration-300 text-foreground/5 group-hover:text-foreground/80"
                      style={{ 
                        lineHeight: '1',
                        fontFamily: 'system-ui, -apple-system, sans-serif',
                        fontWeight: '900'
                      }}
                    >
                      {DAYS_OF_WEEK[index % DAYS_OF_WEEK.length]}
                    </span>
                  </div>
                  
                  {/* Card content - above the text */}
                  <div className="relative z-10 w-[calc((100vw-54px)/2.25)] xs:w-[calc((100vw-60px)/3.25)] md:w-[calc((100vw-80px)/4.25)] lg:w-[calc((100vw-100px)/5.5)] xl:w-[calc((100vw-120px)/5.25)] 2xl:w-[calc((100vw-130px)/5.25)] 3xl:w-[calc((100vw-156px)/6.25)]">
                    {child}
                  </div>
                </CarouselItem>
              ))
            : children}
          </CarouselContent>

          {/* Navigation Arrows */}
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
        </Carousel>
      </div>
    </section>
  );
};

export default WeeklyCarousel;
