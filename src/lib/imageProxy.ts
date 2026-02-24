import { supabase } from "@/integrations/supabase/client";

/**
 * If the URL is HTTP (not HTTPS), proxy it through the edge function
 * to avoid mixed content blocking in the browser.
 */
export const getProxiedImageUrl = (url: string | null | undefined): string => {
  if (!url) return '';
  
  // Only proxy HTTP URLs (not HTTPS)
  if (url.startsWith('http://')) {
    const supabaseUrl = (supabase as any).supabaseUrl || "https://qbrclpovvhcdtkiygokh.supabase.co";
    return `${supabaseUrl}/functions/v1/image-proxy?url=${encodeURIComponent(url)}`;
  }
  
  return url;
};
