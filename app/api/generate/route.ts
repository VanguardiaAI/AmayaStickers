import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'amaya_session'
const KIE_API_URL = 'https://api.kie.ai/api/v1/jobs/createTask'
const KIE_STATUS_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo'

// Mapeo de estilos a prompts - más específicos para generar stickers
const STYLE_PROMPTS: Record<string, string> = {
  cartoon: 'Transform this image into a cute cartoon sticker. Remove the background completely and replace it with solid white. Apply a fun cartoon/illustrated style with bold outlines and vibrant colors. Add a dashed cutting line border around the sticker edge. Make it look like a printable die-cut sticker.',
  realistic: 'Convert this image into a realistic photo sticker. Remove the background completely and replace it with solid white. Keep the realistic look but enhance colors slightly. Add a dashed cutting line border around the sticker edge. Make it look like a printable die-cut sticker.',
  anime: 'Transform this image into an anime/manga style sticker. Remove the background completely and replace it with solid white. Apply Japanese anime art style with big expressive features and clean lines. Add a dashed cutting line border around the sticker edge. Make it look like a printable die-cut sticker.',
}

// Verificar autenticación
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)
  return !!session?.value
}

// Subir imagen a catbox.moe (servicio gratuito, no requiere API key)
async function uploadToCatbox(imageBuffer: ArrayBuffer, filename: string, mimeType: string): Promise<string | null> {
  try {
    const formData = new FormData()
    formData.append('reqtype', 'fileupload')
    const blob = new Blob([imageBuffer], { type: mimeType })
    formData.append('fileToUpload', blob, filename)

    const response = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const url = await response.text()
      // catbox.moe devuelve directamente la URL como texto
      if (url.startsWith('https://')) {
        console.log('Imagen subida a catbox:', url)
        return url.trim()
      }
    }

    console.error('Error catbox:', await response.text())
    return null
  } catch (error) {
    console.error('Error subiendo a catbox:', error)
    return null
  }
}

// GET: Consultar estado de una tarea
export async function GET(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: '¡Necesitas iniciar sesión! 🔑' }, { status: 401 })
    }

    const apiKey = process.env.KIE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API Key no configurada' }, { status: 500 })
    }

    const taskId = request.nextUrl.searchParams.get('taskId')
    if (!taskId) {
      return NextResponse.json({ error: 'Falta taskId' }, { status: 400 })
    }

    const response = await fetch(`${KIE_STATUS_URL}?taskId=${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    })

    const responseText = await response.text()
    console.log('Status check response:', response.status, responseText.substring(0, 200))

    if (!response.ok) {
      return NextResponse.json({
        status: 'error',
        error: `Error ${response.status}: ${responseText.substring(0, 100)}`
      }, { status: 500 })
    }

    let data
    try {
      data = JSON.parse(responseText)
    } catch {
      return NextResponse.json({ status: 'error', error: 'Respuesta inválida' }, { status: 500 })
    }

    if (data.code !== 200) {
      return NextResponse.json({ status: 'error', error: data.msg || 'Error de Kie.ai' }, { status: 500 })
    }

    const state = data.data?.state

    if (state === 'success') {
      const resultJson = JSON.parse(data.data.resultJson || '{}')
      const imageUrl = resultJson.resultUrls?.[0]
      return NextResponse.json({ status: 'success', imageUrl })
    }

    if (state === 'fail') {
      return NextResponse.json({
        status: 'fail',
        error: data.data?.failMsg || '¡Ups! El sticker no salió bien 😅'
      })
    }

    return NextResponse.json({ status: 'waiting' })

  } catch (error) {
    console.error('GET error:', error)
    return NextResponse.json({ status: 'error', error: String(error) }, { status: 500 })
  }
}

// POST: Crear nueva tarea de generación
export async function POST(request: NextRequest) {
  try {
    // 1. Verificar autenticación
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // 2. Verificar API key
    const apiKey = process.env.KIE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'KIE_API_KEY no configurada en Vercel' }, { status: 500 })
    }

    // 3. Obtener datos del formulario
    let formData: FormData
    try {
      formData = await request.formData()
    } catch (e) {
      return NextResponse.json({ error: `Error leyendo formulario: ${e}` }, { status: 400 })
    }

    const image = formData.get('image') as File
    const style = formData.get('style') as string

    if (!image) {
      return NextResponse.json({ error: 'No se recibió imagen' }, { status: 400 })
    }

    if (!style || !STYLE_PROMPTS[style]) {
      return NextResponse.json({ error: `Estilo inválido: ${style}` }, { status: 400 })
    }

    // 4. Validar imagen
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(image.type)) {
      return NextResponse.json({ error: `Tipo no válido: ${image.type}` }, { status: 400 })
    }

    const maxSize = 4 * 1024 * 1024
    if (image.size > maxSize) {
      return NextResponse.json({ error: `Imagen muy grande: ${(image.size/1024/1024).toFixed(1)}MB` }, { status: 400 })
    }

    console.log('Procesando imagen:', image.name, image.size, image.type)

    // 5. Subir imagen a catbox.moe para obtener URL pública
    const imageBuffer = await image.arrayBuffer()
    const extension = image.type.split('/')[1] || 'jpg'
    const filename = `sticker_${Date.now()}.${extension}`

    const publicUrl = await uploadToCatbox(imageBuffer, filename, image.type)

    if (!publicUrl) {
      return NextResponse.json({ error: 'No se pudo subir la imagen al servidor de imágenes' }, { status: 500 })
    }

    // 6. Crear tarea en Kie.ai
    console.log('Enviando a Kie.ai con URL:', publicUrl)

    const kieResponse = await fetch(KIE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/nano-banana-edit',
        input: {
          prompt: STYLE_PROMPTS[style],
          image_urls: [publicUrl],
          output_format: 'png',
          image_size: '1:1',
        },
      }),
    })

    const kieText = await kieResponse.text()
    console.log('Respuesta Kie.ai:', kieResponse.status, kieText.substring(0, 300))

    if (!kieResponse.ok) {
      return NextResponse.json({
        error: `Kie.ai error ${kieResponse.status}: ${kieText.substring(0, 100)}`
      }, { status: 500 })
    }

    let kieData
    try {
      kieData = JSON.parse(kieText)
    } catch {
      return NextResponse.json({ error: `Respuesta inválida de Kie.ai: ${kieText.substring(0, 100)}` }, { status: 500 })
    }

    if (kieData.code !== 200 || !kieData.data?.taskId) {
      return NextResponse.json({
        error: `Kie.ai rechazó: ${kieData.msg || JSON.stringify(kieData).substring(0, 100)}`
      }, { status: 500 })
    }

    // 7. Éxito - devolver taskId
    return NextResponse.json({
      success: true,
      taskId: kieData.data.taskId,
    })

  } catch (error) {
    console.error('POST error:', error)
    return NextResponse.json({ error: `Error del servidor: ${error}` }, { status: 500 })
  }
}
