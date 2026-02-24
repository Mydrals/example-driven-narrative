import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, Loader2, Download, Image, ChevronDown, ChevronUp } from "lucide-react";
import {
  searchAnime,
  getJikanEpisodes,
  getAniListEpisodes,
  type AnimeSearchResult,
  type EpisodeSearchResult,
  type AnimeSourceFilter,
} from "@/lib/animeApis";
import { getTMDBEpisodes, getTMDBSeasons } from "@/lib/tmdbApi";
import { getKitsuEpisodes } from "@/lib/kitsuApi";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BulkEpisodeImportProps {
  animeId: string;
  animeTitle: string;
  existingEpisodeNumbers: number[];
  onImportComplete: () => void;
}

interface EpisodeWithSource extends EpisodeSearchResult {
  sourceAnime: AnimeSearchResult;
}

interface EpisodeRow {
  episodeNumber: number;
  options: EpisodeWithSource[]; // same ep from different sources
  selectedSourceIndex: number;
  checked: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  jikan: "Jikan (MAL)",
  anilist: "AniList",
  tmdb: "TMDB",
  kitsu: "Kitsu",
};

const BulkEpisodeImport = ({ animeId, animeTitle, existingEpisodeNumbers, onImportComplete }: BulkEpisodeImportProps) => {
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState(animeTitle || "");
  const [source, setSource] = useState<AnimeSourceFilter>("all");
  const [searching, setSearching] = useState(false);
  const [animeResults, setAnimeResults] = useState<AnimeSearchResult[]>([]);
  
  // Multiple anime can be selected to combine episode sources
  const [selectedAnimes, setSelectedAnimes] = useState<AnimeSearchResult[]>([]);
  const [loadingEps, setLoadingEps] = useState(false);
  const [episodeRows, setEpisodeRows] = useState<EpisodeRow[]>([]);
  const [importing, setImporting] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const data = await searchAnime(query.trim(), source);
      setAnimeResults(data);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, [query, source]);

  const handleSelectAnime = useCallback(async (anime: AnimeSearchResult) => {
    // Add to selected animes if not already there
    setSelectedAnimes(prev => {
      const exists = prev.some(a => a.source === anime.source && a.sourceId === anime.sourceId);
      if (exists) return prev;
      return [...prev, anime];
    });
    setAnimeResults([]);
  }, []);

  const removeSelectedAnime = (index: number) => {
    setSelectedAnimes(prev => prev.filter((_, i) => i !== index));
  };

  const fetchAllEpisodes = useCallback(async () => {
    if (selectedAnimes.length === 0) return;
    setLoadingEps(true);
    
    try {
      // Fetch episodes from all selected anime sources in parallel
      const allEpisodesBySource = await Promise.all(
        selectedAnimes.map(async (anime): Promise<EpisodeWithSource[]> => {
          let eps: EpisodeSearchResult[] = [];
          
          if (anime.source === "jikan") {
            let page = 1;
            let hasMore = true;
            while (hasMore && page <= 10) {
              const result = await getJikanEpisodes(anime.sourceId, page);
              eps = [...eps, ...result.episodes];
              hasMore = result.hasMore;
              page++;
              if (hasMore) await new Promise(r => setTimeout(r, 400));
            }
          } else if (anime.source === "anilist") {
            eps = await getAniListEpisodes(anime.sourceId);
          } else if (anime.source === "tmdb") {
            const tmdbType = (anime as any)._tmdbType || "tv";
            if (tmdbType === "tv") {
              const seasons = await getTMDBSeasons(anime.sourceId);
              for (const s of seasons) {
                const seasonEps = await getTMDBEpisodes(anime.sourceId, s);
                eps = [...eps, ...seasonEps];
              }
            }
          } else if (anime.source === "kitsu") {
            eps = await getKitsuEpisodes(anime.sourceId);
          }
          
          return eps.map(ep => ({ ...ep, sourceAnime: anime }));
        })
      );

      // Group episodes by number
      const flat = allEpisodesBySource.flat();
      const byNumber = new Map<number, EpisodeWithSource[]>();
      for (const ep of flat) {
        const num = ep.episodeNumber;
        if (!byNumber.has(num)) byNumber.set(num, []);
        byNumber.get(num)!.push(ep);
      }

      // Build rows sorted by episode number
      const rows: EpisodeRow[] = Array.from(byNumber.entries())
        .sort(([a], [b]) => a - b)
        .map(([episodeNumber, options]) => {
          // Default: prefer TMDB, then AniList, then Kitsu, then Jikan
          const preferenceOrder = ["tmdb", "anilist", "kitsu", "jikan"];
          let bestIndex = 0;
          for (const pref of preferenceOrder) {
            const idx = options.findIndex(o => o.source === pref);
            if (idx !== -1) { bestIndex = idx; break; }
          }
          
          return {
            episodeNumber,
            options,
            selectedSourceIndex: bestIndex,
            checked: !existingEpisodeNumbers.includes(episodeNumber),
          };
        });

      setEpisodeRows(rows);
    } catch (err) {
      console.error("Error fetching episodes:", err);
      toast({ title: "Error", description: "Error al cargar episodios", variant: "destructive" });
    } finally {
      setLoadingEps(false);
    }
  }, [selectedAnimes, existingEpisodeNumbers, toast]);

  const toggleAll = (checked: boolean) => {
    setEpisodeRows(prev => prev.map(r => ({ ...r, checked })));
  };

  const toggleRow = (index: number) => {
    setEpisodeRows(prev => prev.map((r, i) => i === index ? { ...r, checked: !r.checked } : r));
  };

  const changeRowSource = (rowIndex: number, sourceIndex: number) => {
    setEpisodeRows(prev => prev.map((r, i) => i === rowIndex ? { ...r, selectedSourceIndex: sourceIndex } : r));
  };

  const handleImport = async () => {
    const toImport = episodeRows.filter(r => r.checked);
    if (toImport.length === 0) {
      toast({ title: "Nada que importar", description: "Selecciona al menos un episodio" });
      return;
    }

    setImporting(true);
    try {
      const insertData = toImport.map(row => {
        const ep = row.options[row.selectedSourceIndex];
        return {
          anime_id: animeId,
          title: ep.title || `Episodio ${row.episodeNumber}`,
          description: ep.synopsis || null,
          season_number: 1,
          episode_number: row.episodeNumber,
          duration: ep.duration || "24 min",
          thumbnail_url: ep.thumbnailUrl || null,
          original_release_date: ep.aired || null,
        };
      });

      // Insert in batches of 50
      for (let i = 0; i < insertData.length; i += 50) {
        const batch = insertData.slice(i, i + 50);
        const { error } = await supabase.from("episodes").insert(batch);
        if (error) throw error;
      }

      toast({
        title: "¡Importación exitosa!",
        description: `Se importaron ${toImport.length} episodios correctamente`,
      });
      onImportComplete();
    } catch (error) {
      console.error("Import error:", error);
      toast({ title: "Error", description: "No se pudieron importar los episodios", variant: "destructive" });
    } finally {
      setImporting(false);
    }
  };

  const checkedCount = episodeRows.filter(r => r.checked).length;

  return (
    <Card className="p-4 bg-muted/30 border-border/50 mb-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-foreground w-full"
      >
        <Download className="h-4 w-4 text-primary" />
        Importar episodios masivamente desde APIs
        {expanded ? <ChevronUp className="h-4 w-4 ml-auto" /> : <ChevronDown className="h-4 w-4 ml-auto" />}
      </button>

      {expanded && (
        <div className="space-y-4 mt-4">
          {/* Step 1: Search and select anime sources */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              1. Busca el anime en las APIs y selecciona las fuentes de donde quieres obtener los datos de cada episodio.
            </p>
            <div className="flex gap-2">
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar anime..."
                className="flex-1"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
              />
              <Select value={source} onValueChange={(v) => setSource(v as AnimeSourceFilter)}>
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
          </div>

          {/* Anime search results */}
          {animeResults.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border border-border bg-background p-1">
              {animeResults.map((r, i) => (
                <button
                  key={`${r.source}-${r.sourceId}-${i}`}
                  type="button"
                  onClick={() => handleSelectAnime(r)}
                  className="w-full flex items-center gap-3 p-2 rounded hover:bg-accent transition-colors text-left"
                >
                  {r.posterUrl && <img src={r.posterUrl} alt="" className="w-8 h-12 object-cover rounded flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.year || "?"} · {r.episodes || "?"} eps</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] flex-shrink-0">
                    {SOURCE_LABELS[r.source] || r.source}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Selected anime sources */}
          {selectedAnimes.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Fuentes seleccionadas:</p>
              <div className="flex flex-wrap gap-2">
                {selectedAnimes.map((anime, i) => (
                  <Badge key={`${anime.source}-${anime.sourceId}`} variant="outline" className="gap-1 pr-1">
                    {SOURCE_LABELS[anime.source]} - {anime.title}
                    <button
                      type="button"
                      onClick={() => removeSelectedAnime(i)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
              <Button
                type="button"
                onClick={fetchAllEpisodes}
                disabled={loadingEps}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {loadingEps ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Cargar episodios
              </Button>
            </div>
          )}

          {/* Step 2: Episode list with per-episode source selection */}
          {episodeRows.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  2. Selecciona los episodios a importar y elige la fuente para cada uno.
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggleAll(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleAll(false)}
                    className="text-xs text-muted-foreground hover:underline"
                  >
                    Deseleccionar todos
                  </button>
                </div>
              </div>

              <div className="max-h-[400px] overflow-y-auto rounded-md border border-border bg-background">
                {episodeRows.map((row, rowIdx) => {
                  const selectedEp = row.options[row.selectedSourceIndex];
                  const isExisting = existingEpisodeNumbers.includes(row.episodeNumber);
                  
                  return (
                    <div
                      key={row.episodeNumber}
                      className={`flex items-center gap-3 p-2 border-b border-border/30 last:border-b-0 ${
                        isExisting ? "opacity-50" : ""
                      } ${row.checked ? "bg-primary/5" : ""}`}
                    >
                      <Checkbox
                        checked={row.checked}
                        onCheckedChange={() => toggleRow(rowIdx)}
                        disabled={isExisting}
                      />
                      
                      {selectedEp?.thumbnailUrl ? (
                        <img src={selectedEp.thumbnailUrl} alt="" className="w-16 h-10 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-10 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          <Image className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}

                      <span className="font-mono text-xs w-8 text-right flex-shrink-0 text-muted-foreground">
                        #{row.episodeNumber}
                      </span>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">
                          {selectedEp?.title || "Sin título"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          {selectedEp?.duration && <span>{selectedEp.duration}</span>}
                          {selectedEp?.aired && <span>{selectedEp.aired}</span>}
                          {isExisting && <Badge variant="secondary" className="text-[10px]">Ya existe</Badge>}
                        </div>
                      </div>

                      {/* Source selector per episode */}
                      {row.options.length > 1 ? (
                        <Select
                          value={row.selectedSourceIndex.toString()}
                          onValueChange={(v) => changeRowSource(rowIdx, parseInt(v))}
                        >
                          <SelectTrigger className="w-[120px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {row.options.map((opt, optIdx) => (
                              <SelectItem key={optIdx} value={optIdx.toString()}>
                                {SOURCE_LABELS[opt.source] || opt.source}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-[10px] flex-shrink-0">
                          {SOURCE_LABELS[selectedEp?.source] || selectedEp?.source}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Import button */}
              <div className="flex items-center justify-between pt-2">
                <p className="text-sm text-muted-foreground">
                  {checkedCount} episodio{checkedCount !== 1 ? "s" : ""} seleccionado{checkedCount !== 1 ? "s" : ""}
                </p>
                <Button
                  type="button"
                  onClick={handleImport}
                  disabled={importing || checkedCount === 0}
                  className="gap-2"
                >
                  {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  {importing ? "Importando..." : `Importar ${checkedCount} episodios`}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

export default BulkEpisodeImport;