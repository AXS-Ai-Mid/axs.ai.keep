/** Utilitários de data/hora/formatação em pt-BR. */

const dtf = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
const dtfFull = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
const timef = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' })
const weekf = new Intl.DateTimeFormat('pt-BR', { weekday: 'long' })
const moneyf = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

export const formatDate = (value?: string | null) => (value ? dtf.format(new Date(value)) : '')
export const formatDateFull = (value?: string | null) => (value ? dtfFull.format(new Date(value)) : '')
export const formatTime = (value?: string | null) => (value ? timef.format(new Date(value)) : '')
export const formatWeekday = (value: string) => weekf.format(new Date(value))
export const formatMoney = (value: number) => moneyf.format(Number.isFinite(value) ? value : 0)
export const formatCompactMoney = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: value >= 100000 ? 'compact' : 'standard', maximumFractionDigits: 0 }).format(value || 0)

export function relativeDay(value?: string | null): string {
  if (!value) return ''
  const target = new Date(value)
  const today = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  const diff = Math.round((startOfDay(target) - startOfDay(today)) / 86400000)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Amanhã'
  if (diff === -1) return 'Ontem'
  if (diff > 1 && diff <= 6) return weekf.format(target).replace('-feira', '')
  if (diff < -1 && diff >= -6) return `${weekf.format(target).replace('-feira', '')} (passado)`
  return formatDate(value)
}

/** "hoje 14:30" / "amanhã 09:00" / "12 de out. 2026" */
export function formatDateTime(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const tomorrow = new Date(now.getTime() + 86400000)
  if (sameDay) return `hoje ${timef.format(d)}`
  if (d.toDateString() === tomorrow.toDateString()) return `amanhã ${timef.format(d)}`
  return `${dtf.format(d)} · ${timef.format(d)}`
}

export function formatUpdated(value?: string | null): string {
  if (!value) return ''
  const diff = Date.now() - new Date(value).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min} min`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours} h`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} d`
  return formatDate(value)
}

export function startOfWeek(date: Date, mondayFirst = true): Date {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const day = d.getDay()
  const shift = mondayFirst ? (day === 0 ? 6 : day - 1) : day
  d.setDate(d.getDate() - shift)
  return d
}

export function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60000)
}

export function nextOccurrence(from: Date, repeat: string): Date {
  const d = new Date(from)
  if (repeat === 'daily') d.setDate(d.getDate() + 1)
  else if (repeat === 'weekly') d.setDate(d.getDate() + 7)
  else if (repeat === 'monthly') d.setMonth(d.getMonth() + 1)
  else d.setFullYear(d.getFullYear() + 100)
  return d
}

export function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

/** yyyy-MM-ddTHH:mm no fuso local — formato aceito por <input type="datetime-local"> */
export function toDateTimeInput(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function fromDateTimeInput(value: string): string | null {
  if (!value) return null
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function toDateInput(value?: string | null): string {
  if (!value) return ''
  const d = new Date(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function fromDateInput(value: string): string | null {
  if (!value) return null
  const [y, m, d] = value.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d, 9, 0, 0, 0).toISOString()
}

export function sortByDateTime<T>(items: T[], get: (item: T) => string | null | undefined): T[] {
  return [...items].sort((a, b) => {
    const av = get(a) ? new Date(get(a) as string).getTime() : Number.MAX_SAFE_INTEGER
    const bv = get(b) ? new Date(get(b) as string).getTime() : Number.MAX_SAFE_INTEGER
    return av - bv
  })
}
