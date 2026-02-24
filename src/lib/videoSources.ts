export interface VideoSource {
  title: string;
  url: string;
  language?: "es" | "ja" | "";
}

export const VIDEO_LANGUAGES = [
  { value: "", label: "Sin especificar", short: "" },
  { value: "es", label: "Latino", short: "Lat" },
  { value: "ja", label: "Subtitulado", short: "Sub" },
] as const;

export function getLanguageShortLabel(lang?: string): string {
  if (!lang) return "";
  const found = VIDEO_LANGUAGES.find(l => l.value === lang);
  return found ? found.short : "";
}

export function getLanguageLabel(lang?: string): string {
  if (!lang) return "";
  const found = VIDEO_LANGUAGES.find(l => l.value === lang);
  return found ? found.label : "";
}

/**
 * Parse the video_url field which can be:
 * - A plain URL string (backward compatible single source)
 * - A JSON array of VideoSource objects
 */
export function parseVideoSources(videoUrl: string | null | undefined): VideoSource[] {
  if (!videoUrl) return [];
  
  const trimmed = videoUrl.trim();
  if (!trimmed) return [];
  
  // Try parsing as JSON array
  if (trimmed.startsWith("[")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((item: any) => ({
          title: item.title || "Video",
          url: item.url || "",
          language: item.language || "",
        })).filter((s: VideoSource) => s.url);
      }
    } catch {
      // Not valid JSON, treat as plain URL
    }
  }
  
  // Plain URL string - single source
  return [{ title: "Video", url: trimmed, language: "" }];
}

/**
 * Serialize video sources back to the video_url field.
 * If there's only one source with default title and no language, store as plain URL for backward compatibility.
 */
export function serializeVideoSources(sources: VideoSource[]): string {
  const validSources = sources.filter(s => s.url.trim());
  if (validSources.length === 0) return "";
  if (validSources.length === 1 && validSources[0].title === "Video" && !validSources[0].language) {
    return validSources[0].url;
  }
  return JSON.stringify(validSources);
}

/**
 * Check if a URL is a direct video file that our custom player can handle.
 */
export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  const lower = url.toLowerCase();
  
  const pathOnly = lower.split("?")[0].split("#")[0];
  
  const directExtensions = [".m3u8", ".mp4", ".webm", ".ogg", ".mov", ".avi", ".mp3"];
  
  if (directExtensions.some(ext => pathOnly.endsWith(ext))) {
    return true;
  }
  
  if (directExtensions.some(ext => lower.includes(ext))) {
    return true;
  }
  
  return false;
}
