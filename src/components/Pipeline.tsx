import { useMemo, useRef, useState } from 'react'
import { Building2, CheckCircle2, Filter, Plus, Search, TrendingUp, Wallet, X } from 'lucide-react'
import NoteCard from './NoteCard'
import { STAGES } from '../lib/constants'
import { formatMoney } from '../lib/format'
import type { Category, ColorKey, Note, Reminder, StageId, ViewKey } from '../types'

interface Props {
  notes: Note[]
  categories: Category[]
  reminders: Reminder[]
  theme: 'light' | 'dark'
  search: string
  onSearch: (value: string) => void
  categoryFilter: string | null
  onCategoryFilter: (id: string | null) => void
  onOpenNote: (id: string) => void
  onMoveStage: (id: string, stage: StageId, beforeId?: string | null) => void
  onTogglePin: (id: string) => void
  onToggleArchive: (id: string) => void
  onTrash: (id: string) => void
  onColorChange: (id: string, color: ColorKey) => void
  onAddReminder: (note: Note) => void
  onDuplicate: (note: Note) => void
  onQuickAdd: (stage: StageId, data: { title: string; company: string; dealValue: number }) => void
  onSelectView: (view: ViewKey) => void
}

export default function Pipeline({
  notes, categories, reminders, theme, search, onSearch, categoryFilter, onCategoryFilter, onOpenNote, onMoveStage,
  onTogglePin, onToggleArchive, onTrash, onColorChange, onAddReminder, onDuplicate, onQuickAdd, onSelectView,
}: Props) {
  const [dragId, setDragId] = useState<string | null>(null)
  const [hover, setHover] = useState<{ stage: StageId; index: number; beforeId: string | null } | null>(null)
  const [quickAddStage, setQuickAddStage] = useState<StageId | null>(null)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickCompany, setQuickCompany] = useState('')
  const [quickValue, setQuickValue] = useState('')
  const columnRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const pipelineNotes = useMemo(() => {
    const term = search.trim().toLowerCase()
    return notes
      .filter((note) => note.inPipeline && !note.trashed && !note.archived)
      .filter((note) => (categoryFilter ? note.categoryId === categoryFilter : true))
      .filter((note) => {
        if (!term) return true
        return [note.title, note.content, note.company, note.client, note.email, ...(note.tags ?? [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term))
      })
      .sort((a, b) => a.order - b.order)
  }, [notes, search, categoryFilter])

  const byStage = useMemo(() => {
    const map = new Map<StageId, Note[]>()
    for (const stage of STAGES) map.set(stage.id, [])
    for (const note of pipelineNotes) {
      const list = map.get(note.stage) ?? []
      list.push(note)
      map.set(note.stage, list)
    }
    return map
  }, [pipelineNotes])

  const totalValue = pipelineNotes.reduce((sum, note) => sum + (note.dealValue || 0), 0)
  const wonValue = (byStage.get('fechamento') ?? []).reduce((sum, note) => sum + (note.dealValue || 0), 0)
  const openValue = totalValue - wonValue
  const nextReminderFor = (noteId: string) => {
    const pending = reminders.filter((reminder) => reminder.noteId === noteId && !reminder.done && reminder.active)
    if (!pending.length) return null
    return pending.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0].at
  }

  const handleDragOver = (event: React.DragEvent, stage: StageId) => {
    event.preventDefault()
    const container = columnRefs.current[stage]
    if (!container) return
    const cards = Array.from(container.querySelectorAll<HTMLElement>('[data-card-id]')).filter((el) => el.dataset.cardId !== dragId)
    let index = cards.length
    for (let i = 0; i < cards.length; i += 1) {
      const rect = cards[i].getBoundingClientRect()
      if (event.clientY < rect.top + rect.height / 2) {
        index = i
        break
      }
    }
    const beforeId = cards[index]?.dataset.cardId ?? null
    setHover((prev) => (prev && prev.stage === stage && prev.index === index ? prev : { stage, index, beforeId }))
  }

  const handleDrop = (event: React.DragEvent, stage: StageId) => {
    event.preventDefault()
    const id = dragId ?? event.dataTransfer.getData('text/plain')
    const beforeId = hover?.stage === stage ? hover.beforeId : null
    if (id) onMoveStage(id, stage, beforeId)
    setDragId(null)
    setHover(null)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              <TrendingUp size={19} className="text-violet-600" />
              Pipeline de Vendas
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Arraste os cards entre as 6 etapas do atendimento · {pipelineNotes.length} negócio(s) em andamento
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => onSearch(event.target.value)}
                placeholder="Buscar negócio, empresa, contato..."
                className="w-64 rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm outline-none focus:border-brand-400 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              {search && (
                <button onClick={() => onSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="relative">
              <Filter size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <select
                value={categoryFilter ?? ''}
                onChange={(event) => onCategoryFilter(event.target.value || null)}
                className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-8 pr-3 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="">Todas as categorias</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <SummaryTile label="Total no pipeline" value={totalValue} color="text-violet-700 dark:text-violet-300" icon={<Wallet size={15} />} />
          <SummaryTile label="Em negociação" value={openValue} color="text-amber-700 dark:text-amber-300" icon={<TrendingUp size={15} />} />
          <SummaryTile label="Fechado (ganho)" value={wonValue} color="text-emerald-700 dark:text-emerald-300" icon={<CheckCircle2 size={15} />} />
        </div>
      </header>

      <div className="slim-scroll flex-1 overflow-x-auto overflow-y-hidden p-4">
        <div className="flex h-full min-h-0 gap-3">
          {STAGES.map((stage) => {
            const stageNotes = byStage.get(stage.id) ?? []
            const sum = stageNotes.reduce((acc, note) => acc + (note.dealValue || 0), 0)
            const isHovered = hover?.stage === stage.id
            return (
              <section
                key={stage.id}
                onDragOver={(event) => handleDragOver(event, stage.id)}
                onDrop={(event) => handleDrop(event, stage.id)}
                onDragLeave={(event) => {
                  if (!event.currentTarget.contains(event.relatedTarget as Node)) setHover((prev) => (prev?.stage === stage.id ? null : prev))
                }}
                className={`flex h-full w-[300px] shrink-0 flex-col rounded-2xl border bg-slate-100/70 transition dark:bg-slate-900/50 ${
                  isHovered ? 'border-brand-400 ring-2 ring-brand-200 dark:ring-brand-500/30' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <header className="rounded-t-2xl border-b border-slate-200 bg-white px-3 py-2.5 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.accent }} />
                    <h2 className="flex-1 truncate text-sm font-semibold text-slate-700 dark:text-slate-200" title={stage.description}>
                      {stage.name}
                    </h2>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {stageNotes.length}
                    </span>
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: stage.accent }}>
                    <Wallet size={12} />
                    {formatMoney(sum)}
                  </p>
                </header>

                <div
                  ref={(el) => {
                    columnRefs.current[stage.id] = el
                  }}
                  className="slim-scroll flex-1 space-y-2.5 overflow-y-auto p-2.5"
                >
                  {stageNotes.length === 0 && !dragId && (
                    <p className="rounded-xl border border-dashed border-slate-300 px-3 py-6 text-center text-xs text-slate-400 dark:border-slate-700">
                      Nenhum negócio nesta etapa.
                      <br />
                      Arraste um card ou use o botão +.
                    </p>
                  )}

                  {stageNotes.map((note, index) => (
                    <div key={note.id} data-card-id={note.id} className="relative">
                      {isHovered && hover?.index === index && dragId !== note.id && (
                        <span className="absolute -top-1.5 left-2 right-2 z-10 h-0.5 rounded-full bg-brand-500" />
                      )}
                      <div className={dragId === note.id ? 'opacity-40' : ''}>
                        <NoteCard
                          note={note}
                          categories={categories}
                          theme={theme}
                          nextReminderAt={nextReminderFor(note.id)}
                          onOpen={onOpenNote}
                          onTogglePin={onTogglePin}
                          onToggleArchive={onToggleArchive}
                          onTrash={onTrash}
                          onDuplicate={onDuplicate}
                          onColorChange={onColorChange}
                          onAddReminder={onAddReminder}
                          onDragStart={setDragId}
                          onDragEnd={() => {
                            setDragId(null)
                            setHover(null)
                          }}
                        />
                      </div>
                    </div>
                  ))}

                  {isHovered && hover?.index === stageNotes.filter((note) => note.id !== dragId).length && (
                    <span className="block h-0.5 rounded-full bg-brand-500" />
                  )}

                  {quickAddStage === stage.id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        if (!quickTitle.trim()) return
                        const value = Number(quickValue.replace(/\./g, '').replace(',', '.')) || 0
                        onQuickAdd(stage.id, { title: quickTitle.trim(), company: quickCompany.trim(), dealValue: value })
                        setQuickTitle('')
                        setQuickCompany('')
                        setQuickValue('')
                        setQuickAddStage(null)
                      }}
                      className="space-y-2 rounded-xl border border-slate-200 bg-white p-2.5 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <input
                        autoFocus
                        value={quickTitle}
                        onChange={(event) => setQuickTitle(event.target.value)}
                        placeholder="Título do negócio"
                        className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                      <div className="relative">
                        <Building2 size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={quickCompany}
                          onChange={(event) => setQuickCompany(event.target.value)}
                          placeholder="Empresa"
                          className="w-full rounded-lg border border-slate-200 py-1.5 pl-7 pr-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="relative">
                        <Wallet size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          value={quickValue}
                          onChange={(event) => setQuickValue(event.target.value)}
                          placeholder="Valor (R$)"
                          className="w-full rounded-lg border border-slate-200 py-1.5 pl-7 pr-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        />
                      </div>
                      <div className="flex gap-1.5">
                        <button type="submit" className="flex-1 rounded-lg bg-brand-600 px-2 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                          Adicionar
                        </button>
                        <button
                          type="button"
                          onClick={() => setQuickAddStage(null)}
                          className="rounded-lg bg-slate-100 px-2 py-1.5 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                        >
                          Cancelar
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      onClick={() => setQuickAddStage(stage.id)}
                      className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 px-2 py-2 text-xs font-medium text-slate-500 transition hover:border-brand-400 hover:text-brand-600 dark:border-slate-700 dark:text-slate-400"
                    >
                      <Plus size={14} /> Negócio nesta etapa
                    </button>
                  )}
                </div>
              </section>
            )
          })}
        </div>
      </div>

      <footer className="border-t border-slate-200 bg-white px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 sm:px-6 no-print">
        Dica: clique em um card para editar empresa, contato, valor e alarme. O total de cada coluna é recalculado automaticamente.
        <button onClick={() => onSelectView('agenda')} className="ml-2 font-semibold text-brand-600 hover:underline dark:text-brand-300">
          Ver análises
        </button>
      </footer>
    </div>
  )
}

function SummaryTile({ label, value, color, icon }: { label: string; value: number; color: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-800/50">
      <span className={`grid h-8 w-8 place-items-center rounded-lg bg-white shadow-sm dark:bg-slate-900 ${color}`}>{icon}</span>
      <div className="min-w-0">
        <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`truncate text-sm font-bold ${color}`}>{formatMoney(value)}</p>
      </div>
    </div>
  )
}
