// Kitsu API integration - free, no API key needed
import type { AnimeSearchResult, EpisodeSearchResult } from "@/lib/animeApis";

const KITSU_BASE = "https://kitsu.app/api/edge";

const kitsuFetch = async (path: string) => {
  const res = await fetch(`${KITSU_BASE}${path}`, {
    headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json" },
  });
  if (!res.ok) throw new Error(`Kitsu error ${res.status}`);
  return res.json();
};

// Kitsu subtype -> demographic mapping
const KITSU_SUBTYPE_DEMOGRAPHICS: Record<string, string> = {
  "TV": "",
  "movie": "",
  "OVA": "",
  "ONA": "",
  "special": "",
};

// Known Kitsu category names that are demographics
const KITSU_DEMOGRAPHIC_CATEGORIES = ["Shounen", "Shoujo", "Seinen", "Josei", "Kids"];

export const searchKitsu = async (query: string): Promise<AnimeSearchResult[]> => {
  const data = await kitsuFetch(`/anime?filter[text]=${encodeURIComponent(query)}&page[limit]=10&include=categories&fields[anime]=id,titles,synopsis,startDate,posterImage,coverImage,episodeCount,subtype&fields[categories]=title`);

  const categoriesById: Record<string, string> = {};
  if (data.included) {
    for (const inc of data.included) {
      if (inc.type === "categories") {
        categoriesById[inc.id] = inc.attributes?.title || "";
      }
    }
  }

  return (data.data || []).map((item: any) => {
    const attrs = item.attributes;
    
    // Extract category names for this anime
    const catRels = item.relationships?.categories?.data || [];
    const catNames = catRels.map((r: any) => categoriesById[r.id]).filter(Boolean);
    
    const demographics = catNames.filter((c: string) => KITSU_DEMOGRAPHIC_CATEGORIES.includes(c));
    const genres = catNames.filter((c: string) => !KITSU_DEMOGRAPHIC_CATEGORIES.includes(c));

    return {
      source: "kitsu" as any,
      sourceId: parseInt(item.id),
      title: attrs.titles?.en_jp || attrs.titles?.en || attrs.titles?.ja_jp || "",
      titleEnglish: attrs.titles?.en,
      titleJapanese: attrs.titles?.ja_jp,
      description: attrs.synopsis || undefined,
      year: attrs.startDate ? parseInt(attrs.startDate.substring(0, 4)) : undefined,
      genres,
      demographics,
      posterUrl: attrs.posterImage?.large || attrs.posterImage?.original || undefined,
      bannerUrl: attrs.coverImage?.large || attrs.coverImage?.original || undefined,
      episodes: attrs.episodeCount || undefined,
    };
  });
};

export const getKitsuAnimeDetails = async (kitsuId: number): Promise<AnimeSearchResult | null> => {
  try {
    const [animeData, genreData, catData] = await Promise.all([
      kitsuFetch(`/anime/${kitsuId}`),
      kitsuFetch(`/anime/${kitsuId}/genres`),
      kitsuFetch(`/anime/${kitsuId}/categories`),
    ]);

    const attrs = animeData.data?.attributes;
    if (!attrs) return null;

    const allGenres = (genreData.data || []).map((g: any) => g.attributes?.name).filter(Boolean);
    const catNames = (catData.data || []).map((c: any) => c.attributes?.title).filter(Boolean);
    
    const demographics = catNames.filter((c: string) => KITSU_DEMOGRAPHIC_CATEGORIES.includes(c));
    // Merge genre names from both endpoints, deduplicate
    const genreSet = new Set([...allGenres, ...catNames.filter((c: string) => !KITSU_DEMOGRAPHIC_CATEGORIES.includes(c))]);

    return {
      source: "kitsu" as any,
      sourceId: kitsuId,
      title: attrs.titles?.en_jp || attrs.titles?.en || attrs.titles?.ja_jp || "",
      titleEnglish: attrs.titles?.en,
      titleJapanese: attrs.titles?.ja_jp,
      description: attrs.synopsis || undefined,
      year: attrs.startDate ? parseInt(attrs.startDate.substring(0, 4)) : undefined,
      genres: Array.from(genreSet),
      demographics,
      posterUrl: attrs.posterImage?.large || attrs.posterImage?.original || undefined,
      bannerUrl: attrs.coverImage?.large || attrs.coverImage?.original || undefined,
      episodes: attrs.episodeCount || undefined,
    };
  } catch {
    return null;
  }
};

export const getKitsuEpisodes = async (kitsuId: number): Promise<EpisodeSearchResult[]> => {
  const allEps: EpisodeSearchResult[] = [];
  let offset = 0;
  const limit = 20;

  try {
    while (offset < 500) { // safety cap
      const data = await kitsuFetch(`/anime/${kitsuId}/episodes?page[limit]=${limit}&page[offset]=${offset}&sort=number`);
      const episodes = data.data || [];
      if (episodes.length === 0) break;

      for (const ep of episodes) {
        const attrs = ep.attributes;
        allEps.push({
          source: "kitsu" as any,
          episodeNumber: attrs.number || (offset + allEps.length + 1),
          title: attrs.titles?.en_jp || attrs.titles?.en || attrs.canonicalTitle || undefined,
          titleJapanese: attrs.titles?.ja_jp,
          aired: attrs.airdate || undefined,
          duration: attrs.length ? `${attrs.length} min` : undefined,
          thumbnailUrl: attrs.thumbnail?.original || attrs.thumbnail?.large || undefined,
          synopsis: attrs.synopsis || undefined,
        });
      }

      if (!data.links?.next) break;
      offset += limit;
    }
  } catch (err) {
    console.error("Kitsu episodes error:", err);
  }

  return allEps;
};
