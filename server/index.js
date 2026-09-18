/**
 * API do CRM Notes.
 * Persistência em server/data/db.json + sincronização via SSE em /api/events.
 */
import express from 'express'
import cors from 'cors'
import * as store from './store.js'

const PORT = Number(process.env.API_PORT || 3001)
const app = express()

app.use(cors())
app.use(express.json({ limit: '15mb' }))

/** @type {Set<import('express').Response>} */
const clients = new Set()

function broadcast(kind, payload) {
  const message = `data: ${JSON.stringify({ kind, payload, at: Date.now() })}\n\n`
  for (const res of clients) {
    try {
      res.write(message)
    } catch {
      clients.delete(res)
    }
  }
}

store.init()

app.get('/api/health', (_req, res) => {
  const state = store.getState()
  res.json({
    ok: true,
    notes: state.notes.length,
    categories: state.categories.length,
    reminders: state.reminders.length,
    seededAt: state.seededAt ?? null,
  })
})

app.get('/api/state', (_req, res) => {
  res.json(store.getState())
})

/** Salva a coleção inteira (usado na importação de backup). */
app.put('/api/state', (req, res) => {
  const body = req.body || {}
  if (!Array.isArray(body.notes)) return res.status(400).json({ error: 'payload inválido: notes[] é obrigatório' })
  const next = store.replaceState({
    notes: body.notes,
    categories: Array.isArray(body.categories) ? body.categories : [],
    reminders: Array.isArray(body.reminders) ? body.reminders : [],
    settings: body.settings && typeof body.settings === 'object' ? body.settings : {},
    seededAt: body.seededAt ?? new Date().toISOString(),
  })
  broadcast('state', { notes: next.notes.length })
  res.json({ ok: true, notes: next.notes.length })
})

// ───────────────────────────── Notas ─────────────────────────────

app.get('/api/notes', (_req, res) => res.json(store.getState().notes))

app.post('/api/notes', (req, res) => {
  const note = req.body
  if (!note || typeof note !== 'object') return res.status(400).json({ error: 'nota inválida' })
  const state = store.getState()
  const index = state.notes.findIndex((item) => item.id === note.id)
  if (index >= 0) state.notes[index] = note
  else state.notes.unshift(note)
  store.persist()
  broadcast('notes', { id: note.id })
  res.status(201).json(note)
})

app.put('/api/notes', (req, res) => {
  const list = Array.isArray(req.body) ? req.body : req.body?.notes
  if (!Array.isArray(list)) return res.status(400).json({ error: 'esperado um array de notas' })
  const state = store.getState()
  const byId = new Map(state.notes.map((note) => [note.id, note]))
  for (const note of list) byId.set(note.id, note)
  state.notes = [...byId.values()]
  store.persist()
  broadcast('notes', { count: list.length })
  res.json({ ok: true })
})

app.put('/api/notes/:id', (req, res) => {
  const { id } = req.params
  const patch = req.body
  const state = store.getState()
  const index = state.notes.findIndex((note) => note.id === id)
  if (index < 0) return res.status(404).json({ error: 'nota não encontrada' })
  state.notes[index] = { ...state.notes[index], ...patch, id }
  store.persist()
  broadcast('notes', { id })
  res.json(state.notes[index])
})

app.delete('/api/notes/:id', (req, res) => {
  const state = store.getState()
  const before = state.notes.length
  state.notes = state.notes.filter((note) => note.id !== req.params.id)
  store.persist()
  broadcast('notes', { id: req.params.id })
  res.json({ ok: true, removed: before - state.notes.length })
})

// ───────────────────────────── Categorias ─────────────────────────────

app.post('/api/categories', (req, res) => {
  const category = req.body
  if (!category?.name) return res.status(400).json({ error: 'nome da categoria é obrigatório' })
  const state = store.getState()
  if (state.categories.some((item) => item.name.toLowerCase() === category.name.toLowerCase())) {
    return res.status(409).json({ error: 'já existe uma categoria com esse nome' })
  }
  state.categories.push(category)
  store.persist()
  broadcast('categories', { id: category.id })
  res.status(201).json(category)
})

