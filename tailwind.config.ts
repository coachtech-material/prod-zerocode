import type { Config } from 'tailwindcss'
import typography from '@tailwindcss/typography'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: '#1F6FEB',
        'brand-sky': '#58A6FF',
        'brand-yellow': '#F2B700',
        'brand-blue': '#0F2B44',
        surface: '#0F2B44',
        'surface-strong': '#103A5D',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1.5rem',
      },
    },
  },
  plugins: [typography],
}

export default config
