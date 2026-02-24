import { Play, MoreVertical } from "lucide-react";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

interface EpisodeCardProps {
  animeSlug: string;
  episodeId: string;
  title: string;
  episodeNumber: number;
  seasonNumber: number;
  thumbnail: string;
  duration: string;
  animeTitle: string;
}

const EpisodeCard = ({ 
  animeSlug,
  episodeId,
  title, 
  episodeNumber, 
  seasonNumber, 
  thumbnail, 
  duration,
  animeTitle 
}: EpisodeCardProps) => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<{ progress_time: number; duration: number } | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && episodeId) {
      loadProgress();
    }
  }, [user, episodeId]);

  const loadProgress = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("episode_progress")
        .select("progress_time, duration")
        .eq("user_id", user.id)
        .eq("episode_id", episodeId)
        .maybeSingle();

      if (error) throw error;
      setProgress(data);
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const progressPercentage = progress && progress.duration > 0 
    ? (progress.progress_time / progress.duration) * 100 
    : 0;

  const formatTimeRemaining = (progressTime: number, totalDuration: number) => {
    const remaining = Math.max(0, totalDuration - progressTime);
    const minutes = Math.floor(remaining / 60);
    const seconds = Math.floor(remaining % 60);
    return `${minutes}m restantes`;
  };

  const handleMarkAsWatched = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast.error("Debes iniciar sesión para marcar episodios como vistos");
      return;
    }

    try {
      const minutes = parseInt(duration) || 0;
      const durationInSeconds = minutes * 60;

      const { error } = await supabase
        .from("episode_progress")
        .upsert({
          user_id: user.id,
          episode_id: episodeId,
          progress_time: durationInSeconds,
          duration: durationInSeconds,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      toast.success("Episodio marcado como visto");
      loadProgress();
    } catch (error) {
      console.error("Error marking as watched:", error);
      toast.error("Error al marcar como visto");
    }
  };

  return (
    <div 
      className="group cursor-pointer flex-shrink-0 p-1"
      onClick={() => navigate(`/series/${animeSlug}/episode/${episodeId}`)}
    >
      <div className="relative aspect-video w-full bg-card [@media(hover:hover)]:group-hover:outline [@media(hover:hover)]:group-hover:outline-[2px] [@media(hover:hover)]:group-hover:outline-white [@media(hover:hover)]:group-hover:outline-offset-2 [@media(hover:hover)]:group-has-[.group\/menu:hover]:outline-0 overflow-hidden">
        <img 
          src={getProxiedImageUrl(thumbnail)} 
          alt={title}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
        />

        {/* Progress Bar */}
        {progress && progressPercentage > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-2.5 bg-gradient-to-t from-black/60 to-transparent">
            <div className="absolute bottom-0 left-0 right-0 h-1">
              <div 
                className="h-full bg-white transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        )}

        {/* Duration or Time Remaining Badge */}
        <div className="absolute bottom-2 right-2 bg-cr-black/90 px-2 py-1 rounded text-xs text-foreground font-semibold">
          {progress && progressPercentage >= 95
            ? "Visto"
            : progress && progressPercentage > 0
            ? formatTimeRemaining(progress.progress_time, progress.duration)
            : duration
          }
        </div>
      </div>
      
      <div className="mt-2 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-bold text-foreground [@media(hover:hover)]:text-muted-foreground text-sm line-clamp-2 [@media(hover:hover)]:group-hover:text-primary [@media(hover:hover)]:peer-hover:text-primary transition-colors flex-1">
            T{seasonNumber} E{episodeNumber} - {title}
          </h3>
          {/* Three dots menu - now next to title on all screens */}
          <div className="flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button
                  aria-label="Abrir menú de episodio"
                  className="peer p-0 [-webkit-tap-highlight-color:transparent] touch-manipulation group/menu outline-none focus:outline-none focus-visible:outline-none focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 ring-offset-0"
                >
                  <MoreVertical className="w-4 h-4 text-muted-foreground [@media(hover:hover)]:group-hover/menu:text-primary transition-colors" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 z-50 bg-popover">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/series/${animeSlug}`);
                }}>
                  Información del anime
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleMarkAsWatched}>
                  Marcar como visto
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          {animeTitle}
        </p>
      </div>
    </div>
  );
};

export default EpisodeCard;
