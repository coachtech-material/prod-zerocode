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
        brand: '#0281CA',
        'brand-sky': '#7DD1FD',
        'brand-yellow': '#FFFF55',
        'brand-blue': '#1E4B9E',
        surface: '#F3F9FF',
        'surface-strong': '#E4F4FF',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
      },
    },
  },
  plugins: [typography],
}

export default config
