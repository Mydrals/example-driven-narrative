import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface GenreAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const GenreAutocomplete = ({ value, onChange, placeholder }: GenreAutocompleteProps) => {
  const [allGenres, setAllGenres] = useState<string[]>([]);
  const [filteredGenres, setFilteredGenres] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchGenres();
  }, []);

  useEffect(() => {
    // Parse the comma-separated value into array
    const genres = value
      .split(",")
      .map((g) => g.trim())
      .filter((g) => g);
    setSelectedGenres(genres);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const fetchGenres = async () => {
    try {
      const { data: animes, error } = await supabase
        .from("animes")
        .select("genres");

      if (error) throw error;

      const genresSet = new Set<string>();
      animes?.forEach((anime) => {
        if (anime.genres && Array.isArray(anime.genres)) {
          anime.genres.forEach((genre: string) => {
            if (genre.trim()) {
              genresSet.add(genre.trim());
            }
          });
        }
      });

      setAllGenres(Array.from(genresSet).sort());
    } catch (error) {
      console.error("Error fetching genres:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    if (val.trim()) {
      const filtered = allGenres.filter(
        (genre) =>
          genre.toLowerCase().includes(val.toLowerCase()) &&
          !selectedGenres.includes(genre)
      );
      setFilteredGenres(filtered);
      setShowSuggestions(true);
    } else {
      setFilteredGenres([]);
      setShowSuggestions(false);
    }
  };

  const addGenre = (genre: string) => {
    if (!selectedGenres.includes(genre)) {
      const newGenres = [...selectedGenres, genre];
      setSelectedGenres(newGenres);
      onChange(newGenres.join(", "));
      setInputValue("");
      setShowSuggestions(false);
    }
  };

  const removeGenre = (genre: string) => {
    const newGenres = selectedGenres.filter((g) => g !== genre);
    setSelectedGenres(newGenres);
    onChange(newGenres.join(", "));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (filteredGenres.length > 0) {
        addGenre(filteredGenres[0]);
      } else {
        addGenre(inputValue.trim());
      }
    } else if (e.key === "Backspace" && !inputValue && selectedGenres.length > 0) {
      removeGenre(selectedGenres[selectedGenres.length - 1]);
    }
  };

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedGenres.map((genre) => (
          <Badge
            key={genre}
            variant="secondary"
            className="gap-1 pr-1"
          >
            {genre}
            <button
              type="button"
              onClick={() => removeGenre(genre)}
              className="ml-1 hover:bg-background/20 rounded-full p-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
      </div>
      
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (inputValue.trim() && filteredGenres.length > 0) {
            setShowSuggestions(true);
          }
        }}
        placeholder={placeholder || "Escribe para buscar géneros..."}
      />

      {showSuggestions && filteredGenres.length > 0 && (
        <div
          ref={suggestionsRef}
          className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredGenres.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => addGenre(genre)}
              className="w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground cursor-pointer transition-colors"
            >
              {genre}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
