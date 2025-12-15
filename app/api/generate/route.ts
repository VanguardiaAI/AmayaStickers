import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

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

// GET: Consultar estado de una tarea
export async function GET(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: '¡Necesitas iniciar sesión! 🔑' }, { status: 401 })
    }

    const apiKey = process.env.KIE_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: '¡Ups! Algo salió mal 😅' }, { status: 500 })
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

    if (!response.ok) {
      return NextResponse.json({ error: '¡Ups! Error consultando estado 😅' }, { status: 500 })
    }

    const data = await response.json()

    if (data.code !== 200) {
      return NextResponse.json({ error: data.msg || 'Error desconocido' }, { status: 500 })
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

    // Sigue en proceso
    return NextResponse.json({ status: 'waiting' })

  } catch (error) {
    console.error('Error consultando tarea:', error)
    return NextResponse.json({ error: '¡Ups! Algo salió mal 😅' }, { status: 500 })
  }
}

// POST: Crear nueva tarea de generación
export async function POST(request: NextRequest) {
  try {
    if (!await isAuthenticated()) {
      return NextResponse.json({ error: '¡Necesitas iniciar sesión! 🔑' }, { status: 401 })
    }

    const apiKey = process.env.KIE_API_KEY
    if (!apiKey) {
      console.error('KIE_API_KEY no está configurado')
      return NextResponse.json({ error: '¡Ups! Algo salió mal con la configuración 😅' }, { status: 500 })
    }

    const formData = await request.formData()
    const image = formData.get('image') as File
    const style = formData.get('style') as string

    if (!image) {
      return NextResponse.json({ error: '¡Necesitas subir una foto! 📷' }, { status: 400 })
    }

    if (!style || !STYLE_PROMPTS[style]) {
      return NextResponse.json({ error: '¡Elige un estilo para tu sticker! 🎨' }, { status: 400 })
    }

    const validTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!validTypes.includes(image.type)) {
      return NextResponse.json({ error: '¡Ups! Solo puedes subir fotos (JPG, PNG o WebP) 📸' }, { status: 400 })
    }

    // Límite de 4MB para mantenernos dentro del límite de Vercel (4.5MB)
    const maxSize = 4 * 1024 * 1024
    if (image.size > maxSize) {
      return NextResponse.json({ error: 'Esta foto es muy grande, prueba con otra más pequeña 📸' }, { status: 400 })
    }

    // Convertir imagen a base64 data URL
    const imageBuffer = await image.arrayBuffer()
    const base64Image = Buffer.from(imageBuffer).toString('base64')
    const dataUrl = `data:${image.type};base64,${base64Image}`

    console.log('Enviando imagen a Kie.ai, tamaño:', image.size, 'tipo:', image.type)

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
          image_urls: [dataUrl],
          output_format: 'png',
          image_size: '1:1',
        },
      }),
    })

    const responseText = await createTaskResponse.text()
    console.log('Respuesta de Kie.ai:', createTaskResponse.status, responseText)

    if (!createTaskResponse.ok) {
      if (createTaskResponse.status === 401) {
        return NextResponse.json({ error: '¡Ups! Hay un problema con la API Key 😅' }, { status: 500 })
      }
      if (createTaskResponse.status === 402) {
        return NextResponse.json({ error: '¡Ups! Se acabaron los créditos de Kie.ai 😅' }, { status: 500 })
      }
      if (createTaskResponse.status === 429) {
        return NextResponse.json({ error: '¡Espera un momento! Hay muchas solicitudes 😅' }, { status: 429 })
      }
      return NextResponse.json({ error: '¡Ups! El sticker no salió bien 😅 ¡Intenta de nuevo!' }, { status: 500 })
    }

    let createTaskData
    try {
      createTaskData = JSON.parse(responseText)
    } catch {
      console.error('Error parseando respuesta:', responseText)
      return NextResponse.json({ error: '¡Ups! Respuesta inválida de Kie.ai 😅' }, { status: 500 })
    }

    if (createTaskData.code !== 200 || !createTaskData.data?.taskId) {
      console.error('Respuesta inesperada de Kie.ai:', createTaskData)
      return NextResponse.json({ error: '¡Ups! El sticker no salió bien 😅 ¡Intenta de nuevo!' }, { status: 500 })
    }

    // Devolver el taskId para que el cliente haga polling
    return NextResponse.json({
      success: true,
      taskId: createTaskData.data.taskId,
    })

  } catch (error) {
    console.error('Error generando sticker:', error)
    return NextResponse.json({ error: '¡Ups! El sticker no salió bien 😅 ¡Intenta de nuevo!' }, { status: 500 })
  }
}
