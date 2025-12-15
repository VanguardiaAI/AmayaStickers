import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Amaya Stickers 🎨',
  description: 'Transforma tus fotos en stickers mágicos',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className="font-nunito">
        {children}
      </body>
    </html>
  )
}
