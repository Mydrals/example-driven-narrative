// TMDB API integration - supports Spanish language
import type { AnimeSearchResult, EpisodeSearchResult } from "@/lib/animeApis";

const TMDB_BASE = "https://api.themoviedb.org/3";
const TMDB_API_KEY = "5548d9290fecb4e79c7d383e603e4b82";
const TMDB_IMG = "https://image.tmdb.org/t/p";

const tmdbFetch = async (path: string, params: Record<string, string> = {}) => {
  const url = new URL(`${TMDB_BASE}${path}`);
  url.searchParams.set("api_key", TMDB_API_KEY);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`TMDB error ${res.status}`);
  return res.json();
};

// Genre map for TMDB TV genre IDs -> Spanish
const TV_GENRE_MAP: Record<number, string> = {
  10759: "Acción y Aventura",
  16: "Animación",
  35: "Comedia",
  80: "Crimen",
  99: "Documental",
  18: "Drama",
  10751: "Familia",
  10762: "Infantil",
  9648: "Misterio",
  10763: "Noticias",
  10764: "Reality",
  10765: "Ciencia Ficción y Fantasía",
  10766: "Telenovela",
  10767: "Talk Show",
  10768: "Guerra y Política",
  37: "Western",
};

const MOVIE_GENRE_MAP: Record<number, string> = {
  28: "Acción",
  12: "Aventura",
  16: "Animación",
  35: "Comedia",
  80: "Crimen",
  99: "Documental",
  18: "Drama",
  10751: "Familia",
  14: "Fantasía",
  36: "Historia",
  27: "Terror",
  10402: "Música",
  9648: "Misterio",
  10749: "Romance",
  878: "Ciencia Ficción",
  10770: "Película de TV",
  53: "Suspenso",
  10752: "Guerra",
  37: "Western",
};

export const searchTMDB = async (query: string): Promise<AnimeSearchResult[]> => {
  // Search TV (most anime are TV series in TMDB)
  const [tvData, movieData] = await Promise.allSettled([
    tmdbFetch("/search/tv", { query, language: "es-ES", page: "1" }),
    tmdbFetch("/search/movie", { query, language: "es-ES", page: "1" }),
  ]);

  const results: AnimeSearchResult[] = [];

  if (tvData.status === "fulfilled") {
    const tvResults = (tvData.value.results || []).slice(0, 8);
    for (const item of tvResults) {
      // Filter to animation genre (16)
      if (!item.genre_ids?.includes(16)) continue;
      results.push({
        source: "tmdb" as any,
        sourceId: item.id,
        title: item.name || item.original_name,
        titleEnglish: undefined,
        titleJapanese: item.original_name,
        description: item.overview || undefined,
        year: item.first_air_date ? parseInt(item.first_air_date.substring(0, 4)) : undefined,
        genres: (item.genre_ids || []).map((id: number) => TV_GENRE_MAP[id] || `Genre ${id}`),
        posterUrl: item.poster_path ? `${TMDB_IMG}/w500${item.poster_path}` : undefined,
        bannerUrl: item.backdrop_path ? `${TMDB_IMG}/original${item.backdrop_path}` : undefined,
        episodes: undefined,
        _tmdbType: "tv",
      } as any);
    }
  }

  if (movieData.status === "fulfilled") {
    const movieResults = (movieData.value.results || []).slice(0, 5);
    for (const item of movieResults) {
      if (!item.genre_ids?.includes(16)) continue;
      results.push({
        source: "tmdb" as any,
        sourceId: item.id,
        title: item.title || item.original_title,
        titleEnglish: undefined,
        titleJapanese: item.original_title,
        description: item.overview || undefined,
        year: item.release_date ? parseInt(item.release_date.substring(0, 4)) : undefined,
        genres: (item.genre_ids || []).map((id: number) => MOVIE_GENRE_MAP[id] || `Genre ${id}`),
        posterUrl: item.poster_path ? `${TMDB_IMG}/w500${item.poster_path}` : undefined,
        bannerUrl: item.backdrop_path ? `${TMDB_IMG}/original${item.backdrop_path}` : undefined,
        episodes: undefined,
        _tmdbType: "movie",
      } as any);
    }
  }

  return results;
};

export const getTMDBAnimeDetails = async (tmdbId: number, mediaType: "tv" | "movie" = "tv"): Promise<AnimeSearchResult | null> => {
  try {
    const data = await tmdbFetch(`/${mediaType}/${tmdbId}`, { language: "es-ES" });
    if (!data) return null;

    const genreMap = mediaType === "tv" ? TV_GENRE_MAP : MOVIE_GENRE_MAP;

    return {
      source: "tmdb" as any,
      sourceId: data.id,
      title: data.name || data.title,
      titleJapanese: data.original_name || data.original_title,
      description: data.overview || undefined,
      year: mediaType === "tv"
        ? (data.first_air_date ? parseInt(data.first_air_date.substring(0, 4)) : undefined)
        : (data.release_date ? parseInt(data.release_date.substring(0, 4)) : undefined),
      genres: (data.genres || []).map((g: any) => genreMap[g.id] || g.name),
      posterUrl: data.poster_path ? `${TMDB_IMG}/w500${data.poster_path}` : undefined,
      bannerUrl: data.backdrop_path ? `${TMDB_IMG}/original${data.backdrop_path}` : undefined,
      episodes: mediaType === "tv" ? data.number_of_episodes : 1,
      _tmdbType: mediaType,
    } as any;
  } catch {
    return null;
  }
};

export const getTMDBEpisodes = async (tmdbId: number, seasonNumber = 1): Promise<EpisodeSearchResult[]> => {
  try {
    const data = await tmdbFetch(`/tv/${tmdbId}/season/${seasonNumber}`, { language: "es-ES" });
    if (!data?.episodes) return [];

    return data.episodes.map((ep: any) => ({
      source: "tmdb" as any,
      episodeNumber: ep.episode_number,
      title: ep.name || undefined,
      titleJapanese: undefined,
      aired: ep.air_date || undefined,
      duration: ep.runtime ? `${ep.runtime} min` : undefined,
      thumbnailUrl: ep.still_path ? `${TMDB_IMG}/w400${ep.still_path}` : undefined,
      synopsis: ep.overview || undefined,
    }));
  } catch {
    return [];
  }
};

// Get logo from TMDB images API
export const getTMDBLogo = async (tmdbId: number, mediaType: "tv" | "movie" = "tv"): Promise<string | null> => {
  try {
    const data = await tmdbFetch(`/${mediaType}/${tmdbId}/images`);
    const logos = data?.logos || [];
    // Prefer Spanish, then English, then any
    const logo = logos.find((l: any) => l.iso_639_1 === "es")
      || logos.find((l: any) => l.iso_639_1 === "en")
      || logos[0];
    return logo?.file_path ? `${TMDB_IMG}/original${logo.file_path}` : null;
  } catch {
    return null;
  }
};

// Get number of seasons
export const getTMDBSeasons = async (tmdbId: number): Promise<number[]> => {
  try {
    const data = await tmdbFetch(`/tv/${tmdbId}`, { language: "es-ES" });
    if (!data?.seasons) return [1];
    return data.seasons
      .filter((s: any) => s.season_number > 0)
      .map((s: any) => s.season_number);
  } catch {
    return [1];
  }
};
