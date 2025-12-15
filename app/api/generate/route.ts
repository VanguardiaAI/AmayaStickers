import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

// Configuración para Vercel - extender timeout y tamaño del body
export const maxDuration = 60 // 60 segundos máximo (requiere plan Pro para más)
export const dynamic = 'force-dynamic'

const COOKIE_NAME = 'amaya_session'
const KIE_API_URL = 'https://api.kie.ai/api/v1/jobs/createTask'
const KIE_STATUS_URL = 'https://api.kie.ai/api/v1/jobs/recordInfo'

// Mapeo de estilos a prompts
const STYLE_PROMPTS: Record<string, string> = {
  cartoon: 'Generate a sticker with white background in cartoon style, with a dashed cut line around the sticker edge',
  realistic: 'Generate a sticker with white background in realistic style, with a dashed cut line around the sticker edge',
  anime: 'Generate a sticker with white background in anime style, with a dashed cut line around the sticker edge',
}

// Verificar autenticación
async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies()
  const session = cookieStore.get(COOKIE_NAME)
  return !!session?.value
}

// Esperar un tiempo determinado
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

// Subir imagen a un servicio temporal y obtener URL pública
async function uploadImageToTempHost(imageBuffer: Buffer, filename: string, mimeType: string): Promise<string | null> {
  try {
    // Convertir Buffer a Uint8Array para compatibilidad con Blob
    const uint8Array = new Uint8Array(imageBuffer)

    // Usar file.io como servicio de hosting temporal (la imagen expira después de una descarga)
    const formData = new FormData()
    const blob = new Blob([uint8Array], { type: mimeType })
    formData.append('file', blob, filename)

    const response = await fetch('https://file.io', {
      method: 'POST',
      body: formData,
    })

    if (response.ok) {
      const data = await response.json()
      if (data.success && data.link) {
        return data.link
      }
    }

    // Fallback: intentar con tmpfiles.org
    const tmpFormData = new FormData()
    tmpFormData.append('file', blob, filename)

    const tmpResponse = await fetch('https://tmpfiles.org/api/v1/upload', {
      method: 'POST',
      body: tmpFormData,
    })

    if (tmpResponse.ok) {
      const tmpData = await tmpResponse.json()
      if (tmpData.status === 'success' && tmpData.data?.url) {
        // tmpfiles.org devuelve URLs como https://tmpfiles.org/123456/imagen.png
        // pero la URL directa es https://tmpfiles.org/dl/123456/imagen.png
        return tmpData.data.url.replace('tmpfiles.org/', 'tmpfiles.org/dl/')
      }
    }

    return null
  } catch (error) {
    console.error('Error subiendo imagen a host temporal:', error)
    return null
  }
}

