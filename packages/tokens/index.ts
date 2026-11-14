/**
 * GreenPay 2.0 Design System Tokens
 * Premium, cinematic, product-showcase aesthetic.
 * Deep forest green, rich emerald, soft white, signal lime.
 */

export const brand = {
  deepForest: '#062B20',
  darkBg: '#041B15',
  emerald: '#0D4935',
  surface: '#14543D',
  softWhite: '#F4F7F0',
  white: '#FFFFFF',
  signalLime: '#D7FF35',
  mutedSage: '#A7B9A8',
} as const;

export const colors = {
  // Brand Foundation
  brand,

  // Dark Theme (Default Cinematic GreenPay 2.0 Theme)
  dark: {
    bg: '#041B15',                  // Dark background
    bgSecondary: '#062B20',         // Deep forest green
    surface: '#0D4935',             // Emerald
    surfaceSubtle: '#14543D',       // Surface
    surfaceHighlight: '#1C694E',
    border: '#1B5E45',
    borderHairline: 'rgba(255, 255, 255, 0.08)',
    textPrimary: '#FFFFFF',
    textSecondary: '#A7B9A8',       // Muted sage
    textMuted: '#7E9680',
    accent: '#D7FF35',              // Signal lime
    accentHover: '#C4F020',
    accentGlow: 'rgba(215, 255, 53, 0.35)',
    danger: '#EF4444',
    warning: '#F59E0B',
    info: '#3B82F6',
  },

  // Light Theme (Editorial Soft-White)
  light: {
    bg: '#F4F7F0',                  // Soft white
    bgSecondary: '#E9EFE3',
    surface: '#FFFFFF',
    surfaceSubtle: '#F4F7F0',
    surfaceHighlight: '#DDE5D5',
    border: '#D0DDD0',
    borderHairline: 'rgba(6, 43, 32, 0.08)',
    textPrimary: '#062B20',         // Deep forest green text
    textSecondary: '#0D4935',       // Emerald text
    textMuted: '#4F6B58',
    accent: '#0D4935',              // Emerald
    accentHover: '#062B20',
    accentGlow: 'rgba(13, 73, 53, 0.20)',
    danger: '#DC2626',
    warning: '#D97706',
    info: '#2563EB',
  },

  // Waste Category Identity Tokens
  waste: {
    wet: '#10B981',        // Emerald Green (Wet Organic)
    dry: '#3B82F6',        // Technical Blue (Dry Recyclable)
    hazardous: '#EF4444',  // Rose/Red (Hazardous)
    ewaste: '#EAB308',     // Technical Yellow/Gold (E-Waste)
  }
} as const;

export const radii = {
  sm: '8px',
  md: '12px',
  card: '16px',
  cardLarge: '20px',
  hero: '24px',
  pill: '9999px',
} as const;

export const typography = {
  fontSans: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  fontKannada: '"Noto Sans Kannada", Inter, system-ui, sans-serif',
  fontMono: '"JetBrains Mono", Menlo, Monaco, Consolas, monospace',
} as const;

export const shadows = {
  subtle: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
  card: '0 4px 20px -2px rgba(0, 0, 0, 0.25)',
  glowLime: '0 0 30px -5px rgba(215, 255, 53, 0.45)',
  glowLimeSm: '0 0 15px -3px rgba(215, 255, 53, 0.3)',
  innerHighlight: 'inset 0 1px 0 0 rgba(255, 255, 255, 0.1)',
} as const;
