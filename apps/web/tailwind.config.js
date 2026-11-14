/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // GreenPay 2.0 Core Palette
        gp: {
          dark: '#041B15',        // Dark background
          forest: '#062B20',      // Deep forest green
          emerald: '#0D4935',     // Rich emerald
          surface: '#14543D',     // Elevated surface
          softwhite: '#F4F7F0',   // Soft white
          white: '#FFFFFF',       // Pure white
          lime: '#D7FF35',        // Signal lime
          sage: '#A7B9A8',        // Muted sage
        },
        dark: {
          bg: '#041B15',
          bgSecondary: '#062B20',
          surface: '#0D4935',
          surfaceSubtle: '#14543D',
          surfaceHighlight: '#1C694E',
          border: '#1B5E45',
          borderHairline: 'rgba(255, 255, 255, 0.08)',
          textPrimary: '#FFFFFF',
          textSecondary: '#A7B9A8',
          textMuted: '#7E9680',
          accent: '#D7FF35', // Signal lime
          accentHover: '#C4F020',
          accentGlow: 'rgba(215, 255, 53, 0.35)',
        },
        light: {
          bg: '#F4F7F0',
          bgSecondary: '#E9EFE3',
          surface: '#FFFFFF',
          surfaceSubtle: '#F4F7F0',
          surfaceHighlight: '#DDE5D5',
          border: '#D0DDD0',
          borderHairline: 'rgba(6, 43, 32, 0.08)',
          textPrimary: '#062B20',
          textSecondary: '#0D4935',
          textMuted: '#4F6B58',
          accent: '#0D4935',
          accentHover: '#062B20',
          accentGlow: 'rgba(13, 73, 53, 0.20)',
        },
        waste: {
          wet: '#10B981',
          dry: '#3B82F6',
          hazardous: '#EF4444',
          ewaste: '#EAB308',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        kannada: ['"Noto Sans Kannada"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'Menlo', 'monospace'],
      },
      borderRadius: {
        '16': '16px',
        '20': '20px',
        '24': '24px',
      },
      boxShadow: {
        'glow-lime': '0 0 30px -5px rgba(215, 255, 53, 0.45)',
        'glow-lime-sm': '0 0 15px -3px rgba(215, 255, 53, 0.3)',
        'glow-green': '0 0 25px -5px rgba(215, 255, 53, 0.35)',
        'glow-green-sm': '0 0 15px -3px rgba(215, 255, 53, 0.25)',
        'inner-light': 'inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'card-dark': '0 4px 24px -2px rgba(4, 27, 21, 0.6)',
      },
    },
  },
  plugins: [],
};
