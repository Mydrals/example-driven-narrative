import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

export type ListStatus = "mi-lista" | "seguir-viendo" | "por-ver" | "completado";

export const useAnimeList = (animeId: string) => {
  const [user, setUser] = useState<User | null>(null);
  const [isInList, setIsInList] = useState(false);
  const [listStatus, setListStatus] = useState<ListStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Check current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && animeId) {
      checkIfInList();
    }
  }, [user, animeId]);

  const checkIfInList = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from("user_anime_lists")
        .select("status")
        .eq("user_id", user.id)
        .eq("anime_id", animeId)
        .maybeSingle();

      if (error) throw error;

      setIsInList(!!data);
      setListStatus(data?.status as ListStatus || null);
    } catch (error) {
      console.error("Error checking anime list:", error);
    }
  };

  const toggleList = async () => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para agregar animes a tu lista",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (isInList) {
        // Remove from list
        const { error } = await supabase
          .from("user_anime_lists")
          .delete()
          .eq("user_id", user.id)
          .eq("anime_id", animeId);

        if (error) throw error;

        setIsInList(false);
        setListStatus(null);
        toast({
          title: "Eliminado de tu lista",
          description: "El anime ha sido eliminado de tu lista",
        });
      } else {
        // Add to list
        const { error } = await supabase
          .from("user_anime_lists")
          .insert({
            user_id: user.id,
            anime_id: animeId,
            status: "mi-lista",
            progress: 0,
            total_episodes: 0,
          });

        if (error) throw error;

        setIsInList(true);
        setListStatus("mi-lista");
        toast({
          title: "Agregado a tu lista",
          description: "El anime ha sido agregado a tu lista",
        });
      }
    } catch (error) {
      console.error("Error toggling anime list:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar tu lista",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (newStatus: ListStatus) => {
    if (!user) {
      toast({
        title: "Inicia sesión",
        description: "Debes iniciar sesión para agregar animes a tu lista",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      if (listStatus === newStatus) {
        // Remove status (deselect)
        if (isInList) {
          const { error } = await supabase
            .from("user_anime_lists")
            .update({ status: "mi-lista" })
            .eq("user_id", user.id)
            .eq("anime_id", animeId);
          if (error) throw error;
          setListStatus("mi-lista");
        }
      } else if (isInList) {
        // Update existing
        const { error } = await supabase
          .from("user_anime_lists")
          .update({ status: newStatus })
          .eq("user_id", user.id)
          .eq("anime_id", animeId);
        if (error) throw error;
        setListStatus(newStatus);
      } else {
        // Insert new
        const { error } = await supabase
          .from("user_anime_lists")
          .insert({
            user_id: user.id,
            anime_id: animeId,
            status: newStatus,
            progress: 0,
            total_episodes: 0,
          });
        if (error) throw error;
        setIsInList(true);
        setListStatus(newStatus);
      }
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "No se pudo actualizar el estado",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    isInList,
    listStatus,
    loading,
    toggleList,
    updateStatus,
  };
};
