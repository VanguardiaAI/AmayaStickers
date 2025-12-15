'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import PinInput from '@/components/PinInput'

export default function LoginPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verificar si ya está autenticado
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth')
        const data = await response.json()

        if (data.authenticated) {
          router.push('/stickers')
          return
        }
      } catch (error) {
        console.error('Error verificando sesión:', error)
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  const handlePinComplete = async (pin: string) => {
    setIsVerifying(true)
    setError(null)

    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ pin }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        router.push('/stickers')
      } else {
        setError(data.error || '¡PIN incorrecto! Intenta de nuevo 🔑')
      }
    } catch (error) {
      console.error('Error de conexión:', error)
      setError('¡Ups! No puedo conectar 😅')
    } finally {
      setIsVerifying(false)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <span className="scissors-spin text-5xl block mb-4">✂️</span>
          <p className="text-purple-500 font-medium">Cargando...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="card w-full max-w-md text-center">
        {/* Logo/Título */}
        <div className="mb-8">
          <h1 className="text-4xl sm:text-5xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent mb-2">
            Amaya Stickers
          </h1>
          <p className="text-gray-500 text-lg">
            🎨 Transforma tus fotos en stickers 🎨
          </p>
        </div>

        {/* Icono decorativo */}
        <div className="text-6xl mb-6">
          🔐
        </div>

        {/* Instrucciones */}
        <p className="text-gray-600 mb-6 font-medium">
          Escribe tu PIN secreto para entrar
        </p>

        {/* Input de PIN */}
        <PinInput
          onComplete={handlePinComplete}
          isLoading={isVerifying}
          error={error || undefined}
        />

        {/* Nota decorativa */}
        <div className="mt-8 pt-6 border-t border-pink-100">
          <p className="text-sm text-gray-400 flex items-center justify-center gap-2">
            <span>✨</span>
            Hecho con amor para Amaya
            <span>✨</span>
          </p>
        </div>
      </div>
    </main>
  )
}