app.put('/api/categories/:id', (req, res) => {
  const state = store.getState()
  const index = state.categories.findIndex((item) => item.id === req.params.id)
  if (index < 0) return res.status(404).json({ error: 'categoria não encontrada' })
  state.categories[index] = { ...state.categories[index], ...req.body, id: req.params.id }
  store.persist()
  broadcast('categories', { id: req.params.id })
  res.json(state.categories[index])
})

app.delete('/api/categories/:id', (req, res) => {
  const state = store.getState()
  state.categories = state.categories.filter((item) => item.id !== req.params.id)
  // Notas da categoria removida voltam para "sem categoria" (nunca são apagadas).
  let touched = 0
  state.notes = state.notes.map((note) => {
    if (note.categoryId !== req.params.id) return note
    touched += 1
    return { ...note, categoryId: null }
  })
  store.persist()
  broadcast('categories', { id: req.params.id, detachedNotes: touched })
  res.json({ ok: true, detachedNotes: touched })
})

// ───────────────────────────── Lembretes ─────────────────────────────

app.post('/api/reminders', (req, res) => {
  const reminder = req.body
  if (!reminder?.title || !reminder?.at) return res.status(400).json({ error: 'título e horário são obrigatórios' })
  const state = store.getState()
  const index = state.reminders.findIndex((item) => item.id === reminder.id)
  if (index >= 0) state.reminders[index] = reminder
  else state.reminders.push(reminder)
  store.persist()
  broadcast('reminders', { id: reminder.id })
  res.status(201).json(reminder)
})

app.put('/api/reminders/:id', (req, res) => {
  const state = store.getState()
  const index = state.reminders.findIndex((item) => item.id === req.params.id)
  if (index < 0) return res.status(404).json({ error: 'lembrete não encontrado' })
  state.reminders[index] = { ...state.reminders[index], ...req.body, id: req.params.id }
  store.persist()
  broadcast('reminders', { id: req.params.id })
  res.json(state.reminders[index])
})

app.delete('/api/reminders/:id', (req, res) => {
  const state = store.getState()
  const before = state.reminders.length
  state.reminders = state.reminders.filter((item) => item.id !== req.params.id)
  store.persist()
  broadcast('reminders', { id: req.params.id })
  res.json({ ok: true, removed: before - state.reminders.length })
})

// ───────────────────────────── Preferências / eventos ─────────────────────────────

app.patch('/api/settings', (req, res) => {
  const state = store.getState()
  state.settings = { ...state.settings, ...(req.body || {}) }
  store.persist()
  broadcast('settings', null)
  res.json(state.settings)
})

/** Mantém o banco vivo (usado quando o preview hiberna o processo). */
app.post('/api/ping', (_req, res) => res.json({ ok: true, at: Date.now() }))

/** Restaura os dados de exemplo. */
app.post('/api/reseed', (_req, res) => {
  const next = store.reseed()
  broadcast('state', { reseeded: true })
  res.json({ ok: true, notes: next.notes.length, categories: next.categories.length, reminders: next.reminders.length })
})

/** Exporta um backup completo. */
app.get('/api/export', (_req, res) => {
  res.setHeader('Content-Disposition', 'attachment; filename="crm-notes-backup.json"')
  res.json(store.getState())
})

app.get('/api/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  })
  res.write(`data: ${JSON.stringify({ kind: 'hello', at: Date.now() })}\n\n`)
  clients.add(res)
  const keepAlive = setInterval(() => {
    try {
      res.write(': ping\n\n')
    } catch {
      clearInterval(keepAlive)
    }
  }, 25000)
  req.on('close', () => {
    clearInterval(keepAlive)
    clients.delete(res)
  })
})

app.use((err, _req, res, _next) => {
  console.error('[api] erro:', err.message)
  res.status(500).json({ error: err.message })
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`[api] CRM Notes API em http://0.0.0.0:${PORT}`)
})

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    store.save()
    server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 500)
  })
}
