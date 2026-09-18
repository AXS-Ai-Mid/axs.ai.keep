import type { AppState, Category, Note, Reminder, Settings } from '../types'

const BASE = '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    let message = `Erro ${response.status}`
    try {
      const body = (await response.json()) as { error?: string }
      if (body?.error) message = body.error
    } catch {
      /* corpo não-JSON */
    }
    throw new Error(message)
  }
  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

export const api = {
  health: () => request<{ ok: boolean; notes: number }>('/health'),
  getState: () => request<AppState>('/state'),
  putState: (state: AppState) => request<{ ok: boolean }>('/state', { method: 'PUT', body: JSON.stringify(state) }),
  reseed: () => request<{ ok: boolean }>('/reseed', { method: 'POST' }),

  upsertNote: (note: Note) => request<Note>('/notes', { method: 'POST', body: JSON.stringify(note) }),
  updateNote: (id: string, patch: Partial<Note>) => request<Note>(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  saveNotes: (notes: Note[]) => request<{ ok: boolean }>('/notes', { method: 'PUT', body: JSON.stringify(notes) }),
  deleteNote: (id: string) => request<{ ok: boolean }>(`/notes/${id}`, { method: 'DELETE' }),

  createCategory: (category: Category) => request<Category>('/categories', { method: 'POST', body: JSON.stringify(category) }),
  updateCategory: (id: string, patch: Partial<Category>) => request<Category>(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteCategory: (id: string) => request<{ ok: boolean; detachedNotes: number }>(`/categories/${id}`, { method: 'DELETE' }),

  saveReminder: (reminder: Reminder) => request<Reminder>('/reminders', { method: 'POST', body: JSON.stringify(reminder) }),
  updateReminder: (id: string, patch: Partial<Reminder>) => request<Reminder>(`/reminders/${id}`, { method: 'PUT', body: JSON.stringify(patch) }),
  deleteReminder: (id: string) => request<{ ok: boolean }>(`/reminders/${id}`, { method: 'DELETE' }),

  saveSettings: (settings: Partial<Settings>) => request<Settings>('/settings', { method: 'PATCH', body: JSON.stringify(settings) }),
}
