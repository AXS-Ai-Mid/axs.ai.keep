import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api } from '../lib/api'
import { COLOR_MAP } from '../lib/colors'
import { STAGE_MAP } from '../lib/constants'
import { nextOccurrence } from '../lib/format'
import { playSound, unlockAudio } from '../lib/sound'
import { showNotification } from '../lib/notify'
import type { AppState, Category, ChecklistItem, Note, Priority, Reminder, Settings, StageId } from '../types'

const EMPTY_SETTINGS: Settings = {
  theme: 'light',
  soundEnabled: true,
  sound: 'chime',
  volume: 0.7,
  notificationsEnabled: false,
  mondayFirst: true,
}

export const uid = (prefix = 'id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`

function blankNote(partial: Partial<Note> = {}): Note {
  const now = new Date().toISOString()
  return {
    id: uid('note'),
    title: '',
    content: '',
    color: 'padrao',
    categoryId: null,
    tags: [],
    pinned: false,
    archived: false,
    trashed: false,
    trashedAt: null,
    priority: 'media',
    stage: 'prospeccao',
    inPipeline: false,
    order: 0,
    client: '',
    company: '',
    email: '',
    phone: '',
    dealValue: 0,
    dueDate: null,
    checklist: [],
    history: [],
    createdAt: now,
    updatedAt: now,
    ...partial,
  }
}

export interface UseCrmNotes {
  ready: boolean
  error: string | null
  notes: Note[]
  categories: Category[]
  reminders: Reminder[]
  settings: Settings
  /** Alarmes vencidos que ainda não foram tratados pelo usuário. */
  dueReminders: Reminder[]
  activeReminder: Reminder | null
  toast: string | null
  showToast: (message: string) => void
  createNote: (partial?: Partial<Note>) => Note
  updateNote: (id: string, patch: Partial<Note>) => void
  deleteNote: (id: string) => void
  trashNote: (id: string) => void
  restoreNote: (id: string) => void
  emptyTrash: () => void
  togglePin: (id: string) => void
  toggleArchive: (id: string) => void
  moveStage: (id: string, stage: StageId, beforeId?: string | null) => void
  toggleChecklist: (noteId: string, itemId: string) => void
  addChecklistItem: (noteId: string, text: string) => void
  removeChecklistItem: (noteId: string, itemId: string) => void
  addCategory: (name: string, color: Category['color']) => Category
  updateCategory: (id: string, patch: Partial<Category>) => void
  deleteCategory: (id: string) => void
  saveReminder: (input: Partial<Reminder> & { title: string; at: string }) => Reminder
  updateReminder: (id: string, patch: Partial<Reminder>) => void
  deleteReminder: (id: string) => void
  completeReminder: (id: string) => void
  snoozeReminder: (id: string, minutes: number) => void
  dismissActiveReminder: () => void
  acknowledgeReminder: (id: string) => void
  updateSettings: (patch: Partial<Settings>) => void
  reseed: () => Promise<void>
  clearAll: () => Promise<void>
  exportBackup: () => Promise<void>
  importBackup: (file: File) => Promise<void>
}

export function useCrmNotes(): UseCrmNotes {
  const [state, setState] = useState<AppState>({ notes: [], categories: [], reminders: [], settings: EMPTY_SETTINGS })
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Motor de alarmes
  const [clock, setClock] = useState(() => Date.now())
  const [acknowledged, setAcknowledged] = useState<Set<string>>(() => new Set())
  const [activeReminderId, setActiveReminderId] = useState<string | null>(null)
  const alertedRef = useRef<Set<string>>(new Set())

  const notesRef = useRef<Note[]>([])
  notesRef.current = state.notes
  const remindersRef = useRef<Reminder[]>([])
  remindersRef.current = state.reminders
  const settingsRef = useRef<Settings>(EMPTY_SETTINGS)
  settingsRef.current = state.settings
  const toastTimer = useRef<number | null>(null)

  const showToast = useCallback((message: string) => {
    setToast(message)
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }, [])

  // ───────────────────────── Carregamento inicial ─────────────────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await api.getState()
        if (cancelled) return
        setState({
          notes: Array.isArray(data.notes) ? data.notes.map((note) => ({ ...blankNote(), ...note })) : [],
          categories: Array.isArray(data.categories) ? data.categories : [],
          reminders: Array.isArray(data.reminders) ? data.reminders : [],
          settings: { ...EMPTY_SETTINGS, ...(data.settings ?? {}) },
          seededAt: data.seededAt,
        })
        setReady(true)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : 'Não foi possível conectar à API')
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ───────────────────────── Sincronização via SSE ─────────────────────────
  useEffect(() => {
    if (!ready) return
    const events = new EventSource('/api/events')
    events.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { kind: string }
        if (['notes', 'categories', 'reminders', 'state'].includes(payload.kind)) {
          void api.getState().then((data) => {
            setState((prev) => ({
              ...prev,
              notes: data.notes.map((note) => ({ ...blankNote(), ...note })),
              categories: data.categories,
              reminders: data.reminders,
              settings: { ...prev.settings, ...data.settings },
            }))
          })
        }
      } catch {
        /* evento inválido — ignora */
      }
    }
    return () => events.close()
  }, [ready])

  // ───────────────────────── Tema ─────────────────────────
  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', state.settings.theme === 'dark')
    root.classList.remove('dark-loading')
    root.style.colorScheme = state.settings.theme
  }, [state.settings.theme])

  useEffect(() => {
    if (!ready) return
    const pending = state.reminders.filter((reminder) => reminder.active && !reminder.done).length
    document.title = pending ? `(${pending}) CRM Notes — Notas & Pipeline` : 'CRM Notes — Notas & Pipeline de Vendas'
  }, [state.reminders, ready])

  // Desbloqueia o áudio no primeiro gesto do usuário
  useEffect(() => {
    const handler = () => unlockAudio()
    window.addEventListener('pointerdown', handler, { once: true })
    return () => window.removeEventListener('pointerdown', handler)
  }, [])

  // ───────────────────────── Persistência ─────────────────────────
  const persistNote = useCallback(
    (note: Note) => {
      void api.upsertNote(note).catch((err: Error) => showToast(`Falha ao salvar: ${err.message}`))
    },
    [showToast],
  )

  const patchNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      void api.updateNote(id, patch).catch((err: Error) => {
        // Nota removida definitivamente em outro dispositivo: não incomoda o usuário.
        if (err.message.includes('não encontrada')) return
        showToast(`Falha ao salvar: ${err.message}`)
      })
    },
    [showToast],
  )

  // ───────────────────────── CRUD de notas ─────────────────────────
  const createNote = useCallback(
    (partial: Partial<Note> = {}) => {
      const { id: _ignored, ...rest } = partial
      const note = blankNote({ ...rest, order: Date.now() })
      setState((prev) => ({ ...prev, notes: [note, ...prev.notes] }))
      persistNote(note)
      return note
    },
    [persistNote],
  )

  const updateNote = useCallback(
    (id: string, patch: Partial<Note>) => {
      setState((prev) => ({
        ...prev,
        notes: prev.notes.map((note) => {
          if (note.id !== id) return note
          const history = [...(note.history ?? [])]
          const entry = { id: uid('hst'), at: new Date().toISOString(), text: '' }
          if (patch.stage && patch.stage !== note.stage) {
            history.unshift({ ...entry, text: `Etapa alterada: ${STAGE_MAP[note.stage]?.name ?? note.stage} → ${STAGE_MAP[patch.stage]?.name ?? patch.stage}` })
          }
          if (patch.inPipeline === true && !note.inPipeline) history.unshift({ ...entry, text: 'Card adicionado ao pipeline' })
          if (patch.inPipeline === false && note.inPipeline) history.unshift({ ...entry, text: 'Card removido do pipeline' })
          if (patch.color && patch.color !== note.color) history.unshift({ ...entry, text: `Cor alterada para ${COLOR_MAP[patch.color]?.label ?? patch.color}` })
          if (patch.trashed === true && !note.trashed) history.unshift({ ...entry, text: 'Nota movida para a lixeira' })
          return { ...note, ...patch, history, updatedAt: new Date().toISOString() }
        }),
      }))
      patchNote(id, patch)
    },
    [patchNote],
  )

  const trashNote = useCallback(
    (id: string) => {
      const note = notesRef.current.find((item) => item.id === id)
      if (!note) return
      const at = new Date().toISOString()
      const payload = {
        trashed: true,
        trashedAt: at,
        pinned: false,
        updatedAt: at,
        history: [{ id: uid('hst'), at, text: 'Nota movida para a lixeira' }, ...(note.history ?? [])],
      }
      setState((prev) => ({ ...prev, notes: prev.notes.map((item) => (item.id === id ? { ...item, ...payload } : item)) }))
      patchNote(id, payload)
      showToast('Nota movida para a lixeira')
    },
    [patchNote, showToast],
  )

  const restoreNote = useCallback(
    (id: string) => {
      const payload = { trashed: false, trashedAt: null }
      setState((prev) => ({ ...prev, notes: prev.notes.map((note) => (note.id === id ? { ...note, ...payload } : note)) }))
      patchNote(id, payload)
      showToast('Nota restaurada')
    },
    [patchNote, showToast],
  )

  const deleteNote = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        notes: prev.notes.filter((note) => note.id !== id),
        reminders: prev.reminders.filter((reminder) => reminder.noteId !== id),
      }))
      void api.deleteNote(id).catch((err: Error) => showToast(`Falha ao excluir: ${err.message}`))
      showToast('Nota excluída definitivamente')
    },
    [showToast],
  )

  const emptyTrash = useCallback(() => {
    const trashed = notesRef.current.filter((note) => note.trashed)
    if (!trashed.length) {
      showToast('A lixeira já está vazia')
      return
    }
    const ids = new Set(trashed.map((note) => note.id))
    setState((prev) => ({
      ...prev,
      notes: prev.notes.filter((note) => !ids.has(note.id)),
      reminders: prev.reminders.filter((reminder) => !reminder.noteId || !ids.has(reminder.noteId)),
    }))
    for (const note of trashed) void api.deleteNote(note.id).catch(() => undefined)
    showToast(`${trashed.length} nota(s) excluída(s) definitivamente`)
  }, [showToast])

  const togglePin = useCallback(
    (id: string) => {
      const note = notesRef.current.find((item) => item.id === id)
      if (!note) return
      const pinned = !note.pinned
      patchNote(id, { pinned })
      setState((prev) => ({ ...prev, notes: prev.notes.map((item) => (item.id === id ? { ...item, pinned } : item)) }))
      showToast(pinned ? 'Nota fixada' : 'Nota desafixada')
    },
    [patchNote, showToast],
  )

  const toggleArchive = useCallback(
    (id: string) => {
      const note = notesRef.current.find((item) => item.id === id)
      if (!note) return
      const archived = !note.archived
      patchNote(id, { archived, ...(archived ? { pinned: false } : {}) })
      setState((prev) => ({
        ...prev,
        notes: prev.notes.map((item) => (item.id === id ? { ...item, archived, pinned: archived ? false : item.pinned } : item)),
      }))
      showToast(archived ? 'Nota arquivada' : 'Nota desarquivada')
    },
    [patchNote, showToast],
  )

  /** Move o card no Kanban, opcionalmente antes de outro card. */
  const moveStage = useCallback(
    (id: string, stage: StageId, beforeId?: string | null) => {
      const notes = notesRef.current
      const moving = notes.find((note) => note.id === id)
      if (!moving) return
      const column = notes
        .filter((note) => note.inPipeline && !note.archived && !note.trashed && note.stage === stage && note.id !== id)
        .sort((a, b) => a.order - b.order)
      const index = beforeId ? column.findIndex((note) => note.id === beforeId) : column.length
      const insertAt = index < 0 ? column.length : index
      const reordered = [...column.slice(0, insertAt), { ...moving, stage, inPipeline: true }, ...column.slice(insertAt)]
      const orders = new Map(reordered.map((note, position) => [note.id, (position + 1) * 10]))
      const now = new Date().toISOString()
      const entry = {
        id: uid('hst'),
        at: now,
        text: moving.stage === stage ? 'Card reordenado no pipeline' : `Etapa alterada: ${STAGE_MAP[moving.stage]?.name} → ${STAGE_MAP[stage]?.name}`,
      }

      setState((prev) => ({
        ...prev,
        notes: prev.notes.map((note) => {
          if (!orders.has(note.id)) return note
          return {
            ...note,
            stage,
            inPipeline: true,
            order: orders.get(note.id) as number,
            updatedAt: now,
            history: note.id === id ? [entry, ...(note.history ?? [])] : note.history,
          }
        }),
      }))

      const changed = reordered.map((note) => ({
        ...note,
        stage,
        inPipeline: true,
        order: orders.get(note.id) as number,
        updatedAt: now,
        ...(note.id === id ? { history: [entry, ...(note.history ?? [])] } : {}),
      }))
      void api.saveNotes(changed).catch((err: Error) => showToast(`Falha ao mover card: ${err.message}`))
      if (moving.stage !== stage) showToast(`Card movido para ${STAGE_MAP[stage]?.name}`)
    },
    [showToast],
  )

  const toggleChecklist = useCallback(
    (noteId: string, itemId: string) => {
      const note = notesRef.current.find((item) => item.id === noteId)
      if (!note) return
      const checklist: ChecklistItem[] = (note.checklist ?? []).map((item) => (item.id === itemId ? { ...item, done: !item.done } : item))
      setState((prev) => ({ ...prev, notes: prev.notes.map((item) => (item.id === noteId ? { ...item, checklist } : item)) }))
      patchNote(noteId, { checklist })
    },
    [patchNote],
  )

  const addChecklistItem = useCallback(
    (noteId: string, text: string) => {
      const note = notesRef.current.find((item) => item.id === noteId)
      if (!note || !text.trim()) return
      const checklist = [...(note.checklist ?? []), { id: uid('chk'), text: text.trim(), done: false }]
      setState((prev) => ({ ...prev, notes: prev.notes.map((item) => (item.id === noteId ? { ...item, checklist } : item)) }))
      patchNote(noteId, { checklist })
    },
    [patchNote],
  )

  const removeChecklistItem = useCallback(
    (noteId: string, itemId: string) => {
      const note = notesRef.current.find((item) => item.id === noteId)
      if (!note) return
      const checklist = (note.checklist ?? []).filter((item) => item.id !== itemId)
      setState((prev) => ({ ...prev, notes: prev.notes.map((item) => (item.id === noteId ? { ...item, checklist } : item)) }))
      patchNote(noteId, { checklist })
    },
    [patchNote],
  )

  // ───────────────────────── Categorias ─────────────────────────
  const addCategory = useCallback(
    (name: string, color: Category['color']) => {
      const category: Category = { id: uid('cat'), name: name.trim(), color, createdAt: new Date().toISOString() }
      setState((prev) => ({ ...prev, categories: [...prev.categories, category] }))
      void api.createCategory(category).catch((err: Error) => showToast(`Falha ao criar categoria: ${err.message}`))
      showToast(`Categoria "${category.name}" criada`)
      return category
    },
    [showToast],
  )

  const updateCategory = useCallback(
    (id: string, patch: Partial<Category>) => {
      setState((prev) => ({ ...prev, categories: prev.categories.map((category) => (category.id === id ? { ...category, ...patch } : category)) }))
      void api.updateCategory(id, patch).catch((err: Error) => showToast(`Falha ao salvar categoria: ${err.message}`))
    },
    [showToast],
  )

  const deleteCategory = useCallback(
    (id: string) => {
      setState((prev) => ({
        ...prev,
        categories: prev.categories.filter((category) => category.id !== id),
        notes: prev.notes.map((note) => (note.categoryId === id ? { ...note, categoryId: null } : note)),
      }))
      void api.deleteCategory(id).catch((err: Error) => showToast(`Falha ao excluir categoria: ${err.message}`))
      showToast('Categoria excluída — as notas foram mantidas')
    },
    [showToast],
  )

  // ───────────────────────── Lembretes ─────────────────────────
  const saveReminder = useCallback(
    (input: Partial<Reminder> & { title: string; at: string }) => {
      const reminder: Reminder = {
        id: input.id ?? uid('rem'),
        noteId: input.noteId ?? null,
        title: input.title,
        at: input.at,
        repeat: input.repeat ?? 'none',
        done: input.done ?? false,
        active: input.active ?? true,
        createdAt: input.createdAt ?? new Date().toISOString(),
      }
      setState((prev) => {
        const exists = prev.reminders.some((item) => item.id === reminder.id)
        return { ...prev, reminders: exists ? prev.reminders.map((item) => (item.id === reminder.id ? reminder : item)) : [...prev.reminders, reminder] }
      })
      void api.saveReminder(reminder).catch((err: Error) => showToast(`Falha ao salvar alarme: ${err.message}`))
      showToast('Alarme programado')
      alertedRef.current.delete(reminder.id)
      setAcknowledged((prev) => {
        if (!prev.has(reminder.id)) return prev
        const next = new Set(prev)
        next.delete(reminder.id)
        return next
      })
      setClock(Date.now())
      return reminder
    },
    [showToast],
  )

  const updateReminder = useCallback(
    (id: string, patch: Partial<Reminder>) => {
      setState((prev) => ({ ...prev, reminders: prev.reminders.map((item) => (item.id === id ? { ...item, ...patch } : item)) }))
      void api.updateReminder(id, patch).catch((err: Error) => showToast(`Falha ao atualizar alarme: ${err.message}`))
    },
    [showToast],
  )

  const deleteReminder = useCallback(
    (id: string) => {
      setState((prev) => ({ ...prev, reminders: prev.reminders.filter((item) => item.id !== id) }))
      void api.deleteReminder(id).catch((err: Error) => showToast(`Falha ao excluir alarme: ${err.message}`))
      setActiveReminderId((prev) => (prev === id ? null : prev))
      showToast('Alarme removido')
    },
    [showToast],
  )

  const completeReminder = useCallback(
    (id: string) => {
      const reminder = remindersRef.current.find((item) => item.id === id)
      if (!reminder) return
      if (reminder.repeat !== 'none') {
        const next = nextOccurrence(new Date(Math.max(Date.now(), Date.parse(reminder.at))), reminder.repeat).toISOString()
        updateReminder(id, { at: next, done: false })
        showToast('Alarme reagendado para a próxima ocorrência')
      } else {
        updateReminder(id, { done: true })
        showToast('Alarme concluído')
      }
      alertedRef.current.delete(id)
      setActiveReminderId((prev) => (prev === id ? null : prev))
    },
    [updateReminder, showToast],
  )

  const snoozeReminder = useCallback(
    (id: string, minutes: number) => {
      const reminder = remindersRef.current.find((item) => item.id === id)
      if (!reminder) return
      const from = Math.max(Date.now(), Date.parse(reminder.at))
      updateReminder(id, { at: new Date(from + minutes * 60000).toISOString(), done: false })
      alertedRef.current.delete(id)
      setActiveReminderId((prev) => (prev === id ? null : prev))
      showToast(`Adiado por ${minutes < 60 ? `${minutes} minutos` : minutes === 60 ? '1 hora' : '1 dia'}`)
    },
    [updateReminder, showToast],
  )

  const acknowledgeReminder = useCallback((id: string) => {
    setAcknowledged((prev) => new Set(prev).add(id))
    setActiveReminderId((prev) => (prev === id ? null : prev))
  }, [])

  const dueReminders = useMemo(
    () =>
      state.reminders
        .filter((reminder) => reminder.active && !reminder.done && Date.parse(reminder.at) <= clock && !acknowledged.has(reminder.id))
        .sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    [state.reminders, clock, acknowledged],
  )

  const activeReminder = useMemo(
    () => (activeReminderId ? dueReminders.find((reminder) => reminder.id === activeReminderId) ?? null : null),
    [activeReminderId, dueReminders],
  )

  const dismissActiveReminder = useCallback(() => {
    if (!activeReminderId) return
    acknowledgeReminder(activeReminderId)
  }, [activeReminderId, acknowledgeReminder])

  // ───────────────────────── Preferências / dados ─────────────────────────
  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }))
    void api.saveSettings(patch).catch(() => undefined)
  }, [])

  const reseed = useCallback(async () => {
    await api.reseed()
    const data = await api.getState()
    setState({ ...data, settings: { ...EMPTY_SETTINGS, ...(data.settings ?? {}) } })
    acknowledged.clear?.()
    setAcknowledged(new Set())
    alertedRef.current = new Set()
    setActiveReminderId(null)
    setClock(Date.now())
    showToast('Dados de exemplo restaurados')
  }, [showToast])

  const clearAll = useCallback(async () => {
    await api.putState({ notes: [], categories: state.categories, reminders: [], settings: state.settings })
    const data = await api.getState()
    setState({ ...data, settings: { ...EMPTY_SETTINGS, ...(data.settings ?? {}) } })
    setAcknowledged(new Set())
    setActiveReminderId(null)
    showToast('Todas as notas foram removidas')
  }, [state.categories, state.settings, showToast])

  const exportBackup = useCallback(async () => {
    const data = await api.getState()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `crm-notes-backup-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
    showToast('Backup exportado')
  }, [showToast])

  const importBackup = useCallback(
    async (file: File) => {
      try {
        const text = await file.text()
        const parsed = JSON.parse(text) as Partial<AppState>
        if (!Array.isArray(parsed.notes)) throw new Error('arquivo sem a lista de notas')
        await api.putState({
          notes: parsed.notes.map((note) => ({ ...blankNote(), ...note })),
          categories: parsed.categories ?? [],
          reminders: parsed.reminders ?? [],
          settings: parsed.settings ?? EMPTY_SETTINGS,
        })
        const data = await api.getState()
        setState({ ...data, settings: { ...EMPTY_SETTINGS, ...(data.settings ?? {}) } })
        setAcknowledged(new Set())
        setActiveReminderId(null)
        setClock(Date.now())
        showToast('Backup importado com sucesso')
      } catch (err) {
        showToast(`Falha ao importar: ${err instanceof Error ? err.message : 'arquivo inválido'}`)
      }
    },
    [showToast],
  )

  // ───────────────────────── Motor de alarmes ─────────────────────────
  // Verificação a cada 20 s (conforme especificado).
  useEffect(() => {
    if (!ready) return
    const id = window.setInterval(() => setClock(Date.now()), 20000)
    return () => window.clearInterval(id)
  }, [ready])

  // Toca som + notificação apenas para alarmes recém-vencidos (sem repetir a cada checagem).
  useEffect(() => {
    if (!ready) return
    const dueIds = new Set(
      remindersRef.current.filter((reminder) => reminder.active && !reminder.done && Date.parse(reminder.at) <= clock).map((reminder) => reminder.id),
    )
    for (const id of [...alertedRef.current]) if (!dueIds.has(id)) alertedRef.current.delete(id)
    const fresh = [...dueIds].filter((id) => !alertedRef.current.has(id) && !acknowledged.has(id))
    if (!fresh.length) return
    for (const id of fresh) alertedRef.current.add(id)
    const current = settingsRef.current
    if (current.soundEnabled) playSound(current.sound, current.volume)
    if (current.notificationsEnabled) {
      for (const id of fresh) {
        const reminder = remindersRef.current.find((item) => item.id === id)
        if (reminder) showNotification('⏰ Lembrete — CRM Notes', reminder.title, reminder.id)
      }
    }
  }, [clock, ready, acknowledged, state.reminders])

  // Abre o popup do próximo alarme pendente.
  useEffect(() => {
    if (activeReminderId) {
      if (!dueReminders.some((reminder) => reminder.id === activeReminderId)) setActiveReminderId(null)
      return
    }
    if (dueReminders.length) setActiveReminderId(dueReminders[0].id)
  }, [dueReminders, activeReminderId])

  return useMemo<UseCrmNotes>(
    () => ({
      ready,
      error,
      notes: state.notes,
      categories: state.categories,
      reminders: state.reminders,
      settings: state.settings,
      dueReminders,
      activeReminder,
      toast,
      showToast,
      createNote,
      updateNote,
      deleteNote,
      trashNote,
      restoreNote,
      emptyTrash,
      togglePin,
      toggleArchive,
      moveStage,
      toggleChecklist,
      addChecklistItem,
      removeChecklistItem,
      addCategory,
      updateCategory,
      deleteCategory,
      saveReminder,
      updateReminder,
      deleteReminder,
      completeReminder,
      snoozeReminder,
      dismissActiveReminder,
      acknowledgeReminder,
      updateSettings,
      reseed,
      clearAll,
      exportBackup,
      importBackup,
    }),
    [
      ready, error, state, dueReminders, activeReminder, toast, showToast, createNote, updateNote, deleteNote, trashNote, restoreNote, emptyTrash,
      togglePin, toggleArchive, moveStage, toggleChecklist, addChecklistItem, removeChecklistItem, addCategory, updateCategory, deleteCategory,
      saveReminder, updateReminder, deleteReminder, completeReminder, snoozeReminder, dismissActiveReminder, acknowledgeReminder, updateSettings,
      reseed, clearAll, exportBackup, importBackup,
    ],
  )
}

export { blankNote }
export type { Priority }
