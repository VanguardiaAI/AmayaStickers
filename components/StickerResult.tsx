'use client'

import { useState } from 'react'

interface StickerResultProps {
  imageUrl: string
  onNewSticker: () => void
}

export default function StickerResult({ imageUrl, onNewSticker }: StickerResultProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState(false)

  const handleDownload = async () => {
    setIsDownloading(true)
    setDownloadError(false)

    try {
      // Intentar descargar via fetch (puede fallar por CORS)
      const response = await fetch(imageUrl, { mode: 'cors' })

      if (!response.ok) {
        throw new Error('CORS blocked')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sticker-amaya-${Date.now()}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Error al descargar:', error)
      // Si CORS falla, abrir en nueva pestaña
      setDownloadError(true)
      window.open(imageUrl, '_blank')
    } finally {
      setIsDownloading(false)
    }
  }

  // Alternativa: abrir directamente en nueva pestaña
  const handleOpenInNewTab = () => {
    window.open(imageUrl, '_blank')
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-purple-600 mb-2">
          ¡Tu sticker está listo! 🎉
        </h2>
        <p className="text-gray-600">
          Descárgalo e imprímelo para recortarlo
        </p>
      </div>

      <div className="relative">
        <img
          src={imageUrl}
          alt="Tu sticker"
          className="max-w-[300px] max-h-[300px] rounded-2xl shadow-2xl object-contain bg-white p-2"
        />
        <div className="absolute -top-2 -right-2 text-3xl animate-bounce">
          ✂️
        </div>
      </div>

      {downloadError && (
        <p className="text-sm text-gray-500 text-center">
          Se abrió en una nueva pestaña. Mantén presionada la imagen para guardarla 📱
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        <button
          onClick={handleDownload}
          disabled={isDownloading}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          {isDownloading ? (
            <>
              <span className="scissors-spin">✂️</span>
              Descargando...
            </>
          ) : (
            <>
              <span>💾</span>
              Descargar Sticker
            </>
          )}
        </button>

        <button
          onClick={onNewSticker}
          className="btn-primary flex-1 bg-gradient-to-r from-purple-400 to-pink-400"
        >
          <span>🔄</span> Hacer Otro
        </button>
      </div>

      {/* Botón alternativo para móvil */}
      <button
        onClick={handleOpenInNewTab}
        className="text-purple-500 text-sm underline hover:text-purple-700"
      >
        ¿No descarga? Toca aquí para abrir la imagen
      </button>
    </div>
  )
}
