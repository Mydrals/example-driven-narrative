import { useEffect, useState } from "react";
import { getProxiedImageUrl } from "@/lib/imageProxy";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Card } from "@/components/ui/card";

interface Manga {
  id: string;
  slug: string;
  title: string;
  poster_url: string;
  description: string;
}

const Mangas = () => {
  const navigate = useNavigate();
  const [mangas, setMangas] = useState<Manga[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMangas = async () => {
      setLoading(true);
      
      const { data } = await supabase
        .from("mangas")
        .select("*")
        .order("created_at", { ascending: false });

      if (data) {
        setMangas(data);
      }
      
      setLoading(false);
    };

    fetchMangas();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container mx-auto px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)] pt-20 pb-8">
        <h1 className="text-4xl font-bold text-foreground mb-8">Mangas</h1>
        
        {loading ? (
          <p className="text-muted-foreground">Cargando...</p>
        ) : mangas.length === 0 ? (
          <p className="text-muted-foreground">No hay mangas disponibles</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {mangas.map((manga) => (
              <Card
                key={manga.id}
                className="overflow-hidden cursor-pointer hover:scale-105 transition-transform"
                onClick={() => navigate(`/mangas/${manga.slug}`)}
              >
                {manga.poster_url && (
                  <img
                    src={getProxiedImageUrl(manga.poster_url)}
                    alt={manga.title}
                    className="w-full aspect-[2/3] object-cover"
                  />
                )}
                <div className="p-3">
                  <h3 className="font-semibold text-foreground line-clamp-2">
                    {manga.title}
                  </h3>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Mangas;
