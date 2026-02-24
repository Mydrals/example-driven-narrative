import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { User } from "@supabase/supabase-js";

/**
 * Auto-tracks episode viewing after 10 seconds on the page.
 * - Marks the previous "continue watching" episode for this anime as watched
 * - Sets the current episode as "continue watching"
 */
export const useAutoTrackEpisode = (
  user: User | null,
  episodeId: string,
  animeId: string | undefined,
  episodeDuration: string | undefined
) => {
  const queryClient = useQueryClient();
  const trackedRef = useRef(false);

  useEffect(() => {
    trackedRef.current = false;
  }, [episodeId]);

  useEffect(() => {
    if (!user || !episodeId || !animeId) return;

    const timer = setTimeout(async () => {
      if (trackedRef.current) return;
      trackedRef.current = true;

      try {
        // Find the user's most recent progress for this anime (any episode)
        const { data: existingProgress, error: fetchError } = await supabase
          .from("episode_progress")
          .select(`
            episode_id,
            progress_time,
            duration,
            episodes!inner (
              anime_id,
              duration
            )
          `)
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (fetchError) {
          console.error("Error fetching existing progress:", fetchError);
          return;
        }

        // Find the most recent in-progress episode for THIS anime (not 100% watched)
        const previousEntry = existingProgress?.find((p: any) => {
          if (p.episode_id === episodeId) return false;
          if (p.episodes?.anime_id !== animeId) return false;
          const pct = p.duration > 0 ? (p.progress_time / p.duration) * 100 : 0;
          return pct < 95;
        });

        // Mark that previous episode as watched
        if (previousEntry) {
          const prevDuration = previousEntry.duration || 1440;
          await supabase
            .from("episode_progress")
            .upsert({
              user_id: user.id,
              episode_id: previousEntry.episode_id,
              progress_time: prevDuration,
              duration: prevDuration,
            }, { onConflict: "user_id,episode_id" });
        }

        // Check if current episode already has progress
        const currentEntry = existingProgress?.find((p: any) => p.episode_id === episodeId);
        
        // Only create a "continue watching" entry if there isn't one already, 
        // or if the existing one is already marked as watched (>=95%)
        const currentPct = currentEntry && currentEntry.duration > 0 
          ? (currentEntry.progress_time / currentEntry.duration) * 100 
          : 0;

        if (!currentEntry || currentPct >= 95) {
          const durationSeconds = (parseInt(episodeDuration || "24") || 24) * 60;
          await supabase
            .from("episode_progress")
            .upsert({
              user_id: user.id,
              episode_id: episodeId,
              progress_time: 1, // minimal progress to show in "continue watching"
              duration: durationSeconds,
            }, { onConflict: "user_id,episode_id" });
        } else {
          // Just touch updated_at so it appears as most recent
          await supabase
            .from("episode_progress")
            .update({ updated_at: new Date().toISOString() })
            .eq("user_id", user.id)
            .eq("episode_id", episodeId);
        }

        queryClient.invalidateQueries({ queryKey: ['continue-watching'] });
      } catch (error) {
        console.error("Error auto-tracking episode:", error);
      }
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, [user, episodeId, animeId, episodeDuration, queryClient]);
};