// Consultar estado de la tarea
async function checkTaskStatus(taskId: string, apiKey: string): Promise<{ success: boolean; imageUrl?: string; error?: string }> {
  const maxAttempts = 25 // Máximo 25 intentos (50 segundos con 2s de espera)

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const response = await fetch(`${KIE_STATUS_URL}?taskId=${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      if (data.code !== 200) {
        throw new Error(data.msg || 'Error desconocido')
      }

      const state = data.data?.state

      if (state === 'success') {
        // Parsear el resultado
        const resultJson = JSON.parse(data.data.resultJson || '{}')
        const imageUrl = resultJson.resultUrls?.[0]

        if (imageUrl) {
          return { success: true, imageUrl }
        } else {
          return { success: false, error: 'No se generó imagen' }
        }
      }

      if (state === 'fail') {
        return {
          success: false,
          error: data.data?.failMsg || '¡Ups! El sticker no salió bien 😅 ¡Intenta de nuevo!'
        }
      }

      // Si está en "waiting", seguir esperando
      await delay(2000) // Esperar 2 segundos entre intentos
    } catch (error) {
      console.error('Error verificando estado:', error)
      // Continuar intentando
      await delay(2000)
    }
  }

  return { success: false, error: '¡Ups! Tardó mucho tiempo 😅 ¡Intenta de nuevo!' }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    if (!await isAuthenticated()) {
      return NextResponse.json(
        { error: '¡Necesitas iniciar sesión! 🔑' },
        { status: 401 }
      )
    }

    // Obtener API key
    const apiKey = process.env.KIE_API_KEY
    if (!apiKey) {
      console.error('KIE_API_KEY no está configurado')
      return NextResponse.json(
        { error: '¡Ups! Algo salió mal con la configuración 😅' },
        { status: 500 }
      )
    }

    // Obtener datos del formulario
    const formData = await request.formData()
    const image = formData.get('image') as File
    const style = formData.get('style') as string

    // Validaciones
    if (!image) {
      return NextResponse.json(
        { error: '¡Necesitas subir una foto! 📷' },
        { status: 400 }
      )
    }

    if (!style || !STYLE_PROMPTS[style]) {
      return NextResponse.json(
        { error: '¡Elige un estilo para tu sticker! 🎨' },
        { status: 400 }
      )
    }

    // Validar tipo de imagen
    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(image.type)) {
      return NextResponse.json(
        { error: '¡Ups! Solo puedes subir fotos (JPG, PNG o WebP) 📸' },
        { status: 400 }
      )
    }

    // Validar tamaño (4MB para evitar problemas con el límite de Vercel)
    const maxSize = 4 * 1024 * 1024
    if (image.size > maxSize) {
      return NextResponse.json(
        { error: 'Esta foto es muy grande, prueba con otra más pequeña 📸' },
        { status: 400 }
      )
    }

    // Convertir imagen a buffer
    const imageBuffer = Buffer.from(await image.arrayBuffer())

    // Subir imagen a servicio temporal para obtener URL pública
    const extension = image.type.split('/')[1] || 'png'
    const tempFilename = `sticker-${Date.now()}.${extension}`
    const publicImageUrl = await uploadImageToTempHost(imageBuffer, tempFilename, image.type)

    if (!publicImageUrl) {
      console.error('No se pudo subir la imagen a un host temporal')
      return NextResponse.json(
        { error: '¡Ups! No pudimos procesar la foto 😅 ¡Intenta de nuevo!' },
        { status: 500 }
      )
    }

    console.log('Imagen subida a:', publicImageUrl)

    // Crear tarea en Kie.ai
    const createTaskResponse = await fetch(KIE_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/nano-banana-edit',
        input: {
          prompt: STYLE_PROMPTS[style],
          image_urls: [publicImageUrl],
          output_format: 'png',
          image_size: '1:1',
        },
      }),
    })

    if (!createTaskResponse.ok) {
      const errorText = await createTaskResponse.text()
      console.error('Error creando tarea en Kie.ai:', createTaskResponse.status, errorText)

      // Manejar errores específicos de la API
      if (createTaskResponse.status === 401) {
        return NextResponse.json(
          { error: '¡Ups! Hay un problema con la configuración 😅' },
          { status: 500 }
        )
      }
      if (createTaskResponse.status === 402) {
        return NextResponse.json(
          { error: '¡Ups! Se acabaron los créditos 😅' },
          { status: 500 }
        )
      }
      if (createTaskResponse.status === 429) {
        return NextResponse.json(
          { error: '¡Espera un momento! Hay muchas solicitudes 😅' },
          { status: 429 }
        )
      }

      return NextResponse.json(
        { error: '¡Ups! El sticker no salió bien 😅 ¡Intenta de nuevo!' },
        { status: 500 }
      )
    }

    const createTaskData = await createTaskResponse.json()
    console.log('Respuesta de Kie.ai:', createTaskData)

    if (createTaskData.code !== 200 || !createTaskData.data?.taskId) {
      console.error('Respuesta inesperada de Kie.ai:', createTaskData)
      return NextResponse.json(
        { error: '¡Ups! El sticker no salió bien 😅 ¡Intenta de nuevo!' },
        { status: 500 }
      )
    }

    // Esperar y verificar el resultado
    const taskId = createTaskData.data.taskId
    console.log('Task ID:', taskId)

    const result = await checkTaskStatus(taskId, apiKey)

    if (result.success && result.imageUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: result.imageUrl,
      })
    } else {
      return NextResponse.json(
        { error: result.error || '¡Ups! El sticker no salió bien 😅 ¡Intenta de nuevo!' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error generando sticker:', error)
    return NextResponse.json(
      { error: '¡Ups! El sticker no salió bien 😅 ¡Intenta de nuevo!' },
      { status: 500 }
    )
  }
}
