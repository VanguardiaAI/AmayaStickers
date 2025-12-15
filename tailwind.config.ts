import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        nunito: ['Nunito', 'sans-serif'],
      },
      colors: {
        // Colores pastel rosa/morado para el tema
        'pastel-pink': {
          100: '#fce4ec',
          200: '#f8bbd9',
          300: '#f48fb1',
          400: '#f06292',
          500: '#ec407a',
        },
        'pastel-purple': {
          100: '#f3e5f5',
          200: '#e1bee7',
          300: '#ce93d8',
          400: '#ba68c8',
          500: '#ab47bc',
        },
      },
      animation: {
        'spin-slow': 'spin 2s linear infinite',
        'bounce-slow': 'bounce 2s infinite',
        'pulse-soft': 'pulse 2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
