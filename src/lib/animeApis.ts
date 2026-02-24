// Anime API integrations: Jikan (MyAnimeList) + AniList

export interface AnimeSearchResult {
  source: "jikan" | "anilist" | "tmdb" | "kitsu";
  sourceId: number;
  title: string;
  titleEnglish?: string;
  titleJapanese?: string;
  description?: string;
  year?: number;
  genres?: string[];
  demographics?: string[];
  posterUrl?: string;
  bannerUrl?: string;
  episodes?: number;
}

export interface EpisodeSearchResult {
  source: "jikan" | "anilist" | "tmdb" | "kitsu";
  episodeNumber: number;
  title?: string;
  titleJapanese?: string;
  aired?: string;
  duration?: string;
  thumbnailUrl?: string;
  synopsis?: string;
}

// ========== JIKAN (MyAnimeList) ==========

const JIKAN_BASE = "https://api.jikan.moe/v4";

export const searchJikan = async (query: string): Promise<AnimeSearchResult[]> => {
  const res = await fetch(`${JIKAN_BASE}/anime?q=${encodeURIComponent(query)}&limit=10&sfw=true`);
  if (!res.ok) throw new Error("Jikan API error");
  const data = await res.json();

  return (data.data || []).map((anime: any) => ({
    source: "jikan" as const,
    sourceId: anime.mal_id,
    title: anime.title,
    titleEnglish: anime.title_english,
    titleJapanese: anime.title_japanese,
    description: anime.synopsis,
    year: anime.year || (anime.aired?.prop?.from?.year),
    genres: [
      ...(anime.genres || []).map((g: any) => g.name),
      ...(anime.themes || []).map((g: any) => g.name),
    ],
    demographics: (anime.demographics || []).map((d: any) => d.name),
    posterUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
    bannerUrl: null,
    episodes: anime.episodes,
  }));
};

export const getJikanAnimeDetails = async (malId: number): Promise<AnimeSearchResult | null> => {
  const res = await fetch(`${JIKAN_BASE}/anime/${malId}/full`);
  if (!res.ok) return null;
  const data = await res.json();
  const anime = data.data;
  if (!anime) return null;

  return {
    source: "jikan",
    sourceId: anime.mal_id,
    title: anime.title,
    titleEnglish: anime.title_english,
    titleJapanese: anime.title_japanese,
    description: anime.synopsis,
    year: anime.year || anime.aired?.prop?.from?.year,
    genres: [
      ...(anime.genres || []).map((g: any) => g.name),
      ...(anime.themes || []).map((g: any) => g.name),
    ],
    demographics: (anime.demographics || []).map((d: any) => d.name),
    posterUrl: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
    bannerUrl: null,
    episodes: anime.episodes,
  };
};

export const getJikanEpisodes = async (malId: number, page = 1): Promise<{ episodes: EpisodeSearchResult[]; hasMore: boolean }> => {
  const res = await fetch(`${JIKAN_BASE}/anime/${malId}/episodes?page=${page}`);
  if (!res.ok) throw new Error("Jikan episodes error");
  const data = await res.json();

  const episodes: EpisodeSearchResult[] = (data.data || []).map((ep: any) => ({
    source: "jikan" as const,
    episodeNumber: ep.mal_id,
    title: ep.title || ep.title_romanji,
    titleJapanese: ep.title_japanese,
    aired: ep.aired ? new Date(ep.aired).toISOString().split("T")[0] : undefined,
    duration: undefined,
    thumbnailUrl: undefined,
    synopsis: undefined,
  }));

  return { episodes, hasMore: data.pagination?.has_next_page || false };
};

// Jikan single episode detail (has synopsis)
export const getJikanEpisodeDetail = async (malId: number, episodeNumber: number): Promise<EpisodeSearchResult | null> => {
  try {
    const res = await fetch(`${JIKAN_BASE}/anime/${malId}/episodes/${episodeNumber}`);
    if (!res.ok) return null;
    const data = await res.json();
    const ep = data.data;
    if (!ep) return null;
    return {
      source: "jikan",
      episodeNumber: ep.mal_id || episodeNumber,
      title: ep.title || ep.title_romanji,
      titleJapanese: ep.title_japanese,
      aired: ep.aired ? new Date(ep.aired).toISOString().split("T")[0] : undefined,
      synopsis: ep.synopsis || undefined,
      duration: undefined,
      thumbnailUrl: undefined,
    };
  } catch {
    return null;
  }
};

