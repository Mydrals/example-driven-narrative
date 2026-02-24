import { useState, useCallback, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, Loader2, Download, ChevronDown, ChevronUp, Image } from "lucide-react";
import {
  searchAnime,
  getJikanEpisodes,
  getJikanEpisodeDetail,
  getAniListEpisodes,
  type AnimeSearchResult,
  type EpisodeSearchResult,
  type AnimeSourceFilter,
} from "@/lib/animeApis";
import { getTMDBEpisodes, getTMDBSeasons } from "@/lib/tmdbApi";
import { getKitsuEpisodes } from "@/lib/kitsuApi";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ApiEpisodeSearchProps {
  currentEpisodeNumber?: number;
  onApplyField: (field: string, value: string) => void;
  animeTitle?: string;
}

const ApiEpisodeSearch = ({ currentEpisodeNumber, onApplyField, animeTitle }: ApiEpisodeSearchProps) => {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState<AnimeSourceFilter>("all");
  const [results, setResults] = useState<AnimeSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedAnime, setSelectedAnime] = useState<AnimeSearchResult | null>(null);
  const [episodes, setEpisodes] = useState<EpisodeSearchResult[]>([]);
  const [loadingEps, setLoadingEps] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [matchedEpisode, setMatchedEpisode] = useState<EpisodeSearchResult | null>(null);
  const [loadingSynopsis, setLoadingSynopsis] = useState(false);

  // Auto-fill query with anime title
  useEffect(() => {
    if (animeTitle && !query) {
      setQuery(animeTitle);
    }
  }, [animeTitle]);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setSearching(true);
    setSelectedAnime(null);
    setEpisodes([]);
    setMatchedEpisode(null);
    try {
      const data = await searchAnime(query.trim(), source);
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setSearching(false);
    }
  }, [query, source]);

  const handleSelectAnime = useCallback(async (anime: AnimeSearchResult) => {
    setSelectedAnime(anime);
    setResults([]);
    setLoadingEps(true);
    setMatchedEpisode(null);
    try {
      let allEps: EpisodeSearchResult[] = [];

      if (anime.source === "jikan") {
        let page = 1;
        let hasMore = true;
        while (hasMore && page <= 10) {
          const result = await getJikanEpisodes(anime.sourceId, page);
          allEps = [...allEps, ...result.episodes];
          hasMore = result.hasMore;
          page++;
          if (hasMore) await new Promise(r => setTimeout(r, 400));
        }
      } else if (anime.source === "anilist") {
        allEps = await getAniListEpisodes(anime.sourceId);
      } else if (anime.source === "tmdb") {
        const tmdbType = (anime as any)._tmdbType || "tv";
        if (tmdbType === "tv") {
          const seasons = await getTMDBSeasons(anime.sourceId);
          for (const s of seasons) {
            const eps = await getTMDBEpisodes(anime.sourceId, s);
            allEps = [...allEps, ...eps];
          }
        }
      } else if (anime.source === "kitsu") {
        allEps = await getKitsuEpisodes(anime.sourceId);
      }

      setEpisodes(allEps);

      // Auto-match current episode number
      if (currentEpisodeNumber) {
        const match = allEps.find(ep => ep.episodeNumber === currentEpisodeNumber);
        if (match) {
          setMatchedEpisode(match);
          // If Jikan, try to fetch synopsis for matched episode
          if (anime.source === "jikan" && !match.synopsis) {
            fetchEpisodeSynopsis(anime.sourceId, match.episodeNumber);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching episodes:", err);
    } finally {
      setLoadingEps(false);
    }
  }, [currentEpisodeNumber]);

  const fetchEpisodeSynopsis = async (malId: number, episodeNumber: number) => {
    setLoadingSynopsis(true);
    try {
      const detail = await getJikanEpisodeDetail(malId, episodeNumber);
      if (detail?.synopsis) {
        setMatchedEpisode(prev => prev ? { ...prev, synopsis: detail.synopsis } : prev);
      }
    } catch (err) {
      console.error("Error fetching episode synopsis:", err);
    } finally {
      setLoadingSynopsis(false);
    }
  };

  const selectEpisode = async (ep: EpisodeSearchResult) => {
    setMatchedEpisode(ep);
    // If Jikan and no synopsis, fetch detail
    if (selectedAnime?.source === "jikan" && !ep.synopsis) {
      fetchEpisodeSynopsis(selectedAnime.sourceId, ep.episodeNumber);
    }
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

  const applyAll = () => {
    if (!matchedEpisode) return;
    if (matchedEpisode.title) onApplyField("title", matchedEpisode.title);
    if (matchedEpisode.aired) onApplyField("original_release_date", matchedEpisode.aired);
    if (matchedEpisode.thumbnailUrl) onApplyField("thumbnail_url", matchedEpisode.thumbnailUrl);
    if (matchedEpisode.duration) onApplyField("duration", matchedEpisode.duration);
    if (matchedEpisode.synopsis) onApplyField("description", matchedEpisode.synopsis);
  };

  return (
    <Card className="p-4 bg-muted/30 border-border/50 mb-6">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3"
      >
        <Search className="h-4 w-4 text-primary" />
        Buscar datos del episodio (Jikan + AniList + TMDB + Kitsu)
        {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* Search */}
          <div className="flex gap-2">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar anime para obtener episodios..."
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

          {/* Anime results */}
          {results.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1 rounded-md border border-border bg-background p-1">
              {results.map((r, i) => (
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
                    {getSourceLabel(r.source)}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {/* Selected anime + episodes */}
          {selectedAnime && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {getSourceLabel(selectedAnime.source)} #{selectedAnime.sourceId}
                </Badge>
                <span className="text-sm font-medium">{selectedAnime.title}</span>
              </div>

              {loadingEps && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando episodios...
                </div>
              )}

              {!loadingEps && episodes.length > 0 && (
                <div className="max-h-40 overflow-y-auto space-y-1 rounded-md border border-border bg-background p-1">
                  {episodes.map((ep) => (
                    <button
                      key={`${ep.source}-${ep.episodeNumber}`}
                      type="button"
                      onClick={() => selectEpisode(ep)}
                      className={`w-full flex items-center gap-2 p-2 rounded text-left text-sm transition-colors ${
                        matchedEpisode?.episodeNumber === ep.episodeNumber
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-accent"
                      }`}
                    >
                      {ep.thumbnailUrl ? (
                        <img src={ep.thumbnailUrl} alt="" className="w-12 h-8 object-cover rounded flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                          <Image className="h-3 w-3 text-muted-foreground" />
                        </div>
                      )}
                      <span className="font-mono text-xs w-8 text-right flex-shrink-0">#{ep.episodeNumber}</span>
                      <span className="truncate flex-1">{ep.title || "Sin título"}</span>
                      {ep.duration && <span className="text-xs text-muted-foreground flex-shrink-0">{ep.duration}</span>}
                      {ep.aired && <span className="text-xs text-muted-foreground flex-shrink-0">{ep.aired}</span>}
                    </button>
                  ))}
                </div>
              )}

              {!loadingEps && episodes.length === 0 && (
                <p className="text-xs text-muted-foreground">No se encontraron episodios para este anime.</p>
              )}

              {/* Matched episode data */}
              {matchedEpisode && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground">
                      Ep #{matchedEpisode.episodeNumber}: {matchedEpisode.title || "Sin título"}
                    </p>
                    <Button type="button" size="sm" variant="default" onClick={applyAll} className="gap-1 text-xs">
                      <Download className="h-3 w-3" />
                      Aplicar todo
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {matchedEpisode.title && (
                      <FieldButton
                        label="Título"
                        value={matchedEpisode.title}
                        onApply={() => onApplyField("title", matchedEpisode.title!)}
                      />
                    )}
                    {matchedEpisode.aired && (
                      <FieldButton
                        label="Fecha"
                        value={matchedEpisode.aired}
                        onApply={() => onApplyField("original_release_date", matchedEpisode.aired!)}
                      />
                    )}
                    {matchedEpisode.thumbnailUrl && (
                      <FieldButton
                        label="Thumbnail"
                        value={matchedEpisode.thumbnailUrl.substring(0, 40) + "..."}
                        onApply={() => onApplyField("thumbnail_url", matchedEpisode.thumbnailUrl!)}
                        imagePreview={matchedEpisode.thumbnailUrl}
                      />
                    )}
                    {matchedEpisode.duration && (
                      <FieldButton
                        label="Duración"
                        value={matchedEpisode.duration}
                        onApply={() => onApplyField("duration", matchedEpisode.duration!)}
                      />
                    )}
                    {matchedEpisode.synopsis && (
                      <FieldButton
                        label="Sinopsis"
                        value={matchedEpisode.synopsis.substring(0, 60) + "..."}
                        onApply={() => onApplyField("description", matchedEpisode.synopsis!)}
                      />
                    )}
                    {loadingSynopsis && (
                      <div className="flex items-center gap-2 p-2 text-xs text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Cargando sinopsis...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

const FieldButton = ({ label, value, onApply, imagePreview }: { label: string; value: string; onApply: () => void; imagePreview?: string }) => (
  <div className="flex items-center gap-2 p-2 rounded bg-background border border-border/30">
    {imagePreview && (
      <img src={imagePreview} alt="" className="w-10 h-7 object-cover rounded flex-shrink-0" />
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

export default ApiEpisodeSearch;
