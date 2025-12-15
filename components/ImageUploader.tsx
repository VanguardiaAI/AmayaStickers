'use client'

import { useState, useRef, DragEvent, ChangeEvent } from 'react'

interface ImageUploaderProps {
  onImageSelect: (file: File, preview: string) => void
  currentPreview?: string
  disabled?: boolean
}

const MAX_SIZE_MB = 10
const MAX_SIZE_BYTES = MAX_SIZE_MB * 1024 * 1024
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export default function ImageUploader({ onImageSelect, currentPreview, disabled }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return '¡Ups! Solo puedes subir fotos (JPG, PNG o WebP) 📸'
    }
    if (file.size > MAX_SIZE_BYTES) {
      return 'Esta foto es muy grande, prueba con otra más pequeña 📸'
    }
    return null
  }

  const processFile = (file: File) => {
    const validationError = validateFile(file)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    const reader = new FileReader()
    reader.onload = (e) => {
      const preview = e.target?.result as string
      onImageSelect(file, preview)
    }
    reader.readAsDataURL(file)
  }

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    if (disabled) return

    const files = e.dataTransfer.files
    if (files.length > 0) {
      processFile(files[0])
    }
  }

  const handleClick = () => {
    if (!disabled) {
      inputRef.current?.click()
    }
  }

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      processFile(files[0])
    }
  }

  return (
    <div className="w-full">
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`dropzone ${isDragging ? 'drag-over' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(',')}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        {currentPreview ? (
          <div className="flex flex-col items-center gap-4">
            <img
              src={currentPreview}
              alt="Tu foto"
              className="max-w-[200px] max-h-[200px] rounded-2xl shadow-lg object-contain"
            />
            <p className="text-purple-500 font-medium">
              ¡Foto lista! Toca para cambiarla 📷
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-8">
            <span className="text-6xl">📷</span>
            <div>
              <p className="text-lg font-semibold text-gray-700">
                Arrastra tu foto aquí
              </p>
              <p className="text-gray-500 mt-1">
                o toca para seleccionar
              </p>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              JPG, PNG o WebP • Máximo 10MB
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="error-message mt-4">
          {error}
        </div>
      )}
    </div>
  )
}
