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
  "Josei",
  "Recuentos de la Vida",
  "Deportes",
  "Sobrenatural",
  "Thriller",
  "Ecchi",
  "Harem",
  "Terror",
  "Colegial",
  "Isekai",
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
  // Ciencia Ficción + Mecha
  "sci-fi": "Ciencia Ficción",
  "sci fi": "Ciencia Ficción",
  "science fiction": "Ciencia Ficción",
  "ciencia ficción": "Ciencia Ficción",
  "ciencia ficcion": "Ciencia Ficción",
  "mecha": "Ciencia Ficción",
  // Seinen
  "seinen": "Seinen",
  // Shoujo
  "shoujo": "Shoujo",
  "shōjo": "Shoujo",
  "shojo": "Shoujo",
  "mahō shōjo": "Shoujo",
  "mahou shoujo": "Shoujo",
  "magical girl": "Shoujo",
  // Shounen
  "shounen": "Shounen",
  "shōnen": "Shounen",
  "shonen": "Shounen",
  // Josei
  "josei": "Josei",
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
  "mystery": "Thriller",
  "misterio": "Thriller",
  // Ecchi
  "ecchi": "Ecchi",
  // Harem
  "harem": "Harem",
  "reverse harem": "Harem",
  // Terror
  "horror": "Terror",
  "terror": "Terror",
  // Colegial
  "school": "Colegial",
  "colegial": "Colegial",
  "school life": "Colegial",
  "high school": "Colegial",
  // Isekai
  "isekai": "Isekai",
  // Extras que mapean a existentes
  "martial arts": "Acción",
  "artes marciales": "Acción",
  "military": "Acción",
  "militar": "Acción",
  "parody": "Comedia",
  "parodia": "Comedia",
  "gourmet": "Recuentos de la Vida",
  "kids": "Shounen",
  "space": "Ciencia Ficción",
  "espacio": "Ciencia Ficción",
  "vampire": "Sobrenatural",
  "vampiro": "Sobrenatural",
  "demon": "Sobrenatural",
  "demonio": "Sobrenatural",
  "demons": "Sobrenatural",
  "demonios": "Sobrenatural",
  "super power": "Sobrenatural",
  "superpoder": "Sobrenatural",
  "samurai": "Acción",
  "police": "Thriller",
  "policía": "Thriller",
  "detective": "Thriller",
  "game": "Aventura",
  "juego": "Aventura",
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
