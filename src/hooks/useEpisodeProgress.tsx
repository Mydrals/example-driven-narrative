import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

export const useEpisodeProgress = (episodeId: string) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [progress, setProgress] = useState<{ progress_time: number; duration: number } | null>(null);
  const [loading, setLoading] = useState(false);

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
    if (!user || !episodeId) return;

    console.log('Cargando progreso para usuario:', user.id, 'episodio:', episodeId);

    try {
      const { data, error } = await supabase
        .from("episode_progress")
        .select("progress_time, duration")
        .eq("user_id", user.id)
        .eq("episode_id", episodeId)
        .maybeSingle();

      if (error) {
        console.error('Error al cargar progreso:', error);
        throw error;
      }

      console.log('Progreso cargado:', data);
      setProgress(data);
    } catch (error) {
      console.error("Error loading progress:", error);
    }
  };

  const saveProgress = useCallback(async (progressTime: number, duration: number) => {
    if (!user || !episodeId) {
      console.log('No se puede guardar progreso - usuario o episodio faltante');
      return;
    }

    console.log('Intentando guardar progreso:', { 
      user_id: user.id, 
      episode_id: episodeId, 
      progress_time: Math.floor(progressTime),
      duration: Math.floor(duration)
    });

    setLoading(true);

    try {
      const { error } = await supabase
        .from("episode_progress")
        .upsert({
          user_id: user.id,
          episode_id: episodeId,
          progress_time: Math.floor(progressTime),
          duration: Math.floor(duration),
        }, {
          onConflict: "user_id,episode_id"
        });

      if (error) {
        console.error('Error al guardar progreso:', error);
        throw error;
      }

      console.log('Progreso guardado exitosamente');
      setProgress({ progress_time: Math.floor(progressTime), duration: Math.floor(duration) });
      
      // Invalidate continue-watching query to update the home page
      queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
    } catch (error) {
      console.error("Error saving progress:", error);
    } finally {
      setLoading(false);
    }
  }, [user, episodeId]);

  return {
    user,
    progress,
    loading,
    saveProgress,
    loadProgress,
  };
};
