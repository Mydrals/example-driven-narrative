// Canonical genres we support (in Spanish)
export const ALLOWED_GENRES = [
  "Acción",
  "Aventura",
  "Comedia",
  "Drama",
  "Fantasía",
  "Musical",
  "Romance",
  "Ciencia Ficción",
  "Seinen",
  "Shoujo",
  "Shounen",
  "Recuentos de la Vida",
  "Deportes",
  "Sobrenatural",
  "Thriller",
  "Ecchi",
  "Harem",
  "Terror",
  "Colegial",
] as const;

export type AllowedGenre = (typeof ALLOWED_GENRES)[number];

// Map of known API genre names (English/Spanish/variants) -> our canonical genre
const GENRE_ALIAS_MAP: Record<string, AllowedGenre> = {
  // Acción
  "action": "Acción",
  "acción": "Acción",
  "accion": "Acción",
  // Aventura
  "adventure": "Aventura",
  "aventura": "Aventura",
  // Comedia
  "comedy": "Comedia",
  "comedia": "Comedia",
  // Drama
  "drama": "Drama",
  // Fantasía
  "fantasy": "Fantasía",
  "fantasía": "Fantasía",
  "fantasia": "Fantasía",
  // Musical
  "music": "Musical",
  "musical": "Musical",
  "música": "Musical",
  "musica": "Musical",
  // Romance
  "romance": "Romance",
  // Ciencia Ficción
  "sci-fi": "Ciencia Ficción",
  "sci fi": "Ciencia Ficción",
  "science fiction": "Ciencia Ficción",
  "ciencia ficción": "Ciencia Ficción",
  "ciencia ficcion": "Ciencia Ficción",
  // Seinen
  "seinen": "Seinen",
  // Shoujo
  "shoujo": "Shoujo",
  "shōjo": "Shoujo",
  "shojo": "Shoujo",
  // Shounen
  "shounen": "Shounen",
  "shōnen": "Shounen",
  "shonen": "Shounen",
  // Recuentos de la Vida
  "slice of life": "Recuentos de la Vida",
  "recuentos de la vida": "Recuentos de la Vida",
  "reencuentros de la vida": "Recuentos de la Vida",
  // Deportes
  "sports": "Deportes",
  "deportes": "Deportes",
  // Sobrenatural
  "supernatural": "Sobrenatural",
  "sobrenatural": "Sobrenatural",
  // Thriller
  "thriller": "Thriller",
  "suspense": "Thriller",
  "suspenso": "Thriller",
  "psychological": "Thriller",
  "psicológico": "Thriller",
  "psicologico": "Thriller",
  // Ecchi
  "ecchi": "Ecchi",
  // Harem
  "harem": "Harem",
  // Terror
  "horror": "Terror",
  "terror": "Terror",
  // Colegial
  "school": "Colegial",
  "colegial": "Colegial",
  "school life": "Colegial",
  "high school": "Colegial",
};

/**
 * Normalize a single genre string to one of our allowed genres.
 * Returns the canonical genre or null if no match.
 */
export const normalizeGenre = (genre: string): AllowedGenre | null => {
  const key = genre.trim().toLowerCase();
  return GENRE_ALIAS_MAP[key] ?? null;
};

/**
 * Normalize an array of genres from any API source.
 * Filters to only our allowed genres, deduplicates.
 */
export const normalizeGenres = (genres: string[]): AllowedGenre[] => {
  const result = new Set<AllowedGenre>();
  for (const g of genres) {
    const normalized = normalizeGenre(g);
    if (normalized) result.add(normalized);
  }
  return Array.from(result);
};
