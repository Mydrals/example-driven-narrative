import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.79.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/xml; charset=utf-8',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch all animes
    const { data: animes, error: animesError } = await supabaseClient
      .from('animes')
      .select('slug, created_at')
      .order('created_at', { ascending: false });

    if (animesError) throw animesError;

    // Fetch all episodes with their anime slugs
    const { data: episodes, error: episodesError } = await supabaseClient
      .from('episodes')
      .select(`
        id,
        created_at,
        animes!inner (
          slug
        )
      `)
      .order('created_at', { ascending: false });

    if (episodesError) throw episodesError;

    // Generate sitemap XML
    const baseUrl = 'https://nagaro.net';
    const currentDate = new Date().toISOString().split('T')[0];

    let sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n';
    sitemap += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';

    // Homepage
    sitemap += '  <url>\n';
    sitemap += `    <loc>${baseUrl}/</loc>\n`;
    sitemap += `    <lastmod>${currentDate}</lastmod>\n`;
    sitemap += '    <changefreq>daily</changefreq>\n';
    sitemap += '    <priority>1.0</priority>\n';
    sitemap += '  </url>\n';

    // Anime series pages
    if (animes) {
      for (const anime of animes) {
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/series/${anime.slug}</loc>\n`;
        sitemap += `    <lastmod>${anime.created_at.split('T')[0]}</lastmod>\n`;
        sitemap += '    <changefreq>weekly</changefreq>\n';
        sitemap += '    <priority>0.9</priority>\n';
        sitemap += '  </url>\n';
      }
    }

    // Episode pages
    if (episodes) {
      for (const episode of episodes) {
        const animeSlug = (episode.animes as any).slug;
        sitemap += '  <url>\n';
        sitemap += `    <loc>${baseUrl}/series/${animeSlug}/episode/${episode.id}</loc>\n`;
        sitemap += `    <lastmod>${episode.created_at.split('T')[0]}</lastmod>\n`;
        sitemap += '    <changefreq>monthly</changefreq>\n';
        sitemap += '    <priority>0.8</priority>\n';
        sitemap += '  </url>\n';
      }
    }

    sitemap += '</urlset>';

    return new Response(sitemap, {
      headers: corsHeaders,
      status: 200,
    });
  } catch (error) {
    console.error('Error generating sitemap:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
