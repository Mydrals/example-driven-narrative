import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

interface LikeDislikeButtonProps {
  episodeId: string;
  size?: 'default' | 'small';
}

const LikeDislikeButton = ({ episodeId, size = 'default' }: LikeDislikeButtonProps) => {
  const [likes, setLikes] = useState(0);
  const [dislikes, setDislikes] = useState(0);
  const [userVote, setUserVote] = useState<'like' | 'dislike' | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!episodeId) return;

    // Fetch likes/dislikes counts
    const fetchVotes = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('episode_likes')
        .select('vote_type')
        .eq('episode_id', episodeId);

      if (error) {
        console.error('Error fetching votes:', error);
        setLoading(false);
        return;
      }

      const likesCount = data.filter((vote) => vote.vote_type === 'like').length;
      const dislikesCount = data.filter((vote) => vote.vote_type === 'dislike').length;

      setLikes(likesCount);
      setDislikes(dislikesCount);
      setLoading(false);
    };

    // Fetch user's vote if logged in
    const fetchUserVote = async () => {
      if (!user) return;

      const { data, error } = await supabase
        .from('episode_likes')
        .select('vote_type')
        .eq('episode_id', episodeId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user vote:', error);
        return;
      }

      const voteType = data?.vote_type;
      if (voteType === 'like' || voteType === 'dislike') {
        setUserVote(voteType);
      } else {
        setUserVote(null);
      }
    };

    fetchVotes();
    fetchUserVote();
  }, [episodeId, user]);

  const handleVote = async (voteType: 'like' | 'dislike') => {
    if (!user) {
      toast({
        title: 'Inicia sesión',
        description: 'Debes iniciar sesión para dar like o dislike',
        variant: 'destructive',
      });
      return;
    }

    try {
      // If user already voted the same way, remove the vote
      if (userVote === voteType) {
        const { error } = await supabase
          .from('episode_likes')
          .delete()
          .eq('episode_id', episodeId)
          .eq('user_id', user.id);

        if (error) throw error;

        setUserVote(null);
        if (voteType === 'like') {
          setLikes((prev) => prev - 1);
        } else {
          setDislikes((prev) => prev - 1);
        }
      } else {
        // Upsert the vote (insert or update)
        const { error } = await supabase
          .from('episode_likes')
          .upsert(
            {
              episode_id: episodeId,
              user_id: user.id,
              vote_type: voteType,
            },
            {
              onConflict: 'user_id,episode_id',
            }
          );

        if (error) throw error;

        // Update counts
        if (userVote === 'like' && voteType === 'dislike') {
          setLikes((prev) => prev - 1);
          setDislikes((prev) => prev + 1);
        } else if (userVote === 'dislike' && voteType === 'like') {
          setDislikes((prev) => prev - 1);
          setLikes((prev) => prev + 1);
        } else if (voteType === 'like') {
          setLikes((prev) => prev + 1);
        } else {
          setDislikes((prev) => prev + 1);
        }

        setUserVote(voteType);
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Error',
        description: 'No se pudo registrar tu voto',
        variant: 'destructive',
      });
    }
  };
  const iconSize = size === 'small' ? 'w-4 h-4' : 'w-5 h-5';
  const textSize = size === 'small' ? 'text-xs' : 'text-sm';
  const padding = size === 'small' ? 'px-3 py-1.5' : 'px-4 py-2';

  if (loading) {
    return <Skeleton className="h-9 w-24 rounded-full" />;
  }

  return (
    <div className="flex items-center bg-card rounded-full overflow-hidden select-none">
      {/* Like Button - Left Half */}
      <button 
        onClick={() => handleVote('like')}
        className={`flex items-center gap-2 ${padding} transition-all duration-200 hover:bg-foreground/10 dark:hover:bg-foreground/20 active:scale-95 ${
          userVote === 'like' 
            ? 'text-primary bg-primary/10 font-bold animate-in zoom-in-95 duration-200' 
            : 'text-foreground'
        }`}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`${iconSize} transition-transform duration-200 ${userVote === 'like' ? 'scale-110' : ''}`}
          viewBox="0 0 52 52"
          fill="currentColor"
        >
          <path d="M4.4,34.2l20.5-20.7c0.6-0.6,1.6-0.6,2.2,0l20.5,20.7c0.6,0.6,0.6,1.6,0,2.2l-2.2,2.2 c-0.6,0.6-1.6,0.6-2.2,0L27.1,22.2c-0.6-0.6-1.6-0.6-2.2,0L8.8,38.5c-0.6,0.6-1.6,0.6-2.2,0l-2.2-2.2C3.9,35.7,3.9,34.8,4.4,34.2z"></path>
        </svg>
        <span className={`${textSize} transition-all duration-200 ${userVote === 'like' ? 'font-bold scale-110' : 'font-medium'}`}>{likes}</span>
      </button>

      {/* Separator */}
      <div className="w-px h-5 bg-border"></div>

      {/* Dislike Button - Right Half */}
      <button 
        onClick={() => handleVote('dislike')}
        className={`flex items-center gap-2 ${padding} transition-all duration-200 hover:bg-foreground/10 dark:hover:bg-foreground/20 active:scale-95 ${
          userVote === 'dislike' 
            ? 'text-destructive bg-destructive/10 font-bold animate-in zoom-in-95 duration-200' 
            : 'text-foreground'
        }`}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`${iconSize} transition-transform duration-200 ${userVote === 'dislike' ? 'scale-110' : ''}`}
          viewBox="0 0 52 52"
          fill="currentColor"
        >
          <path d="M47.6,17.8L27.1,38.5c-0.6,0.6-1.6,0.6-2.2,0L4.4,17.8c-0.6-0.6-0.6-1.6,0-2.2l2.2-2.2 c0.6-0.6,1.6-0.6,2.2,0l16.1,16.3c0.6,0.6,1.6,0.6,2.2,0l16.1-16.2c0.6-0.6,1.6-0.6,2.2,0l2.2,2.2C48.1,16.3,48.1,17.2,47.6,17.8z"></path>
        </svg>
        <span className={`${textSize} transition-all duration-200 ${userVote === 'dislike' ? 'font-bold scale-110' : 'font-medium'}`}>{dislikes}</span>
      </button>
    </div>
  );
};

export default LikeDislikeButton;
