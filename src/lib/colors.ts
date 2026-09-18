import type { ColorKey } from '../types'

export interface ColorDef {
  key: ColorKey
  label: string
  /** Fundo da nota no tema claro */
  bg: string
  /** Borda suave no tema claro */
  border: string
  /** Cor de destaque (chips, ícones) */
  accent: string
  /** Fundo da nota no tema escuro */
  darkBg: string
  darkBorder: string
}

/** 20 cores de organização visual. */
export const COLORS: ColorDef[] = [
  { key: 'padrao', label: 'Padrão', bg: '#ffffff', border: '#e2e8f0', accent: '#64748b', darkBg: '#1e293b', darkBorder: '#334155' },
  { key: 'cinza', label: 'Cinza', bg: '#f1f3f6', border: '#dcdfe5', accent: '#5b6472', darkBg: '#26303c', darkBorder: '#3a4553' },
  { key: 'grafite', label: 'Grafite', bg: '#c9d0d9', border: '#b4bcc7', accent: '#39424e', darkBg: '#2b3542', darkBorder: '#455364' },
  { key: 'areia', label: 'Areia', bg: '#efe7d8', border: '#ded3bf', accent: '#8a7350', darkBg: '#3a352c', darkBorder: '#574f3e' },
  { key: 'amarelo', label: 'Amarelo', bg: '#fdf3c1', border: '#f2e294', accent: '#8a7412', darkBg: '#3d3722', darkBorder: '#5c5230' },
  { key: 'ambar', label: 'Âmbar', bg: '#fcdfa6', border: '#f0c974', accent: '#8a5a10', darkBg: '#43331f', darkBorder: '#624a29' },
  { key: 'laranja', label: 'Laranja', bg: '#fcd9b6', border: '#f0be8b', accent: '#9a5312', darkBg: '#45301f', darkBorder: '#66472c' },
  { key: 'coral', label: 'Coral', bg: '#fbd0c2', border: '#f0b29c', accent: '#9c4326', darkBg: '#452c25', darkBorder: '#664134' },
  { key: 'rosa', label: 'Rosa', bg: '#fcd2e2', border: '#f0aac6', accent: '#9c2f5e', darkBg: '#442432', darkBorder: '#65374a' },
  { key: 'magenta', label: 'Magenta', bg: '#f6cbe8', border: '#e5a3d2', accent: '#8d2570', darkBg: '#40233a', darkBorder: '#613454' },
  { key: 'roxo', label: 'Roxo', bg: '#e8cdf6', border: '#d2a8e8', accent: '#6d2b96', darkBg: '#372546', darkBorder: '#513765' },
  { key: 'violeta', label: 'Violeta', bg: '#ddd5f8', border: '#c1b4f0', accent: '#5433a8', darkBg: '#302a4b', darkBorder: '#473e6b' },
  { key: 'indigo', label: 'Índigo', bg: '#d3ddf8', border: '#aebff0', accent: '#2f45a8', darkBg: '#262c4b', darkBorder: '#3b446b' },
  { key: 'azul', label: 'Azul', bg: '#cfe2fb', border: '#a8c8f2', accent: '#1a5aa8', darkBg: '#1f3049', darkBorder: '#2f4767' },
  { key: 'ceu', label: 'Céu', bg: '#cde9f8', border: '#a4d2ec', accent: '#146a8f', darkBg: '#1c3644', darkBorder: '#2b5163' },
  { key: 'ciano', label: 'Ciano', bg: '#cbf0ee', border: '#a0dedb', accent: '#0f6f6b', darkBg: '#1a3a38', darkBorder: '#285754' },
  { key: 'turquesa', label: 'Turquesa', bg: '#c6efe0', border: '#98dcc4', accent: '#0d6b53', darkBg: '#183a30', darkBorder: '#265747' },
  { key: 'esmeralda', label: 'Esmeralda', bg: '#c9f0d6', border: '#9ddfb3', accent: '#136b3c', darkBg: '#183a26', darkBorder: '#26573a' },
  { key: 'verde', label: 'Verde', bg: '#dcefb8', border: '#c3dd8f', accent: '#4d6b12', darkBg: '#2d3a1c', darkBorder: '#45572b' },
  { key: 'limao', label: 'Limão', bg: '#eef7c4', border: '#dceb9a', accent: '#5f7313', darkBg: '#313a1f', darkBorder: '#4a572f' },
]

export const COLOR_MAP: Record<ColorKey, ColorDef> = COLORS.reduce((acc, color) => {
  acc[color.key] = color
  return acc
}, {} as Record<ColorKey, ColorDef>)

export function colorOf(key: ColorKey | undefined): ColorDef {
  return COLOR_MAP[key ?? 'padrao'] ?? COLOR_MAP.padrao
}

/** Estilo inline do "papel" da nota, respeitando o tema. */
export function noteSurface(key: ColorKey, theme: 'light' | 'dark'): React.CSSProperties {
  const color = colorOf(key)
  if (key === 'padrao' && theme === 'dark') {
    return { backgroundColor: '#1e293b', borderColor: '#334155' }
  }
  return { backgroundColor: theme === 'dark' ? color.darkBg : color.bg, borderColor: theme === 'dark' ? color.darkBorder : color.border }
}
