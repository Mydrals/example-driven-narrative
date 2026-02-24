import Header from "@/components/Header";
import AnimeCard from "@/components/AnimeCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Search as SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

const Search = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const { data: animes } = useQuery({
    queryKey: ["animes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("animes")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    retry: 2,
    staleTime: 30000,
  });

  const { data: mangas } = useQuery({
    queryKey: ["mangas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mangas")
        .select("*")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    retry: 2,
    staleTime: 30000,
  });

  // Combine animes and mangas
  const allContent = [
    ...(animes || []).map(item => ({ ...item, isManga: false })),
    ...(mangas || []).map(item => ({ ...item, isManga: true }))
  ];

  const filteredContent = allContent.filter(item => {
    const q = searchQuery.toLowerCase();
    if (item.title.toLowerCase().includes(q)) return true;
    const altTitles = (item as any).alternative_titles as string[] | undefined;
    if (altTitles?.some((t: string) => t.toLowerCase().includes(q))) return true;
    return false;
  });

  const displayContent = searchQuery ? filteredContent : allContent;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main 
        className="pt-[calc(56px+env(safe-area-inset-top))] px-[20px] xs:px-[30px] lg:px-[clamp(30px,5vw,78px)]"
        style={{ paddingBottom: 'calc(80px + env(safe-area-inset-bottom))' }}
      >
        {/* Search Bar */}
        <div className="pt-8 pb-12 mx-[2px]">
          <div className="relative max-w-full">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Encuentra películas, series y más"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-14 pl-12 pr-4 bg-muted/50 border-border text-foreground placeholder:text-muted-foreground text-base rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-border"
            />
          </div>
        </div>

        {/* Popular Titles Section */}
        <div className="pb-16">
          <h2 className="text-xl font-bold text-foreground mb-[7px] ml-[2px]">
            {searchQuery ? "Resultados" : "Títulos populares"}
          </h2>
          
          {displayContent.length > 0 ? (
            <div className="-mx-[2px]">
              <div className="grid grid-cols-2 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3">
                {displayContent.map((item: any) => (
                  <AnimeCard 
                    key={item.id}
                    id={item.id}
                    slug={item.slug}
                    title={item.title}
                    image={item.poster_url}
                    language={item.language || ""}
                    isManga={item.isManga}
                    showMangaBadge={true}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No se encontraron resultados</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Search;
