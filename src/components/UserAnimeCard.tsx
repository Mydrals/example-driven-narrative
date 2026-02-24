import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

interface UserAnimeCardProps {
  animeId: string;
  slug: string;
  title: string;
  image: string;
  progress: number;
  totalEpisodes: number;
}

const UserAnimeCard = ({ slug, title, image, progress, totalEpisodes }: UserAnimeCardProps) => {
  const navigate = useNavigate();
  const progressPercentage = totalEpisodes > 0 ? (progress / totalEpisodes) * 100 : 0;

  return (
    <div 
      className="group cursor-pointer flex-shrink-0 p-1"
      onClick={() => navigate(`/series/${slug}`)}
    >
      <div className="relative aspect-[2/3] bg-card [@media(hover:hover)]:group-hover:outline [@media(hover:hover)]:group-hover:outline-[2px] [@media(hover:hover)]:group-hover:outline-white [@media(hover:hover)]:group-hover:outline-offset-2 overflow-hidden">
        <img 
          src={image} 
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />

        {/* Progress Badge */}
        {totalEpisodes > 0 && (
          <div className="absolute bottom-2 left-2 right-2">
            <Progress value={progressPercentage} className="h-1" />
            <div className="mt-1 text-xs text-foreground bg-cr-black/90 px-2 py-0.5 rounded inline-block">
              {progress}/{totalEpisodes} episodios
            </div>
          </div>
        )}
      </div>
      
      <div className="mt-2 space-y-1">
        <h3 className="font-bold text-foreground [@media(hover:hover)]:text-muted-foreground text-sm line-clamp-2 [@media(hover:hover)]:group-hover:text-primary transition-colors">
          {title}
        </h3>
      </div>
    </div>
  );
};

export default UserAnimeCard;
