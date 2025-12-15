'use client'

interface RemainingCounterProps {
  remaining: number
}

export default function RemainingCounter({ remaining }: RemainingCounterProps) {
  const getEmoji = () => {
    if (remaining === 0) return '😴'
    if (remaining <= 3) return '😅'
    if (remaining <= 7) return '😊'
    return '🎉'
  }

  const getMessage = () => {
    if (remaining === 0) {
      return '¡Vuelve mañana por más stickers!'
    }
    return `Te quedan ${remaining} stickers hoy`
  }

  return (
    <div className={`remaining-counter ${remaining === 0 ? 'bg-yellow-100/80 text-yellow-700' : ''}`}>
      <span className="text-xl">{getEmoji()}</span>
      <span>{getMessage()}</span>
      <span className="text-xl">✂️</span>
    </div>
  )
}
