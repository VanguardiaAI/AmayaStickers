'use client'

export type StickerStyle = 'cartoon' | 'realistic' | 'anime'

interface StyleOption {
  id: StickerStyle
  name: string
  emoji: string
  description: string
}

const STYLES: StyleOption[] = [
  {
    id: 'cartoon',
    name: '✨ Mágico',
    emoji: '✨',
    description: 'Estilo caricatura',
  },
  {
    id: 'realistic',
    name: '📸 Como Foto',
    emoji: '📸',
    description: 'Estilo realista',
  },
  {
    id: 'anime',
    name: '🎌 Anime',
    emoji: '🎌',
    description: 'Estilo anime',
  },
]

interface StyleSelectorProps {
  selectedStyle: StickerStyle | null
  onSelectStyle: (style: StickerStyle) => void
  disabled?: boolean
}

export default function StyleSelector({ selectedStyle, onSelectStyle, disabled }: StyleSelectorProps) {
  return (
    <div className="w-full">
      <h3 className="text-lg font-bold text-gray-700 mb-4 text-center">
        ¿Qué estilo quieres? 🎨
      </h3>

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        {STYLES.map((style) => (
          <button
            key={style.id}
            onClick={() => onSelectStyle(style.id)}
            disabled={disabled}
            className={`style-btn ${selectedStyle === style.id ? 'selected' : ''} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <span className="text-3xl sm:text-4xl mb-2">{style.emoji}</span>
            <span className="font-bold text-sm sm:text-base text-gray-700">
              {style.name.replace(style.emoji, '').trim()}
            </span>
            <span className="text-xs text-gray-500 hidden sm:block">
              {style.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
