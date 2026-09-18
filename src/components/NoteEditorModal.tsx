import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlarmClock, Archive, BellRing, Building2, Calendar, Check, CheckSquare, Copy, Mail, Minus, Palette, Phone, Pin, Plus,
  RotateCcw, Tag, Trash2, User, Wallet, X,
} from 'lucide-react'
import { COLORS, colorOf, noteSurface } from '../lib/colors'
import { PRIORITIES, REPEAT_LABEL, STAGES } from '../lib/constants'
import { fromDateInput, fromDateTimeInput, formatDateTime, toDateInput } from '../lib/format'
import type { Category, ColorKey, Note, Priority, Reminder, Repeat, StageId } from '../types'

interface Props {
  note: Note | null
  categories: Category[]
  reminders: Reminder[]
  theme: 'light' | 'dark'
  onClose: () => void
  onChange: (id: string, patch: Partial<Note>) => void
  onTrash: (id: string) => void
  onRestore: (id: string) => void
  onDeleteForever: (id: string) => void
  onToggleArchive: (id: string) => void
  onDuplicate: (note: Note) => void
  onSaveReminder: (input: Partial<Reminder> & { title: string; at: string }) => void
  onUpdateReminder: (id: string, patch: Partial<Reminder>) => void
  onDeleteReminder: (id: string) => void
  onAddCategory: (name: string, color: ColorKey) => Category
  onToast: (message: string) => void
  initialTab?: Tab
}

export type Tab = 'nota' | 'crm' | 'checklist' | 'lembretes' | 'historico'

const TABS: { id: Tab; label: string }[] = [
  { id: 'nota', label: 'Nota' },
  { id: 'crm', label: 'CRM' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'lembretes', label: 'Alarmes' },
  { id: 'historico', label: 'Histórico' },
]

