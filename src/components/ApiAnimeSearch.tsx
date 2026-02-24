import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Loader2, Download, X, ChevronDown, ChevronUp } from "lucide-react";
import { searchAnime, type AnimeSearchResult, type AnimeSourceFilter } from "@/lib/animeApis";
import { normalizeGenres } from "@/lib/genreNormalizer";
import { getTMDBLogo } from "@/lib/tmdbApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApiAnimeSearchProps {
  onApplyField: (field: string, value: string) => void;
  onApplyMultiple: (fields: Record<string, string>) => void;
  currentTitle?: string;
}

const ApiAnimeSearch = ({ onApplyField, onApplyMultiple, currentTitle }: ApiAnimeSearchProps) => {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<AnimeSourceFilter>("all");
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<AnimeSearchResult | null>(null);
  const [expanded, setExpanded] = useState(true);
  

  // Auto-fill query with current anime title
  useEffect(() => {
    if (currentTitle && !query) {
      setQuery(currentTitle);
    }
  }, [currentTitle]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSelected(null);
    try {
      const data = await searchAnime(query.trim(), source);
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, [query, source]);

  const handleSelect = (result: AnimeSearchResult) => {
    setSelected(result);
    setResults([]);
  };

  const applyAll = async () => {
    if (!selected) return;
    // Merge genres + demographics, then normalize to our allowed list
    const allRawGenres = [...(selected.genres || []), ...(selected.demographics || [])];
    const normalizedGenres = normalizeGenres(allRawGenres);

    const fields: Record<string, string> = {};
    if (selected.description) fields.description = selected.description;
    if (selected.year) fields.year = selected.year.toString();
    if (selected.posterUrl) fields.poster_url = selected.posterUrl;
    if (selected.bannerUrl) fields.hero_banner_url = selected.bannerUrl;
    if (normalizedGenres.length > 0) fields.genres = normalizedGenres.join(", ");

    // Collect alternative titles
    const altTitles = getAlternativeTitles();
    if (altTitles.length > 0) fields.alternative_titles = altTitles.join('|||');

    // Try to get logo from TMDB
    if (selected.source === "tmdb") {
      const tmdbType = (selected as any)._tmdbType || "tv";
      const logo = await getTMDBLogo(selected.sourceId, tmdbType);
      if (logo) fields.logo_url = logo;
    }

    onApplyMultiple(fields);
  };

  const getAlternativeTitles = () => {
    if (!selected) return [];
    const titles: string[] = [];
    if (selected.title) titles.push(selected.title);
    if (selected.titleEnglish && !titles.includes(selected.titleEnglish)) titles.push(selected.titleEnglish);
    if (selected.titleJapanese && !titles.includes(selected.titleJapanese)) titles.push(selected.titleJapanese);
    return titles;
  };

  const getGenres = () => {
    const allRaw = [...(selected?.genres || []), ...(selected?.demographics || [])];
    return normalizeGenres(allRaw);
  };

  const getSourceLabel = (src: string) => {
    switch (src) {
      case "jikan": return "Jikan (MAL)";
      case "anilist": return "AniList";
      case "tmdb": return "TMDB";
      case "kitsu": return "Kitsu";
      default: return src;
    }
  };

  return (
    <Card className="p-4 bg-muted/30 border-border/50 mb-6">
      <div className="flex items-center justify-between mb-3">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-sm font-semibold text-foreground"
        >
          <Search className="h-4 w-4 text-primary" />
          Buscar en APIs externas
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {selected && (
          <Badge variant="outline" className="text-xs gap-1">
            {getSourceLabel(selected.source)} #{selected.sourceId}
            <button type="button" onClick={() => setSelected(null)}><X className="h-3 w-3" /></button>
          </Badge>
        )}
      </div>

      {expanded && (
        <div className="space-y-3">
          {/* Search bar */}
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Nombre del anime..."
              className="flex-1"
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
            />
            <Select value={source} onValueChange={(v) => setSource(v as any)}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="jikan">Jikan (MAL)</SelectItem>
                <SelectItem value="anilist">AniList</SelectItem>
                <SelectItem value="tmdb">TMDB</SelectItem>
                <SelectItem value="kitsu">Kitsu</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" onClick={handleSearch} disabled={searching} size="icon" variant="outline">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {/* Results list */}
          {results.length > 0 && (
            <div className="max-h-64 overflow-y-auto space-y-1 rounded-md border border-border bg-background p-1">
              {results.map((r, i) => (
                <button
                  key={`${r.source}-${r.sourceId}-${i}`}
                  type="button"
                  onClick={() => handleSelect(r)}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors text-left"
                >
                  {r.posterUrl && (
                    <img src={r.posterUrl} alt="" className="w-10 h-14 object-cover rounded flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.year || "?"} · {r.episodes || "?"} eps
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                    {getSourceLabel(r.source)}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Selected anime details */}
          {selected && (
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">{selected.title}</p>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="default" onClick={applyAll} className="gap-1 text-xs">
                    <Download className="h-3 w-3" />
                    Aplicar todo
                  </Button>
                </div>
              </div>

              {/* Per-field buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selected.description && (
                  <FieldPreview
                    label="Descripción"
                    value={selected.description.substring(0, 80) + "..."}
                    onApply={() => onApplyField("description", selected.description!)}
                  />
                )}
                {selected.year && (
                  <FieldPreview
                    label="Año"
                    value={selected.year.toString()}
                    onApply={() => onApplyField("year", selected.year!.toString())}
                  />
                )}
                {selected.posterUrl && (
                  <FieldPreview
                    label="Poster"
                    value={selected.posterUrl.substring(0, 40) + "..."}
                    onApply={() => onApplyField("poster_url", selected.posterUrl!)}
                    imagePreview={selected.posterUrl}
                  />
                )}
                {selected.bannerUrl && (
                  <FieldPreview
                    label="Banner"
                    value={selected.bannerUrl.substring(0, 40) + "..."}
                    onApply={() => onApplyField("hero_banner_url", selected.bannerUrl!)}
                    imagePreview={selected.bannerUrl}
                  />
                )}
                {(selected.genres?.length ?? 0) > 0 && (
                  <FieldPreview
                    label="Géneros"
                    value={getGenres().join(", ")}
                    onApply={() => onApplyField("genres", getGenres().join(", "))}
                  />
                )}
                {getAlternativeTitles().length > 0 && (
                  <>
                    <FieldPreview
                      label="Títulos alternativos"
                      value={getAlternativeTitles().join(", ")}
                      onApply={() => onApplyField("alternative_titles", getAlternativeTitles().join('|||'))}
                    />
                    <div className="flex flex-col gap-1 p-2 rounded bg-background border border-border/30">
                      <p className="text-xs font-medium text-muted-foreground">Usar como título principal</p>
                      <div className="flex flex-wrap gap-1">
                        {getAlternativeTitles().map((t, i) => (
                          <Button
                            key={i}
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => onApplyField("title", t)}
                            className="h-7 px-2 text-xs"
                          >
                            {t}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const FieldPreview = ({
  label,
  value,
  onApply,
  imagePreview,
}: {
  label: string;
  value: string;
  onApply: () => void;
  imagePreview?: string;
}) => (
  <div className="flex items-center gap-2 p-2 rounded bg-background border border-border/30">
    {imagePreview && (
      <img src={imagePreview} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
    )}
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-xs truncate">{value}</p>
    </div>
    <Button type="button" size="sm" variant="ghost" onClick={onApply} className="h-7 px-2 text-xs gap-1 flex-shrink-0">
      <Download className="h-3 w-3" />
      Usar
    </Button>
  </div>
);

export default ApiAnimeSearch;
