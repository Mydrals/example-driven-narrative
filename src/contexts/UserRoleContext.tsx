import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

export type AppRole = "admin" | "user";

interface UserRoleContextType {
  role: AppRole | null;
  loading: boolean;
  isAdmin: boolean;
}

const UserRoleContext = createContext<UserRoleContextType>({
  role: null,
  loading: true,
  isAdmin: false,
});

export const useUserRole = () => useContext(UserRoleContext);

export const UserRoleProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) {
        setRole(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error fetching role:", error);
          setRole("user");
        } else if (data?.role) {
          setRole(data.role as AppRole);
        } else {
          setRole("user");
        }
      } catch (err) {
        console.error("Error in UserRoleProvider:", err);
        setRole("user");
      } finally {
        setLoading(false);
      }
    };

    fetchRole();
  }, [user?.id]);

  const isAdmin = role === "admin";

  return (
    <UserRoleContext.Provider value={{ role, loading, isAdmin }}>
      {children}
    </UserRoleContext.Provider>
  );
};