export default function NoteEditorModal({
  note, categories, reminders, theme, onClose, onChange, onTrash, onRestore, onDeleteForever, onToggleArchive, onDuplicate,
  onSaveReminder, onUpdateReminder, onDeleteReminder, onAddCategory, onToast, initialTab = 'nota',
}: Props) {
  const [tab, setTab] = useState<Tab>(initialTab)
  const [title, setTitle] = useState(note?.title ?? '')
  const [content, setContent] = useState(note?.content ?? '')
  const [tagInput, setTagInput] = useState('')
  const [colorOpen, setColorOpen] = useState(false)
  const [categoryOpen, setCategoryOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [company, setCompany] = useState(note?.company ?? '')
  const [client, setClient] = useState(note?.client ?? '')
  const [email, setEmail] = useState(note?.email ?? '')
  const [phone, setPhone] = useState(note?.phone ?? '')
  const [dealValue, setDealValue] = useState(String(note?.dealValue ?? ''))
  const [reminderAt, setReminderAt] = useState('')
  const [reminderRepeat, setReminderRepeat] = useState<Repeat>('none')
  const titleRef = useRef<HTMLInputElement>(null)

  const noteId = note?.id ?? null

  // Salva título/conteúdo com debounce
  useEffect(() => {
    if (!noteId) return
    const timer = window.setTimeout(() => {
      if (title !== note?.title || content !== note?.content) onChange(noteId, { title, content })
    }, 500)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, content, noteId])

  // Salva campos do CRM com debounce (apenas quando algo realmente mudou)
  useEffect(() => {
    if (!noteId || !note) return
    const timer = window.setTimeout(() => {
      const value = Number(String(dealValue).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0
      const current = { company: note.company ?? '', client: note.client ?? '', email: note.email ?? '', phone: note.phone ?? '', value: note.dealValue ?? 0 }
      if (current.company === company && current.client === client && current.email === email && current.phone === phone && current.value === value) return
      onChange(noteId, { company, client, email, phone, dealValue: value })
    }, 600)
    return () => window.clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company, client, email, phone, dealValue, noteId])

  // Mantém os valores mais recentes para "flush" ao desmontar
  const latestRef = useRef({ title, content, company, client, email, phone, dealValue, noteId })
  latestRef.current = { title, content, company, client, email, phone, dealValue, noteId }
  const noteRef = useRef(note)
  noteRef.current = note

  useEffect(
    () => () => {
      const local = latestRef.current
      const current = noteRef.current
      if (!local.noteId || !current) return
      const patch: Partial<Note> = {}
      if (local.title !== current.title) patch.title = local.title
      if (local.content !== current.content) patch.content = local.content
      if (local.company !== (current.company ?? '')) patch.company = local.company
      if (local.client !== (current.client ?? '')) patch.client = local.client
      if (local.email !== (current.email ?? '')) patch.email = local.email
      if (local.phone !== (current.phone ?? '')) patch.phone = local.phone
      const value = Number(String(local.dealValue).replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')) || 0
      if (value !== (current.dealValue ?? 0)) patch.dealValue = value
      if (Object.keys(patch).length > 0) onChange(local.noteId, patch)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    if (note && !note.title) titleRef.current?.focus()
  }, [note])

  const noteReminders = useMemo(
    () => reminders.filter((reminder) => reminder.noteId === noteId).sort((a, b) => Date.parse(a.at) - Date.parse(b.at)),
    [reminders, noteId],
  )
  const pendingReminders = noteReminders.filter((reminder) => !reminder.done)
  const checklist = note?.checklist ?? []
  const doneCount = checklist.filter((item) => item.done).length
  const category = categories.find((item) => item.id === note?.categoryId)
  const surface = note ? noteSurface(note.color, theme) : undefined
  const isDark = theme === 'dark'
  const chipText = isDark ? 'rgba(255,255,255,0.7)' : 'rgba(15,23,42,0.6)'

  if (!note || !noteId) return null

  const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wide'
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-100 dark:focus:ring-brand-500/20'

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, '')
    if (!tag) return
    if (note.tags.includes(tag)) {
      setTagInput('')
      return
    }
    onChange(noteId, { tags: [...note.tags, tag] })
    setTagInput('')
  }

  const handleSchedule = (minutesFromNow?: number) => {
    const at = minutesFromNow ? new Date(Date.now() + minutesFromNow * 60000).toISOString() : fromDateTimeInput(reminderAt)
    if (!at) {
      onToast('Escolha a data e a hora do alarme')
      return
    }
    onSaveReminder({
      noteId,
      title: note.title?.trim() || note.company || 'Lembrete da nota',
      at,
      repeat: reminderRepeat,
      done: false,
      active: true,
    })
    setReminderAt('')
    setReminderRepeat('none')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/45 p-3 backdrop-blur-sm sm:p-6" onMouseDown={onClose}>
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="animate-fade-up my-auto w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        {/* Cabeçalho */}
        <div className="flex items-start gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: STAGES.find((s) => s.id === note.stage)?.accent }} />
                {STAGES.find((s) => s.id === note.stage)?.name}
              </span>
              {note.inPipeline && (
                <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">
                  No pipeline
                </span>
              )}
              {note.trashed && (
                <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
                  Na lixeira
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-0.5">
            <HeaderButton title={note.pinned ? 'Desafixar' : 'Fixar'} active={note.pinned} onClick={() => onChange(noteId, { pinned: !note.pinned })}>
              <Pin size={16} fill={note.pinned ? 'currentColor' : 'none'} />
            </HeaderButton>
            <div className="relative">
              <HeaderButton title="Cores" active={colorOpen} onClick={() => setColorOpen((open) => !open)}>
                <Palette size={16} />
              </HeaderButton>
              {colorOpen && (
                <div className="absolute right-0 z-30 mt-1 w-56 rounded-2xl border border-slate-200 bg-white p-3 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">20 cores</p>
                  <div className="grid grid-cols-5 gap-2">
                    {COLORS.map((color) => (
                      <button
                        key={color.key}
                        title={color.label}
                        onClick={() => {
                          onChange(noteId, { color: color.key })
                          setColorOpen(false)
                        }}
                        className={`h-7 w-7 rounded-full border transition hover:scale-110 ${note.color === color.key ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                        style={{ backgroundColor: isDark ? color.darkBg : color.bg, borderColor: isDark ? color.darkBorder : color.border }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
            <HeaderButton title="Duplicar" onClick={() => onDuplicate(note)}>
              <Copy size={16} />
            </HeaderButton>
            <HeaderButton title={note.archived ? 'Desarquivar' : 'Arquivar'} onClick={() => onToggleArchive(noteId)}>
              <Archive size={16} />
            </HeaderButton>
            {note.trashed ? (
              <>
                <HeaderButton title="Restaurar" onClick={() => onRestore(noteId)}>
                  <RotateCcw size={16} />
                </HeaderButton>
                <HeaderButton title="Excluir definitivamente" danger onClick={() => onDeleteForever(noteId)}>
                  <Trash2 size={16} />
                </HeaderButton>
              </>
            ) : (
              <HeaderButton title="Mover para lixeira" danger onClick={() => onTrash(noteId)}>
                <Trash2 size={16} />
              </HeaderButton>
            )}
            <HeaderButton title="Fechar" onClick={onClose}>
              <X size={18} />
            </HeaderButton>
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-3 pt-2 dark:border-slate-800 sm:px-5">
          {TABS.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`relative whitespace-nowrap rounded-t-lg px-3 py-2 text-sm font-medium transition ${
                tab === item.id
                  ? 'text-brand-700 dark:text-brand-300'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              {item.label}
              {item.id === 'checklist' && checklist.length > 0 && <span className="ml-1 text-[10px] text-slate-400">{doneCount}/{checklist.length}</span>}
              {item.id === 'lembretes' && pendingReminders.length > 0 && (
                <span className="ml-1 rounded-full bg-rose-100 px-1.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">{pendingReminders.length}</span>
              )}
              {tab === item.id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand-600" />}
            </button>
          ))}
        </div>

        {/* Corpo */}
        <div className="slim-scroll max-h-[62vh] overflow-y-auto px-4 py-4 sm:px-5">
          {tab === 'nota' && (
            <div className="space-y-4">
              <input
                ref={titleRef}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Título da nota"
                className="w-full border-none bg-transparent text-xl font-semibold text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
              />
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Escreva os detalhes, combinados e próximos passos..."
                rows={10}
                className="note-body w-full resize-y rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 text-[14px] leading-relaxed text-slate-700 outline-none transition focus:border-brand-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:focus:bg-slate-800"
              />
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} style={{ color: chipText }}>
                    Categoria
                  </label>
                  <div className="relative">
                    <button
                      onClick={() => setCategoryOpen((open) => !open)}
                      className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-left dark:border-slate-700 dark:bg-slate-900"
                    >
                      {category ? (
                        <>
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(category.color).accent }} />
                          <span className="flex-1 truncate">{category.name}</span>
                        </>
                      ) : (
                        <span className="flex-1 text-slate-400">Sem categoria</span>
                      )}
                    </button>
                    {categoryOpen && (
                      <div className="absolute z-30 mt-1 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
                        <button
                          onClick={() => {
                            onChange(noteId, { categoryId: null })
                            setCategoryOpen(false)
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          <Minus size={14} /> Sem categoria
                        </button>
                        {categories.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => {
                              onChange(noteId, { categoryId: item.id })
                              setCategoryOpen(false)
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colorOf(item.color).accent }} />
                            <span className="flex-1 truncate text-left">{item.name}</span>
                            {note.categoryId === item.id && <Check size={14} className="text-brand-600" />}
                          </button>
                        ))}
                        <div className="mt-1 flex items-center gap-1.5 border-t border-slate-100 pt-2 dark:border-slate-800">
                          <input
                            value={newCategory}
                            onChange={(event) => setNewCategory(event.target.value)}
                            placeholder="Criar categoria..."
                            className="min-w-0 flex-1 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                            onKeyDown={(event) => {
                              if (event.key === 'Enter' && newCategory.trim()) {
                                const created = onAddCategory(newCategory.trim(), 'azul')
                                onChange(noteId, { categoryId: created.id })
                                setNewCategory('')
                                setCategoryOpen(false)
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (!newCategory.trim()) return
                              const created = onAddCategory(newCategory.trim(), 'azul')
                              onChange(noteId, { categoryId: created.id })
                              setNewCategory('')
                              setCategoryOpen(false)
                            }}
                            className="rounded-lg bg-brand-600 p-1.5 text-white"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelClass} style={{ color: chipText }}>
                    Prioridade
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {PRIORITIES.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => onChange(noteId, { priority: item.id as Priority })}
                        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                          note.priority === item.id ? item.chip + ' ring-2 ring-offset-1 dark:ring-offset-slate-900 ' + item.ring : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className={labelClass} style={{ color: chipText }}>
                    Etapa do atendimento
                  </label>
                  <select
                    value={note.stage}
                    onChange={(event) => onChange(noteId, { stage: event.target.value as StageId })}
                    className={inputClass}
                  >
                    {STAGES.map((stage) => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name}
                      </option>
                    ))}
                  </select>
                  <label className="mt-2 flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={note.inPipeline}
                      onChange={(event) => onChange(noteId, { inPipeline: event.target.checked })}
                      className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                    />
                    Exibir no quadro do Pipeline
                  </label>
                </div>

                <div>
                  <label className={labelClass} style={{ color: chipText }}>
                    Previsão de fechamento
                  </label>
                  <input
                    type="date"
                    value={toDateInput(note.dueDate)}
                    onChange={(event) => onChange(noteId, { dueDate: fromDateInput(event.target.value) })}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={labelClass} style={{ color: chipText }}>
                  Tags
                </label>
                <div className="flex flex-wrap items-center gap-1.5">
                  {note.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-700 dark:bg-brand-500/15 dark:text-brand-200">
                      #{tag}
                      <button onClick={() => onChange(noteId, { tags: note.tags.filter((item) => item !== tag) })} className="hover:text-rose-600">
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                  <div className="inline-flex items-center gap-1 rounded-full border border-dashed border-slate-300 px-2 py-1 dark:border-slate-600">
                    <Tag size={12} className="text-slate-400" />
                    <input
                      value={tagInput}
                      onChange={(event) => setTagInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ',') {
                          event.preventDefault()
                          addTag()
                        }
                      }}
                      placeholder="nova tag"
                      className="w-24 bg-transparent text-xs outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === 'crm' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2 flex items-center gap-2 rounded-2xl bg-slate-50 px-3 py-2.5 text-sm text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
                <Building2 size={16} className="text-brand-600" />
                Preencha os dados do negócio — eles aparecem nos cards e nas somas do Kanban.
              </div>
              <div>
                <label className={labelClass} style={{ color: chipText }}>
                  Empresa
                </label>
                <div className="relative">
                  <Building2 size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Nome da empresa" className={`${inputClass} pl-9`} />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ color: chipText }}>
                  Contato
                </label>
                <div className="relative">
                  <User size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={client} onChange={(event) => setClient(event.target.value)} placeholder="Nome do contato" className={`${inputClass} pl-9`} />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ color: chipText }}>
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={email} onChange={(event) => setEmail(event.target.value)} placeholder="contato@empresa.com.br" className={`${inputClass} pl-9`} />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ color: chipText }}>
                  Telefone
                </label>
                <div className="relative">
                  <Phone size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="(11) 90000-0000" className={`${inputClass} pl-9`} />
                </div>
              </div>
              <div>
                <label className={labelClass} style={{ color: chipText }}>
                  Valor do negócio (R$)
                </label>
                <div className="relative">
                  <Wallet size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={dealValue}
                    onChange={(event) => setDealValue(event.target.value)}
                    placeholder="0,00"
                    inputMode="decimal"
                    className={`${inputClass} pl-9 font-semibold text-emerald-700 dark:text-emerald-400`}
                  />
                </div>
              </div>
              <div className="sm:col-span-2 flex flex-wrap gap-2">
                <a
                  href={email ? `mailto:${email}?subject=${encodeURIComponent(note.title || 'Contato CRM Notes')}` : undefined}
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${email ? 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700' : 'pointer-events-none bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                >
                  <Mail size={15} /> Enviar e-mail
                </a>
                <a
                  href={phone ? `https://wa.me/55${phone.replace(/\D/g, '')}` : undefined}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${phone ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-500/15 dark:text-emerald-300' : 'pointer-events-none bg-slate-100 text-slate-400 dark:bg-slate-800'}`}
                >
                  <Phone size={15} /> WhatsApp
                </a>
              </div>
            </div>
          )}

          {tab === 'checklist' && (
            <div className="space-y-2">
              <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
                <CheckSquare size={16} />
                {checklist.length ? `${doneCount} de ${checklist.length} concluídos` : 'Sem itens ainda'}
                {checklist.length > 0 && (
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
                  </div>
                )}
              </div>
              {checklist.map((item) => (
                <div key={item.id} className="group flex items-center gap-2.5 rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={() =>
                      onChange(noteId, { checklist: checklist.map((entry) => (entry.id === item.id ? { ...entry, done: !entry.done } : entry)) })
                    }
                    className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
                  />
                  <input
                    value={item.text}
                    onChange={(event) =>
                      onChange(noteId, { checklist: checklist.map((entry) => (entry.id === item.id ? { ...entry, text: event.target.value } : entry)) })
                    }
                    className={`flex-1 bg-transparent text-sm outline-none ${item.done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}
                  />
                  <button
                    onClick={() => onChange(noteId, { checklist: checklist.filter((entry) => entry.id !== item.id) })}
                    className="rounded-lg p-1 text-slate-400 opacity-0 transition hover:text-rose-600 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  const text = checkInput.trim()
                  if (!text) return
                  onChange(noteId, {
                    checklist: [...checklist, { id: `chk_${Date.now().toString(36)}`, text, done: false }],
                  })
                  setCheckInput('')
                }}
                className="flex items-center gap-2 pt-1"
              >
                <input
                  value={checkInput}
                  onChange={(event) => setCheckInput(event.target.value)}
                  placeholder="Novo item do checklist..."
                  className={inputClass}
                />
                <button type="submit" className="rounded-xl bg-brand-600 p-2.5 text-white hover:bg-brand-700">
                  <Plus size={16} />
                </button>
              </form>
            </div>
          )}

          {tab === 'lembretes' && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-200 p-3.5 dark:border-slate-700">
                <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <BellRing size={16} className="text-rose-500" /> Programar novo alarme
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass} style={{ color: chipText }}>
                      Data e hora
                    </label>
                    <input type="datetime-local" value={reminderAt} onChange={(event) => setReminderAt(event.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass} style={{ color: chipText }}>
                      Repetição
                    </label>
                    <select value={reminderRepeat} onChange={(event) => setReminderRepeat(event.target.value as Repeat)} className={inputClass}>
                      {(Object.keys(REPEAT_LABEL) as Repeat[]).map((key) => (
                        <option key={key} value={key}>
                          {REPEAT_LABEL[key]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button onClick={() => handleSchedule()} className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                    <Calendar size={15} /> Agendar
                  </button>
                  <button onClick={() => handleSchedule(5)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                    +5 min (teste)
                  </button>
                  <button onClick={() => handleSchedule(60)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                    +1 hora
                  </button>
                  <button onClick={() => handleSchedule(24 * 60)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200">
                    Amanhã
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                {noteReminders.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum alarme programado para esta nota.</p>}
                {noteReminders.map((reminder) => (
                  <div
                    key={reminder.id}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                      reminder.done
                        ? 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/40'
                        : 'border-rose-200 bg-rose-50/60 dark:border-rose-500/30 dark:bg-rose-500/10'
                    }`}
                  >
                    <AlarmClock size={16} className={reminder.done ? 'text-slate-400' : 'text-rose-600 dark:text-rose-400'} />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm ${reminder.done ? 'text-slate-500 line-through' : 'font-medium text-slate-700 dark:text-slate-200'}`}>
                        {formatDateTime(reminder.at)}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">{REPEAT_LABEL[reminder.repeat]}</p>
                    </div>
                    <button
                      onClick={() => onUpdateReminder(reminder.id, { done: !reminder.done })}
                      className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {reminder.done ? 'Reabrir' : 'Concluir'}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm('Excluir este alarme?')) onDeleteReminder(reminder.id)
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'historico' && (
            <div className="space-y-3">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Criada em <strong className="font-semibold text-slate-600 dark:text-slate-300">{formatDateTime(note.createdAt)}</strong> · última alteração{' '}
                <strong className="font-semibold text-slate-600 dark:text-slate-300">{formatDateTime(note.updatedAt)}</strong>
              </p>
              <ol className="relative space-y-3 border-l border-slate-200 pl-4 dark:border-slate-700">
                {[...(note.history ?? [])].map((entry) => (
                  <li key={entry.id} className="relative">
                    <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-brand-500" />
                    <p className="text-sm text-slate-700 dark:text-slate-200">{entry.text}</p>
                    <p className="text-xs text-slate-400">{formatDateTime(entry.at)}</p>
                  </li>
                ))}
                {(!note.history || note.history.length === 0) && <li className="text-sm text-slate-500 dark:text-slate-400">Sem movimentações registradas.</li>}
              </ol>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 dark:border-slate-800 sm:px-5">
          <div className="flex items-center gap-2 text-xs" style={{ color: chipText }}>
            <span className="inline-flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: surface?.backgroundColor, borderColor: surface?.borderColor }} />
              {colorOf(note.color).label}
            </span>
            <span>·</span>
            <span>{note.tags.length} tag(s)</span>
            <span>·</span>
            <span>{checklist.length} item(ns)</span>
          </div>
          <button onClick={onClose} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Concluir
          </button>
        </div>
      </div>
    </div>
  )
}

function HeaderButton({ children, title, onClick, danger = false, active = false }: { children: React.ReactNode; title: string; onClick?: () => void; danger?: boolean; active?: boolean }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-xl p-2 transition ${
        active
          ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/20 dark:text-brand-300'
          : danger
            ? 'text-slate-500 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-400'
            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
      }`}
    >
      {children}
    </button>
  )
}
