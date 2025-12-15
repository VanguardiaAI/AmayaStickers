'use client'

import { useState, useRef, useEffect, KeyboardEvent, ClipboardEvent } from 'react'

interface PinInputProps {
  onComplete: (pin: string) => void
  isLoading?: boolean
  error?: string
}

export default function PinInput({ onComplete, isLoading, error }: PinInputProps) {
  const [pin, setPin] = useState<string[]>(Array(6).fill(''))
  const inputRefs = useRef<(HTMLInputElement | null)[]>([])

  // Enfocar el primer input al cargar
  useEffect(() => {
    inputRefs.current[0]?.focus()
  }, [])

  const handleChange = (index: number, value: string) => {
    // Solo aceptar números
    if (!/^\d*$/.test(value)) return

    const newPin = [...pin]
    newPin[index] = value.slice(-1) // Solo tomar el último dígito

    setPin(newPin)

    // Si escribió un número, avanzar al siguiente input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus()
    }

    // Si completó todos los dígitos, enviar
    const completePin = newPin.join('')
    if (completePin.length === 6 && newPin.every(d => d !== '')) {
      onComplete(completePin)
    }
  }

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    // Retroceder con backspace
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus()
    }
  }

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)

    if (pastedData) {
      const newPin = Array(6).fill('')
      pastedData.split('').forEach((digit, i) => {
        if (i < 6) newPin[i] = digit
      })
      setPin(newPin)

      if (pastedData.length === 6) {
        onComplete(pastedData)
      } else {
        inputRefs.current[pastedData.length]?.focus()
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="flex gap-2 sm:gap-3">
        {pin.map((digit, index) => (
          <input
            key={index}
            ref={el => { inputRefs.current[index] = el }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={e => handleChange(index, e.target.value)}
            onKeyDown={e => handleKeyDown(index, e)}
            onPaste={handlePaste}
            disabled={isLoading}
            className={`pin-input ${error ? 'border-red-400 shake' : ''}`}
            aria-label={`Dígito ${index + 1} del PIN`}
          />
        ))}
      </div>

      {error && (
        <p className="text-red-500 font-medium animate-pulse">
          {error}
        </p>
      )}

      {isLoading && (
        <div className="flex items-center gap-2 text-purple-500">
          <span className="scissors-spin text-2xl">✂️</span>
          <span>Verificando...</span>
        </div>
      )}
    </div>
  )
}
