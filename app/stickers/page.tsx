'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import ImageUploader from '@/components/ImageUploader'
import StyleSelector, { StickerStyle } from '@/components/StyleSelector'
import StickerResult from '@/components/StickerResult'
import RemainingCounter from '@/components/RemainingCounter'

const DAILY_LIMIT = 15
const STORAGE_KEY = 'amaya_stickers_count'

interface StoredCount {
  date: string
  count: number
}

// Obtener fecha actual en formato YYYY-MM-DD
function getTodayDate(): string {
  return new Date().toISOString().split('T')[0]
}

// Obtener conteo del día
function getDailyCount(): number {
  if (typeof window === 'undefined') return 0

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return 0

    const data: StoredCount = JSON.parse(stored)
    if (data.date !== getTodayDate()) {
      // Es un nuevo día, resetear
      return 0
    }
    return data.count
  } catch {
    return 0
  }
}

// Guardar conteo del día
function saveDailyCount(count: number): void {
  if (typeof window === 'undefined') return

  const data: StoredCount = {
    date: getTodayDate(),
    count,
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export default function StickersPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Estado del flujo
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [selectedStyle, setSelectedStyle] = useState<StickerStyle | null>(null)
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null)
  const [dailyCount, setDailyCount] = useState(0)

  const remaining = DAILY_LIMIT - dailyCount
  const canGenerate = remaining > 0

  // Verificar autenticación al cargar
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch('/api/auth')
        const data = await response.json()

        if (!data.authenticated) {
          router.push('/')
          return
        }
      } catch (error) {
        console.error('Error verificando sesión:', error)
        router.push('/')
        return
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [router])

  // Cargar conteo diario al iniciar
  useEffect(() => {
    setDailyCount(getDailyCount())
  }, [])

  const handleImageSelect = (file: File, preview: string) => {
    setSelectedFile(file)
    setImagePreview(preview)
    setError(null)
    setResultImageUrl(null)
  }

  const handleStyleSelect = (style: StickerStyle) => {
    setSelectedStyle(style)
    setError(null)
  }

  const handleGenerate = async () => {
    if (!selectedFile || !selectedStyle || !canGenerate) return

    setIsGenerating(true)
    setError(null)

    try {
      // Paso 1: Crear la tarea
      const formData = new FormData()
      formData.append('image', selectedFile)
      formData.append('style', selectedStyle)

      const createResponse = await fetch('/api/generate', {
        method: 'POST',
        body: formData,
      })

      const createData = await createResponse.json()

      if (!createResponse.ok || !createData.success || !createData.taskId) {
        setError(createData.error || '¡Ups! El sticker no salió bien 😅 ¡Intenta de nuevo!')
        setIsGenerating(false)
        return
      }

      const taskId = createData.taskId

      // Paso 2: Polling para obtener el resultado
      const maxAttempts = 60 // 2 minutos máximo (2s entre intentos)
      let attempts = 0

      const pollForResult = async (): Promise<void> => {
        while (attempts < maxAttempts) {
          attempts++

          try {
            const statusResponse = await fetch(`/api/generate?taskId=${taskId}`)
            const statusData = await statusResponse.json()

            if (statusData.status === 'success' && statusData.imageUrl) {
              setResultImageUrl(statusData.imageUrl)
              // Incrementar contador
              const newCount = dailyCount + 1
              setDailyCount(newCount)
              saveDailyCount(newCount)
              setIsGenerating(false)
              return
            }

            if (statusData.status === 'fail') {
              setError(statusData.error || '¡Ups! El sticker no salió bien 😅 ¡Intenta de nuevo!')
              setIsGenerating(false)
              return
            }

            // Sigue esperando, esperar 2 segundos antes del siguiente intento
            await new Promise(resolve => setTimeout(resolve, 2000))
          } catch (pollError) {
            console.error('Error en polling:', pollError)
            // Continuar intentando
            await new Promise(resolve => setTimeout(resolve, 2000))
          }
        }

        // Si llegamos aquí, se agotaron los intentos
        setError('¡Ups! Tardó mucho tiempo 😅 ¡Intenta de nuevo!')
        setIsGenerating(false)
      }

      await pollForResult()

    } catch (error) {
      console.error('Error generando sticker:', error)
      setError('¡Ups! No puedo conectar 😅 ¡Intenta de nuevo!')
      setIsGenerating(false)
    }
  }

  const handleNewSticker = () => {
    setResultImageUrl(null)
    setSelectedFile(null)
    setImagePreview(null)
    setSelectedStyle(null)
    setError(null)
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' })
    } catch (error) {
      console.error('Error cerrando sesión:', error)
    }
    router.push('/')
  }

  if (isLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <span className="scissors-spin text-5xl block mb-4">✂️</span>
          <p className="text-purple-500 font-medium">Cargando tus stickers...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <header className="text-center mb-6">
          <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-500 bg-clip-text text-transparent">
            ¡Hola Amaya! 🎨
          </h1>
          <p className="text-gray-500 mt-2">
            Crea stickers increíbles de tus fotos
          </p>
        </header>

        {/* Contador de stickers restantes */}
        <div className="flex justify-center mb-6">
          <RemainingCounter remaining={remaining} />
        </div>

        {/* Contenido principal */}
        <div className="card">
          {resultImageUrl ? (
            // Mostrar resultado
            <StickerResult
              imageUrl={resultImageUrl}
              onNewSticker={handleNewSticker}
            />
          ) : (
            // Flujo de creación
            <div className="space-y-6">
              {/* Paso 1: Subir imagen */}
              <div>
                <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                  <span className="bg-pink-100 text-pink-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">1</span>
                  Sube tu foto
                </h2>
                <ImageUploader
                  onImageSelect={handleImageSelect}
                  currentPreview={imagePreview || undefined}
                  disabled={isGenerating || !canGenerate}
                />
              </div>

              {/* Paso 2: Seleccionar estilo */}
              {imagePreview && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <h2 className="text-lg font-bold text-gray-700 mb-3 flex items-center gap-2">
                    <span className="bg-purple-100 text-purple-600 w-8 h-8 rounded-full flex items-center justify-center text-sm">2</span>
                    Elige el estilo
                  </h2>
                  <StyleSelector
                    selectedStyle={selectedStyle}
                    onSelectStyle={handleStyleSelect}
                    disabled={isGenerating || !canGenerate}
                  />
                </div>
              )}

              {/* Mensaje de error */}
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              {/* Mensaje de límite alcanzado */}
              {!canGenerate && (
                <div className="bg-yellow-100/80 text-yellow-700 p-4 rounded-2xl text-center font-medium">
                  <span className="text-2xl block mb-2">😴</span>
                  ¡Vuelve mañana por más stickers!
                </div>
              )}

              {/* Botón de generar */}
              {imagePreview && selectedStyle && canGenerate && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="btn-primary w-full text-xl flex items-center justify-center gap-3"
                  >
                    {isGenerating ? (
                      <>
                        <span className="scissors-spin text-2xl">✂️</span>
                        Creando tu sticker...
                      </>
                    ) : (
                      <>
                        <span className="text-2xl">✨</span>
                        ¡Crear mi Sticker!
                        <span className="text-2xl">✨</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Botón de cerrar sesión */}
        <div className="mt-6 text-center">
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium transition-colors"
          >
            Cerrar sesión 👋
          </button>
        </div>
      </div>
    </main>
  )
}
