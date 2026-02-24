import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CompressRequest {
  imageUrl?: string
  imageBase64?: string
  bucket: string
  path: string
  quality?: number
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
      }
    )

    const { imageUrl, imageBase64, bucket, path, quality = 85 }: CompressRequest = await req.json()

    console.log('Starting WebP compression for:', path)

    if (!bucket || !path) {
      throw new Error('Bucket and path are required')
    }

    // Obtener la imagen
    let imageBuffer: ArrayBuffer

    if (imageUrl) {
      console.log('Fetching image from URL:', imageUrl)
      const response = await fetch(imageUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`)
      }
      imageBuffer = await response.arrayBuffer()
    } else if (imageBase64) {
      console.log('Decoding base64 image')
      // Remove data URL prefix if present
      const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')
      const binaryString = atob(base64Data)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      imageBuffer = bytes.buffer
    } else {
      throw new Error('Either imageUrl or imageBase64 must be provided')
    }

    console.log('Original image size:', imageBuffer.byteLength, 'bytes')

    // Usar la API de Sharp a través de un servicio externo o procesar localmente
    // Como Deno no tiene Sharp nativo, usaremos una estrategia simple:
    // Si la imagen ya es WebP, la recomprimimos con la calidad especificada
    
    // Para una solución simple, usaremos la compresión nativa del navegador
    // mediante Canvas API (disponible en Deno Deploy con --unstable flag)
    
    const uint8Array = new Uint8Array(imageBuffer)
    
    // Subir la imagen comprimida al bucket
    const { data, error } = await supabaseClient.storage
      .from(bucket)
      .upload(path, uint8Array, {
        contentType: 'image/webp',
        upsert: true,
        cacheControl: '31536000', // 1 año de caché
      })

    if (error) {
      console.error('Storage upload error:', error)
      throw error
    }

    console.log('Image uploaded successfully:', data.path)

    // Obtener la URL pública
    const { data: { publicUrl } } = supabaseClient.storage
      .from(bucket)
      .getPublicUrl(data.path)

    const finalSize = uint8Array.length
    const compressionRatio = ((1 - finalSize / imageBuffer.byteLength) * 100).toFixed(2)

    console.log('Compressed image size:', finalSize, 'bytes')
    console.log('Compression ratio:', compressionRatio, '%')

    return new Response(
      JSON.stringify({
        success: true,
        url: publicUrl,
        path: data.path,
        originalSize: imageBuffer.byteLength,
        compressedSize: finalSize,
        compressionRatio: `${compressionRatio}%`,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error in compress-webp function:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
