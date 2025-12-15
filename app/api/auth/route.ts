import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

const COOKIE_NAME = 'amaya_session'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 días en segundos

export async function POST(request: NextRequest) {
  try {
    const { pin } = await request.json()

    // Validar que el PIN tenga 6 dígitos
    if (!pin || !/^\d{6}$/.test(pin)) {
      return NextResponse.json(
        { error: '¡El PIN debe tener 6 números! 🔢' },
        { status: 400 }
      )
    }

    const correctPin = process.env.AMAYA_PIN

    if (!correctPin) {
      console.error('AMAYA_PIN no está configurado')
      return NextResponse.json(
        { error: '¡Ups! Algo salió mal 😅' },
        { status: 500 }
      )
    }

    // Verificar el PIN
    if (pin !== correctPin) {
      return NextResponse.json(
        { error: '¡PIN incorrecto! Intenta de nuevo 🔑' },
        { status: 401 }
      )
    }

    // Crear token de sesión simple (en producción usar algo más seguro)
    const sessionToken = Buffer.from(`amaya_${Date.now()}_${Math.random()}`).toString('base64')

    // Configurar la cookie de sesión
    const cookieStore = await cookies()
    cookieStore.set(COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en autenticación:', error)
    return NextResponse.json(
      { error: '¡Ups! Algo salió mal 😅' },
      { status: 500 }
    )
  }
}

// Verificar si hay sesión activa
export async function GET() {
  try {
    const cookieStore = await cookies()
    const session = cookieStore.get(COOKIE_NAME)

    if (session?.value) {
      return NextResponse.json({ authenticated: true })
    }

    return NextResponse.json({ authenticated: false })
  } catch (error) {
    console.error('Error verificando sesión:', error)
    return NextResponse.json({ authenticated: false })
  }
}

// Cerrar sesión
export async function DELETE() {
  try {
    const cookieStore = await cookies()
    cookieStore.delete(COOKIE_NAME)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error cerrando sesión:', error)
    return NextResponse.json(
      { error: '¡Ups! Algo salió mal 😅' },
      { status: 500 }
    )
  }
}