// ========== ANILIST ==========

const ANILIST_URL = "https://graphql.anilist.co";

const anilistQuery = async (query: string, variables: Record<string, any>) => {
  const res = await fetch(ANILIST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error("AniList API error");
  return res.json();
};

export const searchAniList = async (search: string): Promise<AnimeSearchResult[]> => {
  const query = `
    query ($search: String) {
      Page(perPage: 10) {
        media(search: $search, type: ANIME, sort: POPULARITY_DESC) {
          id
          title { romaji english native }
          description(asHtml: false)
          seasonYear
          genres
          tags { name category rank }
          coverImage { extraLarge large }
          bannerImage
          episodes
        }
      }
    }
  `;

  const data = await anilistQuery(query, { search });
  const media = data?.data?.Page?.media || [];

  return media.map((anime: any) => {
    const demographicTags = (anime.tags || [])
      .filter((t: any) => t.category === "Demographics" || ["Shounen", "Shoujo", "Seinen", "Josei", "Kids"].includes(t.name))
      .map((t: any) => t.name);

    return {
      source: "anilist" as const,
      sourceId: anime.id,
      title: anime.title?.romaji || anime.title?.english || "",
      titleEnglish: anime.title?.english,
      titleJapanese: anime.title?.native,
      description: anime.description?.replace(/<[^>]*>/g, "") || "",
      year: anime.seasonYear,
      genres: anime.genres || [],
      demographics: demographicTags,
      posterUrl: anime.coverImage?.extraLarge || anime.coverImage?.large,
      bannerUrl: anime.bannerImage,
      episodes: anime.episodes,
    };
  });
};

export const getAniListAnimeDetails = async (anilistId: number): Promise<AnimeSearchResult | null> => {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        id
        title { romaji english native }
        description(asHtml: false)
        seasonYear
        genres
        coverImage { extraLarge large }
        bannerImage
        episodes
      }
    }
  `;

  const data = await anilistQuery(query, { id: anilistId });
  const anime = data?.data?.Media;
  if (!anime) return null;

  return {
    source: "anilist",
    sourceId: anime.id,
    title: anime.title?.romaji || anime.title?.english || "",
    titleEnglish: anime.title?.english,
    titleJapanese: anime.title?.native,
    description: anime.description?.replace(/<[^>]*>/g, "") || "",
    year: anime.seasonYear,
    genres: anime.genres || [],
    posterUrl: anime.coverImage?.extraLarge || anime.coverImage?.large,
    bannerUrl: anime.bannerImage,
    episodes: anime.episodes,
  };
};

// AniList episodes with thumbnails and descriptions
export const getAniListEpisodes = async (anilistId: number): Promise<EpisodeSearchResult[]> => {
  const query = `
    query ($id: Int) {
      Media(id: $id, type: ANIME) {
        streamingEpisodes {
          title
          thumbnail
        }
        episodes
        duration
      }
    }
  `;

  const data = await anilistQuery(query, { id: anilistId });
  const media = data?.data?.Media;
  if (!media) return [];

  const streamingEps = media.streamingEpisodes || [];
  const totalEps = media.episodes || streamingEps.length;
  const durationMin = media.duration ? `${media.duration} min` : undefined;

  // If streaming episodes exist, use them (they have thumbnails)
  if (streamingEps.length > 0) {
    return streamingEps.map((ep: any, idx: number) => {
      // Extract episode number from title like "Episode 1 - Title"
      const match = ep.title?.match(/Episode\s*(\d+)/i);
      const epNum = match ? parseInt(match[1]) : idx + 1;
      const cleanTitle = ep.title?.replace(/Episode\s*\d+\s*[-–]\s*/i, "").trim() || undefined;
      return {
        source: "anilist" as const,
        episodeNumber: epNum,
        title: cleanTitle || ep.title,
        thumbnailUrl: ep.thumbnail || undefined,
        duration: durationMin,
        synopsis: undefined,
        aired: undefined,
      };
    });
  }

  // Fallback: generate episode list from count
  if (totalEps > 0) {
    return Array.from({ length: totalEps }, (_, i) => ({
      source: "anilist" as const,
      episodeNumber: i + 1,
      title: undefined,
      duration: durationMin,
      thumbnailUrl: undefined,
      synopsis: undefined,
      aired: undefined,
    }));
  }

  return [];
};

// ========== UNIFIED SEARCH ==========

import { searchTMDB } from "@/lib/tmdbApi";
import { searchKitsu } from "@/lib/kitsuApi";

export type AnimeSourceFilter = "all" | "jikan" | "anilist" | "tmdb" | "kitsu";

export const searchAnime = async (query: string, source: AnimeSourceFilter = "all"): Promise<AnimeSearchResult[]> => {
  if (source === "jikan") return searchJikan(query);
  if (source === "anilist") return searchAniList(query);
  if (source === "tmdb") return searchTMDB(query);
  if (source === "kitsu") return searchKitsu(query);

  // Search all in parallel
  const [jikanResults, anilistResults, tmdbResults, kitsuResults] = await Promise.allSettled([
    searchJikan(query),
    searchAniList(query),
    searchTMDB(query),
    searchKitsu(query),
  ]);

  return [
    ...(jikanResults.status === "fulfilled" ? jikanResults.value : []),
    ...(anilistResults.status === "fulfilled" ? anilistResults.value : []),
    ...(tmdbResults.status === "fulfilled" ? tmdbResults.value : []),
    ...(kitsuResults.status === "fulfilled" ? kitsuResults.value : []),
  ];
};

// Genre translation map (English -> Spanish)
const GENRE_MAP: Record<string, string> = {
  "Action": "Acción",
  "Adventure": "Aventura",
  "Comedy": "Comedia",
  "Drama": "Drama",
  "Fantasy": "Fantasía",
  "Horror": "Terror",
  "Mystery": "Misterio",
  "Romance": "Romance",
  "Sci-Fi": "Ciencia Ficción",
  "Slice of Life": "Recuentos de la Vida",
  "Sports": "Deportes",
  "Supernatural": "Sobrenatural",
  "Thriller": "Suspenso",
  "Ecchi": "Ecchi",
  "Mecha": "Mecha",
  "Music": "Música",
  "Psychological": "Psicológico",
  "School": "Escolar",
  "Shounen": "Shounen",
  "Shoujo": "Shoujo",
  "Seinen": "Seinen",
  "Josei": "Josei",
  "Isekai": "Isekai",
  "Military": "Militar",
  "Historical": "Histórico",
  "Dementia": "Demencia",
  "Demons": "Demonios",
  "Game": "Juegos",
  "Harem": "Harem",
  "Kids": "Infantil",
  "Magic": "Magia",
  "Martial Arts": "Artes Marciales",
  "Parody": "Parodia",
  "Police": "Policía",
  "Samurai": "Samurai",
  "Space": "Espacio",
  "Super Power": "Superpoderes",
  "Vampire": "Vampiros",
  "Gore": "Gore",
  "Survival": "Supervivencia",
  "Reincarnation": "Reencarnación",
  "Performing Arts": "Artes Escénicas",
  "Strategy Game": "Estrategia",
  "Award Winning": "Premiado",
  "Suspense": "Suspenso",
  "Gourmet": "Gastronomía",
};

// Demographics translation map (English -> Spanish)
const DEMOGRAPHICS_MAP: Record<string, string> = {
  "Shounen": "Shōnen",
  "Shoujo": "Shōjo",
  "Seinen": "Seinen",
  "Josei": "Josei",
  "Kids": "Infantil",
};

export const translateGenre = (genre: string): string => {
  return GENRE_MAP[genre] || genre;
};

export const translateGenres = (genres: string[]): string[] => {
  return genres.map(translateGenre);
};

export const translateDemographic = (demo: string): string => {
  return DEMOGRAPHICS_MAP[demo] || demo;
};

export const translateDemographics = (demos: string[]): string[] => {
  return demos.map(translateDemographic);
};
