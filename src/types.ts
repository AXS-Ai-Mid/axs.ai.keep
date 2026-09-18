export type Repeat = 'none' | 'daily' | 'weekly' | 'monthly'
export type Priority = 'baixa' | 'media' | 'alta' | 'urgente'
export type StageId = 'prospeccao' | 'atendimento' | 'criacao' | 'apresentacao' | 'venda' | 'fechamento'

export interface ChecklistItem {
  id: string
  text: string
  done: boolean
}

export interface HistoryEntry {
  id: string
  at: string
  text: string
}

export type ColorKey =
  | 'padrao' | 'cinza' | 'grafite' | 'areia' | 'amarelo' | 'ambar' | 'laranja' | 'coral'
  | 'rosa' | 'magenta' | 'roxo' | 'violeta' | 'indigo' | 'azul' | 'ceu' | 'ciano'
  | 'turquesa' | 'esmeralda' | 'verde' | 'limao'

export interface Note {
  id: string
  title: string
  content: string
  color: ColorKey
  categoryId: string | null
  tags: string[]
  pinned: boolean
  archived: boolean
  trashed: boolean
  trashedAt: string | null
  priority: Priority
  stage: StageId
  inPipeline: boolean
  order: number
  client: string
  company: string
  email: string
  phone: string
  dealValue: number
  dueDate: string | null
  checklist: ChecklistItem[]
  history: HistoryEntry[]
  createdAt: string
  updatedAt: string
}

export interface Category {
  id: string
  name: string
  color: ColorKey
  createdAt: string
}

export interface Reminder {
  id: string
  noteId: string | null
  title: string
  at: string
  repeat: Repeat
  done: boolean
  active: boolean
  createdAt: string
}

export interface Settings {
  theme: 'light' | 'dark'
  soundEnabled: boolean
  sound: string
  volume: number
  notificationsEnabled: boolean
  mondayFirst: boolean
}

export interface AppState {
  notes: Note[]
  categories: Category[]
  reminders: Reminder[]
  settings: Settings
  seededAt?: string
  version?: number
}

export type ViewKey = 'notes' | 'pipeline' | 'reminders' | 'agenda' | 'trash'

export interface NoteFilters {
  view: ViewKey
  categoryId: string | null
  stage: StageId | null
  search: string
  priority: Priority | 'todas'
}
