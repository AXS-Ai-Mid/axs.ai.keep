/**
 * Persistência simples e robusta: arquivo JSON com escrita atômica e debounce.
 * Suficiente para um CRM de equipe pequena e mantém o setup sem dependências nativas.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildSeed } from './seed.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')
const TRASH_TTL_DAYS = 30

let db = null
let saveTimer = null

function emptyState() {
  return { notes: [], categories: [], reminders: [], settings: {}, version: 1 }
}

function readFile() {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return { ...emptyState(), ...parsed }
  } catch {
    return null
  }
}

/** Remove definitivamente notas na lixeira há mais de 30 dias (como no Keep). */
function purgeOldTrash(state) {
  const limit = Date.now() - TRASH_TTL_DAYS * 24 * 60 * 60 * 1000
  const before = state.notes.length
  state.notes = state.notes.filter((note) => {
    if (!note.trashed) return true
    const when = note.trashedAt ? Date.parse(note.trashedAt) : Date.now()
    return Number.isFinite(when) ? when > limit : true
  })
  return before - state.notes.length
}

function writeFileNow() {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true })
    const tmp = `${DB_FILE}.${process.pid}.tmp`
    fs.writeFileSync(tmp, JSON.stringify(db, null, 2))
    fs.renameSync(tmp, DB_FILE)
  } catch (err) {
    console.error('[store] falha ao salvar db.json:', err.message)
  }
}

export function init() {
  const existing = readFile()
  if (existing && Array.isArray(existing.notes)) {
    db = existing
    const purged = purgeOldTrash(db)
    if (purged) console.log(`[store] ${purged} nota(s) antiga(s) da lixeira removida(s) automaticamente.`)
  } else {
    db = buildSeed()
    console.log('[store] banco criado com dados de exemplo.')
    writeFileNow()
  }
  return db
}

export function getState() {
  if (!db) init()
  return db
}

export function persist() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    writeFileNow()
  }, 120)
}

export function replaceState(next) {
  db = { ...emptyState(), ...next, version: 1 }
  writeFileNow()
  return db
}

export function reseed() {
  db = buildSeed()
  writeFileNow()
  return db
}

export function save() {
  writeFileNow()
}

export const paths = { DB_FILE, DATA_DIR }
