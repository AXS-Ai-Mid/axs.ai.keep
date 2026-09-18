import { useMemo, useState } from 'react'
import {
  AlarmClock, Archive, BarChart3, Bell, ChevronDown, Inbox, Kanban, Palette, Pencil, Plus, StickyNote, Tag, Trash2, X,
} from 'lucide-react'
import { STAGES } from '../lib/constants'
import { colorOf } from '../lib/colors'
import type { Category, ColorKey, Note, StageId, ViewKey } from '../types'

interface Props {
  notes: Note[]
  categories: Category[]
  view: ViewKey
  activeCategoryId: string | null
  activeStage: StageId | null
  onSelectView: (view: ViewKey) => void
  onSelectCategory: (categoryId: string | null) => void
  onSelectStage: (stage: StageId | null) => void
  onAddCategory: (name: string, color: ColorKey) => void
  onUpdateCategory: (id: string, patch: Partial<Category>) => void
  onDeleteCategory: (id: string) => void
  onNewNote: () => void
  collapsed: boolean
  onClose: () => void
}

const CATEGORY_COLORS: ColorKey[] = ['azul', 'ciano', 'esmeralda', 'violeta', 'ambar', 'rosa', 'grafite', 'laranja']

export default function Sidebar({
  notes, categories, view, activeCategoryId, activeStage, onSelectView, onSelectCategory, onSelectStage,
  onAddCategory, onUpdateCategory, onDeleteCategory, onNewNote, collapsed, onClose,
}: Props) {
  const [categoryPanelOpen, setCategoryPanelOpen] = useState(false)
  const [stagePanelOpen, setStagePanelOpen] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState<ColorKey>('azul')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const counts = useMemo(() => {
    const visible = notes.filter((note) => !note.trashed && !note.archived)
    const byCategory = new Map<string, number>()
    for (const note of visible) {
      if (!note.categoryId) continue
      byCategory.set(note.categoryId, (byCategory.get(note.categoryId) ?? 0) + 1)
    }
    const byStage = new Map<StageId, number>()
    for (const note of visible) {
      if (!note.inPipeline) continue
      byStage.set(note.stage, (byStage.get(note.stage) ?? 0) + 1)
    }
    return {
      all: visible.length,
      pinned: visible.filter((note) => note.pinned).length,
      uncategorized: visible.filter((note) => !note.categoryId).length,
      archived: notes.filter((note) => note.archived && !note.trashed).length,
      trashed: notes.filter((note) => note.trashed).length,
      byCategory,
      byStage,
      pipeline: visible.filter((note) => note.inPipeline).length,
    }
  }, [notes])

  const handleSubmitCategory = () => {
    const name = newCategoryName.trim()
    if (!name) return
    onAddCategory(name, newCategoryColor)
    setNewCategoryName('')
  }

  const navItemClass = (active: boolean) =>
    `group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition ${
      active
        ? 'bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-200'
        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/70'
    }`

  if (collapsed) return null

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2.5 px-4 pb-3 pt-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-sm">
          <StickyNote size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">CRM Notes</p>
          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">Notas &amp; Pipeline de Vendas</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" aria-label="Fechar menu">
          <X size={18} />
        </button>
      </div>

      <div className="px-3 pb-3">
        <button
          onClick={onNewNote}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-3 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.99]"
        >
          <Plus size={17} />
          Nova nota
        </button>
      </div>

      <nav className="slim-scroll flex-1 overflow-y-auto px-2 pb-4">
        <div className="space-y-0.5">
          <button className={navItemClass(view === 'notes' && !activeCategoryId && !activeStage)} onClick={() => onSelectView('notes')}>
            <StickyNote size={17} />
            <span className="flex-1 text-left">Todas as notas</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{counts.all}</span>
          </button>
          <button className={navItemClass(view === 'notes' && activeCategoryId === 'fixadas')} onClick={() => onSelectCategory('fixadas')}>
            <Bell size={17} className="text-amber-500" />
            <span className="flex-1 text-left">Fixadas</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{counts.pinned}</span>
          </button>
        </div>

        <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">CRM</p>
        <div className="space-y-0.5">
          <button className={navItemClass(view === 'pipeline')} onClick={() => onSelectView('pipeline')}>
            <Kanban size={17} className="text-violet-500" />
            <span className="flex-1 text-left">Pipeline de Vendas</span>
            <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-500/20 dark:text-violet-300">{counts.pipeline}</span>
          </button>
          <button className={navItemClass(view === 'reminders')} onClick={() => onSelectView('reminders')}>
            <AlarmClock size={17} className="text-rose-500" />
            <span className="flex-1 text-left">Lembretes</span>
          </button>
          <button className={navItemClass(view === 'agenda')} onClick={() => onSelectView('agenda')}>
            <BarChart3 size={17} className="text-sky-500" />
            <span className="flex-1 text-left">Agenda &amp; Análises</span>
          </button>
        </div>

        <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

        <button
          onClick={() => setStagePanelOpen((open) => !open)}
          className="flex w-full items-center gap-2 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <ChevronDown size={13} className={stagePanelOpen ? '' : '-rotate-90 transition'} />
          Etapas de atendimento
        </button>
        {stagePanelOpen && (
          <div className="space-y-0.5">
            {STAGES.map((stage) => (
              <button
                key={stage.id}
                className={navItemClass(view === 'notes' && activeStage === stage.id)}
                onClick={() => onSelectStage(stage.id)}
                title={stage.description}
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.accent }} />
                <span className="flex-1 truncate text-left">{stage.name}</span>
                <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {counts.byStage.get(stage.id) ?? 0}
                </span>
              </button>
            ))}
          </div>
        )}

        <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

        <button
          onClick={() => setCategoryPanelOpen((open) => !open)}
          className="flex w-full items-center gap-2 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
        >
          <ChevronDown size={13} className={categoryPanelOpen ? '' : '-rotate-90 transition'} />
          Categorias
        </button>

        {categoryPanelOpen && (
          <div className="space-y-0.5">
            <button className={navItemClass(view === 'notes' && activeCategoryId === 'sem-categoria')} onClick={() => onSelectCategory('sem-categoria')}>
              <Inbox size={16} className="text-slate-400" />
              <span className="flex-1 text-left">Sem categoria</span>
              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{counts.uncategorized}</span>
            </button>

            {categories.map((category) => {
              const color = colorOf(category.color)
              const active = view === 'notes' && activeCategoryId === category.id
              return (
                <div key={category.id} className="group/item relative">
                  {editingId === category.id ? (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        const name = editingName.trim()
                        if (name) onUpdateCategory(category.id, { name })
                        setEditingId(null)
                      }}
                      className="flex items-center gap-1.5 rounded-xl bg-slate-50 px-2 py-1.5 dark:bg-slate-800"
                    >
                      <input
                        autoFocus
                        value={editingName}
                        onChange={(event) => setEditingName(event.target.value)}
                        onBlur={() => setEditingId(null)}
                        className="min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                    </form>
                  ) : (
                    <button className={navItemClass(active)} onClick={() => onSelectCategory(category.id)} title={category.name}>
                      <Tag size={16} style={{ color: color.accent }} />
                      <span className="flex-1 truncate text-left">{category.name}</span>
                      <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 group-hover/item:hidden dark:bg-slate-800 dark:text-slate-400">
                        {counts.byCategory.get(category.id) ?? 0}
                      </span>
                      <span className="hidden items-center gap-1 group-hover/item:flex">
                        <Palette
                          size={13}
                          className="text-slate-400 hover:text-brand-600"
                          onClick={(event) => {
                            event.stopPropagation()
                            onUpdateCategory(category.id, { color: CATEGORY_COLORS[(CATEGORY_COLORS.indexOf(category.color) + 1) % CATEGORY_COLORS.length] })
                          }}
                        />
                        <Pencil
                          size={13}
                          className="text-slate-400 hover:text-brand-600"
                          onClick={(event) => {
                            event.stopPropagation()
                            setEditingId(category.id)
                            setEditingName(category.name)
                          }}
                        />
                        <Trash2
                          size={13}
                          className="text-slate-400 hover:text-rose-600"
                          onClick={(event) => {
                            event.stopPropagation()
                            if (window.confirm(`Excluir a categoria "${category.name}"? As notas serão mantidas sem categoria.`)) onDeleteCategory(category.id)
                          }}
                        />
                      </span>
                    </button>
                  )}
                </div>
              )
            })}

            <div className="mt-2 rounded-xl bg-slate-50 p-2 dark:bg-slate-800/60">
              <div className="flex items-center gap-1.5">
                <input
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  onKeyDown={(event) => event.key === 'Enter' && handleSubmitCategory()}
                  placeholder="Nova categoria..."
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm outline-none focus:border-brand-400 dark:border-slate-700 dark:bg-slate-900"
                />
                <button
                  onClick={handleSubmitCategory}
                  className="rounded-lg bg-brand-600 p-1.5 text-white hover:bg-brand-700"
                  aria-label="Adicionar categoria"
                >
                  <Plus size={15} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {CATEGORY_COLORS.map((colorKey) => {
                  const color = colorOf(colorKey)
                  return (
                    <button
                      key={colorKey}
                      onClick={() => setNewCategoryColor(colorKey)}
                      title={color.label}
                      className={`h-5 w-5 rounded-full border transition ${newCategoryColor === colorKey ? 'scale-110 ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900' : 'border-black/10'}`}
                      style={{ backgroundColor: color.bg, borderColor: color.border }}
                    />
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <div className="my-3 border-t border-slate-100 dark:border-slate-800" />

        <div className="space-y-0.5">
          <button className={navItemClass(view === 'notes' && activeCategoryId === 'arquivadas')} onClick={() => onSelectCategory('arquivadas')}>
            <Archive size={17} className="text-slate-400" />
            <span className="flex-1 text-left">Arquivadas</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{counts.archived}</span>
          </button>
          <button className={navItemClass(view === 'trash')} onClick={() => onSelectView('trash')}>
            <Trash2 size={17} className="text-slate-400" />
            <span className="flex-1 text-left">Lixeira</span>
            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{counts.trashed}</span>
          </button>
        </div>
      </nav>

      <div className="border-t border-slate-200 px-4 py-3 text-[11px] text-slate-400 dark:border-slate-800 dark:text-slate-500">
        Clique em <span className="font-semibold text-slate-500 dark:text-slate-400">Nova nota</span> para começar. Arraste cards no pipeline.
      </div>
    </aside>
  )
}
