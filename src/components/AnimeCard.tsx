import { Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { Badge } from "@/components/ui/badge";

interface AnimeCardProps {
  id: string;
  slug: string;
  title: string;
  image: string;
  language: string;
  episode?: string;
  time?: string;
  isManga?: boolean;
  hideInfo?: boolean;
  showMangaBadge?: boolean;
}

const AnimeCard = ({ id, slug, title, image, language, episode, time, isManga = false, hideInfo = false, showMangaBadge = false }: AnimeCardProps) => {
  const navigate = useNavigate();

  return (
    <div 
      className="group cursor-pointer flex-shrink-0 p-1"
      onClick={() => navigate(isManga ? `/mangas/${slug}` : `/series/${slug}`)}
    >
      <div className="relative aspect-[2/3] bg-card [@media(hover:hover)]:group-hover:outline [@media(hover:hover)]:group-hover:outline-[2px] [@media(hover:hover)]:group-hover:outline-white [@media(hover:hover)]:group-hover:outline-offset-2 overflow-hidden">
        <img 
          src={getProxiedImageUrl(image)} 
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />

        {/* Manga Badge */}
        {showMangaBadge && isManga && (
          <div className="absolute top-0 left-0 bg-white text-black font-bold shadow-[0_0_12px_rgba(0,0,0,0.25)] w-[55px] h-[27px] flex items-center justify-center text-[13px] leading-none">
            Manga
          </div>
        )}

        {/* Episode Badge */}
        {episode && time && (
          <div className="absolute bottom-2 right-2 bg-cr-black/90 px-2 py-1 rounded text-xs text-foreground">
            {time}
          </div>
        )}
      </div>
      
      {!hideInfo && (
        <div className="mt-2 space-y-1">
          <h3 className="font-bold text-foreground [@media(hover:hover)]:text-muted-foreground text-sm line-clamp-2 [@media(hover:hover)]:group-hover:text-primary transition-colors">
            {title}
          </h3>
          <p className="text-xs text-muted-foreground">{language}</p>
          {episode && (
            <p className="text-xs text-muted-foreground">{episode}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default AnimeCard;
