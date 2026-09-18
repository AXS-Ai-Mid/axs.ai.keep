/**
 * API do CRM Notes.
 * Persistência em server/data/db.json + sincronização via SSE em /api/events.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import * as store from './store.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DIST_DIR = process.env.DIST_DIR ? path.resolve(process.env.DIST_DIR) : path.resolve(__dirname, '..', 'dist')
const WEB_PORT = Number(process.env.WEB_PORT || process.env.HMR_CLIENT_PORT || 5173)

const PORT = Number(process.env.API_PORT || 3001)
const app = express()

/** SPA compilada existe? (mantida atualizada pelo processo `dev:build`) */
const hasBuild = () => fs.existsSync(path.join(DIST_DIR, 'index.html'))

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

/**
 * Serve o app compilado (dist/) na mesma porta da API. Assim a interface fica
 * acessível tanto em :5173 (Vite, com hot reload) quanto em :3001 (build),
 * evitando o "Cannot GET /" quando o preview abre a porta da API.
 */
app.use(express.static(DIST_DIR, { index: false, maxAge: '1h' }))

app.use((req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  if (req.path.startsWith('/api')) return res.status(404).json({ error: `rota não encontrada: ${req.method} ${req.path}` })
  if (hasBuild()) return res.sendFile(path.join(DIST_DIR, 'index.html'))
  return res.status(200).type('html').send(helpPage(req))
})

app.use((err, _req, res, _next) => {
  console.error('[api] erro:', err.message)
  res.status(500).json({ error: err.message })
})

/** Página de apoio exibida somente quando ainda não existe build (dist/). */
function helpPage(req) {
  const host = String(req.headers.host || `localhost:${PORT}`)
  // Em previews remotos o host começa com a porta (ex.: 3001-abc.e2b.app).
  const swapped = host.replace(/^(\d+)-/, `${WEB_PORT}-`)
  const target = swapped !== host ? `https://${swapped}` : `http://${host.replace(/:\d+$/, '')}:${WEB_PORT}`
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8" /><title>CRM Notes — API ativa</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta http-equiv="refresh" content="2;url=${target}" />
<style>
  body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0b1120;color:#e2e8f0;
       font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
  .card{max-width:520px;padding:32px;border-radius:24px;background:#111c33;border:1px solid #1e293b;text-align:center}
  h1{margin:0 0 8px;font-size:20px}
  p{margin:6px 0;color:#94a3b8;font-size:14px;line-height:1.5}
  a.btn{display:inline-block;margin-top:18px;padding:12px 20px;border-radius:14px;background:#4f46e5;color:#fff;
        font-weight:600;text-decoration:none}
  code{background:#1e293b;padding:2px 6px;border-radius:6px;color:#c7d2fe}
  .links{margin-top:14px;font-size:13px}
</style></head>
<body><div class="card">
  <h1>CRM Notes — API ativa nesta porta</h1>
  <p>A interface do sistema é servida pelo Vite na porta <code>${WEB_PORT}</code>.</p>
  <p>Redirecionando automaticamente…</p>
  <a class="btn" href="${target}">Abrir CRM Notes</a>
  <div class="links">
    <p>Ou rode <code>npm run preview</code> para servir a interface e a API na mesma porta.</p>
    <p><a href="/api/health" style="color:#a5b4fc">/api/health</a> ·
       <a href="/api/state" style="color:#a5b4fc">/api/state</a></p>
  </div>
</div>
<script>setTimeout(function(){location.replace(${JSON.stringify(target)})},1200)</script>
</body></html>`
}

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
