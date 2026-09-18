import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle, Archive, BellPlus, Check, Lightbulb, ListFilter, Loader2, Plus, RotateCcw, Search, Sparkles, Tag, Trash2, X,
} from 'lucide-react'
import Sidebar from './components/Sidebar'
import TopBar, { type Layout, type SortKey } from './components/TopBar'
import NoteCard from './components/NoteCard'
import NoteEditorModal, { type Tab as EditorTab } from './components/NoteEditorModal'
import Pipeline from './components/Pipeline'
import RemindersView from './components/RemindersView'
import AgendaView from './components/AgendaView'
import ReminderPopup from './components/ReminderPopup'
import SettingsModal from './components/SettingsModal'
import { useCrmNotes } from './hooks/useCrmNotes'
import { STAGES, STAGE_MAP } from './lib/constants'
import { colorOf } from './lib/colors'
import type { ColorKey, Note, Priority, StageId, ViewKey } from './types'

export default function App() {
  const crm = useCrmNotes()
  const {
    ready, error, notes, categories, reminders, settings, activeReminder, dueReminders, toast, showToast,
  } = crm

  const [view, setView] = useState<ViewKey>('notes')
  const [categoryId, setCategoryId] = useState<string | null>(null)
  const [stageFilter, setStageFilter] = useState<StageId | null>(null)
  const [search, setSearch] = useState('')
  const [priority, setPriority] = useState<Priority | 'todas'>('todas')
  const [sort, setSort] = useState<SortKey>('recentes')
  const [layout, setLayout] = useState<Layout>('masonry')
  const [navOpen, setNavOpen] = useState(false)
  const [editorId, setEditorId] = useState<string | null>(null)
  const [editorTab, setEditorTab] = useState<EditorTab>('nota')
  const [previewReminderId, setPreviewReminderId] = useState<string | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerTitle, setComposerTitle] = useState('')
  const [composerContent, setComposerContent] = useState('')
  const [pipelineSearch, setPipelineSearch] = useState('')
  const [pipelineCategory, setPipelineCategory] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Atalhos de teclado: Ctrl+K busca, Esc fecha a composição
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        searchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const openEditor = (id: string, tab: EditorTab = 'nota') => {
    setEditorTab(tab)
    setEditorId(id)
  }

  const handleNewNote = (partial: Partial<Note> = {}, open = true) => {
    const note = crm.createNote(partial)
    if (open) openEditor(note.id)
    return note
  }

  const handleDuplicate = (note: Note) => {
    const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, order: _order, history: _history, ...rest } = note
    void _id
    void _createdAt
    void _updatedAt
    void _order
    void _history
    const copy = crm.createNote({
      ...rest,
      title: note.title ? `${note.title} (cópia)` : '',
      pinned: false,
      archived: false,
      trashed: false,
      trashedAt: null,
      history: [],
    })
    showToast('Nota duplicada')
    openEditor(copy.id)
  }

  const handleSelectView = (next: ViewKey) => {
    setView(next)
    setCategoryId(null)
    setStageFilter(null)
    setNavOpen(false)
  }

  const handleSelectCategory = (id: string | null) => {
    setView('notes')
    setCategoryId(id)
    setStageFilter(null)
    setNavOpen(false)
  }

  const handleSelectStage = (stage: StageId | null) => {
    setView('notes')
    setStageFilter(stage)
    setCategoryId(stage ? null : categoryId)
    setNavOpen(false)
  }

  const filtered = useMemo(() => {
    if (view === 'trash') return notes.filter((note) => note.trashed)
    const term = search.trim().toLowerCase()
    let list = notes.filter((note) => !note.trashed)

    if (categoryId === 'arquivadas') list = list.filter((note) => note.archived)
    else list = list.filter((note) => !note.archived)

    if (categoryId === 'fixadas') list = list.filter((note) => note.pinned)
    else if (categoryId === 'sem-categoria') list = list.filter((note) => !note.categoryId)
    else if (categoryId && categoryId !== 'arquivadas') list = list.filter((note) => note.categoryId === categoryId)

    if (stageFilter) list = list.filter((note) => note.inPipeline && note.stage === stageFilter)
    if (priority !== 'todas') list = list.filter((note) => note.priority === priority)

    if (term) {
      list = list.filter((note) =>
        [note.title, note.content, note.company, note.client, note.email, note.phone, ...(note.tags ?? [])]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term)),
      )
    }

    const priorityWeight: Record<Priority, number> = { urgente: 0, alta: 1, media: 2, baixa: 3 }
    return [...list].sort((a, b) => {
      if (sort === 'valor') return (b.dealValue || 0) - (a.dealValue || 0)
      if (sort === 'titulo') return (a.title || '').localeCompare(b.title || '', 'pt-BR')
      if (sort === 'criacao') return Date.parse(b.createdAt) - Date.parse(a.createdAt)
      if (sort === 'previsao') {
        const av = a.dueDate ? Date.parse(a.dueDate) : Number.MAX_SAFE_INTEGER
        const bv = b.dueDate ? Date.parse(b.dueDate) : Number.MAX_SAFE_INTEGER
        return av - bv
      }
      if (sort === 'prioridade') return priorityWeight[a.priority] - priorityWeight[b.priority]
      return Date.parse(b.updatedAt) - Date.parse(a.updatedAt)
    })
  }, [notes, view, categoryId, stageFilter, priority, search, sort])

  const pinned = filtered.filter((note) => note.pinned)
  const others = filtered.filter((note) => !note.pinned)
  const trashedCount = notes.filter((note) => note.trashed).length
  const pendingReminders = reminders.filter((reminder) => !reminder.done && reminder.active)

  const headerInfo = useMemo(() => {
    if (view === 'pipeline') return { title: 'Pipeline de Vendas', subtitle: 'Kanban com as 6 etapas de atendimento' }
    if (view === 'reminders') return { title: 'Lembretes', subtitle: `${pendingReminders.length} alarme(s) pendente(s)` }
    if (view === 'agenda') return { title: 'Agenda & Análises', subtitle: 'Calendário, funil e indicadores' }
    if (view === 'trash') return { title: 'Lixeira', subtitle: `${trashedCount} nota(s) — exclusão definitiva após 30 dias` }
    if (stageFilter) return { title: STAGE_MAP[stageFilter].name, subtitle: STAGE_MAP[stageFilter].description }
    if (categoryId === 'fixadas') return { title: 'Notas fixadas', subtitle: 'Acesso rápido ao que é prioritário' }
    if (categoryId === 'arquivadas') return { title: 'Arquivadas', subtitle: 'Notas guardadas fora do fluxo principal' }
    if (categoryId === 'sem-categoria') return { title: 'Sem categoria', subtitle: 'Notas ainda não classificadas' }
    if (categoryId) {
      const category = categories.find((item) => item.id === categoryId)
      return { title: category?.name ?? 'Categoria', subtitle: 'Notas da categoria' }
    }
    return { title: 'Todas as notas', subtitle: `${filtered.length} nota(s) · organizadas por cor, categoria e etapa` }
  }, [view, categoryId, stageFilter, categories, filtered.length, trashedCount, pendingReminders.length])

  const nextReminderFor = (noteId: string) => {
    const pending = reminders.filter((reminder) => reminder.noteId === noteId && !reminder.done && reminder.active)
    if (!pending.length) return null
    return pending.sort((a, b) => Date.parse(a.at) - Date.parse(b.at))[0].at
  }

  const editorNote = editorId ? notes.find((note) => note.id === editorId) ?? null : null
  const previewReminder = previewReminderId ? reminders.find((reminder) => reminder.id === previewReminderId) ?? null : null
  const popupReminder = activeReminder ?? previewReminder
  const popupNote = popupReminder?.noteId ? notes.find((note) => note.id === popupReminder.noteId) : undefined

  if (!ready) {
    return (
      <div className="grid h-screen place-items-center bg-slate-100 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="animate-spin" size={28} />
          <p className="text-sm">Carregando CRM Notes...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100 dark:bg-slate-950">
      <div className="hidden lg:block">
        <Sidebar
          notes={notes}
          categories={categories}
          view={view}
          activeCategoryId={categoryId}
          activeStage={stageFilter}
          onSelectView={handleSelectView}
          onSelectCategory={handleSelectCategory}
          onSelectStage={handleSelectStage}
          onAddCategory={crm.addCategory}
          onUpdateCategory={crm.updateCategory}
          onDeleteCategory={crm.deleteCategory}
          onNewNote={() => handleNewNote({ inPipeline: view === 'pipeline', stage: stageFilter ?? 'prospeccao' })}
          collapsed={false}
          onClose={() => setNavOpen(false)}
        />
      </div>

      {navOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setNavOpen(false)} />
          <div className="relative z-10 h-full">
            <Sidebar
              notes={notes}
              categories={categories}
              view={view}
              activeCategoryId={categoryId}
              activeStage={stageFilter}
              onSelectView={handleSelectView}
              onSelectCategory={handleSelectCategory}
              onSelectStage={handleSelectStage}
              onAddCategory={crm.addCategory}
              onUpdateCategory={crm.updateCategory}
              onDeleteCategory={crm.deleteCategory}
              onNewNote={() => handleNewNote({ inPipeline: view === 'pipeline', stage: stageFilter ?? 'prospeccao' })}
              collapsed={false}
              onClose={() => setNavOpen(false)}
            />
          </div>
        </div>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <TopBar
          title={headerInfo.title}
          subtitle={headerInfo.subtitle}
          search={view === 'pipeline' ? pipelineSearch : search}
          onSearch={view === 'pipeline' ? setPipelineSearch : setSearch}
          searchRef={searchRef}
          priority={priority}
          onPriority={setPriority}
          sort={sort}
          onSort={setSort}
          layout={layout}
          onLayout={setLayout}
          theme={settings.theme}
          onToggleTheme={() => crm.updateSettings({ theme: settings.theme === 'dark' ? 'light' : 'dark' })}
          notificationsEnabled={settings.notificationsEnabled}
          onToggleNotifications={() => {
            if (settings.notificationsEnabled) {
              crm.updateSettings({ notificationsEnabled: false })
            } else {
              setSettingsOpen(true)
              showToast('Autorize as notificações em Configurações')
            }
          }}
          pendingReminders={pendingReminders.length}
          onOpenReminders={() => handleSelectView('reminders')}
          onOpenSettings={() => setSettingsOpen(true)}
          onOpenNav={() => setNavOpen(true)}
        />

        {error && (
          <div className="flex items-center gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
            <AlertTriangle size={14} />
            Não foi possível falar com a API ({error}). Suba o backend com <code className="mx-1 rounded bg-amber-100 px-1 dark:bg-amber-500/20">npm run dev</code> para persistir os dados.
          </div>
        )}

        {(view === 'notes' || view === 'trash') && (
          <div className="slim-scroll flex-1 overflow-y-auto px-4 pb-8 pt-4 sm:px-6">
            {/* Composer estilo Keep */}
            <div className={`mx-auto mb-5 w-full max-w-2xl ${view === 'trash' ? 'hidden' : ''}`}>
              <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
                {composerOpen ? (
                  <>
                    <input
                      autoFocus
                      value={composerTitle}
                      onChange={(event) => setComposerTitle(event.target.value)}
                      placeholder="Título"
                      className="w-full border-none bg-transparent px-1 text-[15px] font-semibold outline-none placeholder:text-slate-400 dark:text-slate-100"
                    />
                    <textarea
                      value={composerContent}
                      onChange={(event) => setComposerContent(event.target.value)}
                      placeholder="Anote o combinado, o próximo passo, o valor do negócio..."
                      rows={3}
                      className="note-body mt-1 w-full resize-none border-none bg-transparent px-1 text-sm outline-none placeholder:text-slate-400 dark:text-slate-200"
                    />
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => {
                            const note = handleNewNote({
                              title: composerTitle,
                              content: composerContent,
                              inPipeline: false,
                              stage: stageFilter ?? 'prospeccao',
                            })
                            setComposerTitle('')
                            setComposerContent('')
                            setComposerOpen(false)
                            showToast('Nota criada')
                            void note
                          }}
                          className="rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700"
                        >
                          Salvar nota
                        </button>
                        <button
                          onClick={() => {
                            const note = handleNewNote({
                              title: composerTitle || 'Novo negócio',
                              content: composerContent,
                              inPipeline: true,
                              stage: stageFilter ?? 'prospeccao',
                            })
                            setComposerTitle('')
                            setComposerContent('')
                            setComposerOpen(false)
                            openEditor(note.id, 'crm')
                          }}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-100 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-200 dark:bg-violet-500/20 dark:text-violet-300"
                        >
                          <Sparkles size={13} /> Criar negócio no pipeline
                        </button>
                        <button
                          onClick={() => {
                            setComposerOpen(false)
                            setComposerTitle('')
                            setComposerContent('')
                          }}
                          className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                        >
                          Cancelar
                        </button>
                      </div>
                      <span className="text-[10.5px] text-slate-400">As alterações são salvas automaticamente</span>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setComposerOpen(true)}
                    className="flex w-full items-center gap-3 rounded-xl px-1.5 py-1.5 text-left text-sm text-slate-400 transition hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <Lightbulb size={18} className="text-amber-500" />
                    Criar uma nota rápida...
                    <span className="ml-auto inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Plus size={13} /> nova
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Chips de filtros ativos */}
            {(categoryId || stageFilter || priority !== 'todas' || search) && (
              <div className="mx-auto mb-4 flex w-full max-w-5xl flex-wrap items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <ListFilter size={13} /> Filtros ativos:
                </span>
                {stageFilter && <FilterChip label={STAGE_MAP[stageFilter].name} color={STAGE_MAP[stageFilter].accent} onClear={() => setStageFilter(null)} />}
                {categoryId && (
                  <FilterChip
                    label={
                      categoryId === 'fixadas' ? 'Fixadas'
                        : categoryId === 'arquivadas' ? 'Arquivadas'
                          : categoryId === 'sem-categoria' ? 'Sem categoria'
                            : categories.find((item) => item.id === categoryId)?.name ?? 'Categoria'
                    }
                    color={categoryId.startsWith('cat') ? colorOf(categories.find((item) => item.id === categoryId)?.color).accent : '#64748b'}
                    onClear={() => setCategoryId(null)}
                  />
                )}
                {priority !== 'todas' && <FilterChip label={`Prioridade ${priority}`} color="#dc2626" onClear={() => setPriority('todas')} />}
                {search && <FilterChip label={`Busca: "${search}"`} color="#4f46e5" onClear={() => setSearch('')} />}
              </div>
            )}

            {view === 'trash' ? (
              <div className="mx-auto w-full max-w-5xl space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Notas na lixeira são excluídas automaticamente após <strong>30 dias</strong>. Você também pode restaurar ou excluir agora.
                  </p>
                  <button
                    onClick={() => {
                      if (window.confirm('Esvaziar a lixeira? As notas serão excluídas definitivamente.')) crm.emptyTrash()
                    }}
                    className="inline-flex items-center gap-2 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300"
                  >
                    <Trash2 size={14} /> Esvaziar lixeira
                  </button>
                </div>
                {filtered.length === 0 ? (
                  <EmptyState icon={<Trash2 size={30} />} title="Lixeira vazia" description="Notas movidas para a lixeira aparecem aqui por 30 dias." />
                ) : (
                  <NoteGrid
                    notes={filtered}
                    layout={layout}
                    categories={categories}
                    theme={settings.theme}
                    nextReminderFor={nextReminderFor}
                    onOpen={(id) => openEditor(id)}
                    onTogglePin={crm.togglePin}
                    onToggleArchive={crm.toggleArchive}
                    onTrash={crm.trashNote}
                    onRestore={crm.restoreNote}
                    onDeleteForever={(id) => {
                      if (window.confirm('Excluir esta nota definitivamente?')) crm.deleteNote(id)
                    }}
                    onColorChange={(id, color) => crm.updateNote(id, { color: color as ColorKey })}
                  />
                )}
              </div>
            ) : (
              <div className="mx-auto w-full max-w-[1500px]">
                {notes.length === 0 && (
                  <EmptyState
                    icon={<Sparkles size={30} />}
                    title="Comece agora"
                    description="Crie sua primeira nota ou restaure os dados de exemplo com clientes, pipeline e alarmes prontos para testar."
                    action={
                      <button
                        onClick={() => void crm.reseed()}
                        className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
                      >
                        <RotateCcw size={15} /> Carregar dados de exemplo
                      </button>
                    }
                  />
                )}

                {pinned.length > 0 && (
                  <>
                    <SectionTitle icon={<Tag size={13} />} label="Fixadas" count={pinned.length} />
                    <NoteGrid
                      notes={pinned}
                      layout={layout}
                      categories={categories}
                      theme={settings.theme}
                      nextReminderFor={nextReminderFor}
                      onOpen={(id) => openEditor(id)}
                      onTogglePin={crm.togglePin}
                      onToggleArchive={crm.toggleArchive}
                      onTrash={crm.trashNote}
                      onDuplicate={handleDuplicate}
                      onColorChange={(id, color) => crm.updateNote(id, { color: color as ColorKey })}
                      onAddReminder={(note) => openEditor(note.id, 'lembretes')}
                    />
                  </>
                )}

                {others.length > 0 && (
                  <>
                    {pinned.length > 0 && <SectionTitle icon={<Archive size={13} />} label="Outras" count={others.length} />}
                    <NoteGrid
                      notes={others}
                      layout={layout}
                      categories={categories}
                      theme={settings.theme}
                      nextReminderFor={nextReminderFor}
                      onOpen={(id) => openEditor(id)}
                      onTogglePin={crm.togglePin}
                      onToggleArchive={crm.toggleArchive}
                      onTrash={crm.trashNote}
                      onDuplicate={handleDuplicate}
                      onColorChange={(id, color) => crm.updateNote(id, { color: color as ColorKey })}
                      onAddReminder={(note) => openEditor(note.id, 'lembretes')}
                    />
                  </>
                )}

                {notes.length > 0 && filtered.length === 0 && (
                  <EmptyState
                    icon={<Search size={30} />}
                    title="Nenhuma nota encontrada"
                    description="Ajuste a busca ou limpe os filtros para ver mais resultados."
                    action={
                      <button
                        onClick={() => {
                          setSearch('')
                          setCategoryId(null)
                          setStageFilter(null)
                          setPriority('todas')
                        }}
                        className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200"
                      >
                        <X size={15} /> Limpar filtros
                      </button>
                    }
                  />
                )}

                {filtered.length > 0 && (
                  <p className="mt-6 flex items-center gap-1.5 text-center text-[11px] text-slate-400">
                    <Check size={12} /> {filtered.length} nota(s) exibida(s) — dados salvos automaticamente
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {view === 'pipeline' && (
          <div className="min-h-0 flex-1">
            <Pipeline
              notes={notes}
              categories={categories}
              reminders={reminders}
              theme={settings.theme}
              search={pipelineSearch}
              onSearch={setPipelineSearch}
              categoryFilter={pipelineCategory}
              onCategoryFilter={setPipelineCategory}
              onOpenNote={(id) => openEditor(id, 'crm')}
              onMoveStage={crm.moveStage}
              onTogglePin={crm.togglePin}
              onToggleArchive={crm.toggleArchive}
              onTrash={crm.trashNote}
              onColorChange={(id, color) => crm.updateNote(id, { color })}
              onAddReminder={(note) => openEditor(note.id, 'lembretes')}
              onDuplicate={handleDuplicate}
              onQuickAdd={(stage, data) => {
                const note = crm.createNote({
                  title: data.title,
                  company: data.company,
                  dealValue: data.dealValue,
                  stage,
                  inPipeline: true,
                  priority: 'media',
                })
                showToast('Negócio adicionado ao pipeline')
                void note
              }}
              onSelectView={handleSelectView}
            />
          </div>
        )}

        {view === 'reminders' && (
          <div className="min-h-0 flex-1">
            <RemindersView
              reminders={reminders}
              notes={notes}
              onOpenNote={(id) => openEditor(id, 'lembretes')}
              onSave={crm.saveReminder}
              onUpdate={crm.updateReminder}
              onDelete={crm.deleteReminder}
              onComplete={crm.completeReminder}
              onSnooze={crm.snoozeReminder}
              onTestPopup={(reminder) => setPreviewReminderId(reminder.id)}
            />
          </div>
        )}

        {view === 'agenda' && (
          <div className="min-h-0 flex-1">
            <AgendaView
              notes={notes}
              reminders={reminders}
              mondayFirst={settings.mondayFirst}
              onOpenNote={(id) => openEditor(id)}
              onSelectView={handleSelectView}
            />
          </div>
        )}
      </main>

      {editorNote && (
        <NoteEditorModal
          key={`${editorNote.id}-${editorTab}`}
          note={editorNote}
          initialTab={editorTab}
          categories={categories}
          reminders={reminders}
          theme={settings.theme}
          onClose={() => setEditorId(null)}
          onChange={crm.updateNote}
          onTrash={(id) => {
            crm.trashNote(id)
            setEditorId(null)
          }}
          onRestore={crm.restoreNote}
          onDeleteForever={(id) => {
            crm.deleteNote(id)
            setEditorId(null)
          }}
          onToggleArchive={crm.toggleArchive}
          onDuplicate={handleDuplicate}
          onSaveReminder={crm.saveReminder}
          onUpdateReminder={crm.updateReminder}
          onDeleteReminder={crm.deleteReminder}
          onAddCategory={crm.addCategory}
          onToast={showToast}
        />
      )}

      {popupReminder && (
        <ReminderPopup
          reminder={popupReminder}
          note={popupNote}
          settings={settings}
          isTest={!activeReminder && Boolean(previewReminder)}
          onSnooze={(minutes) => {
            crm.snoozeReminder(popupReminder.id, minutes)
            setPreviewReminderId(null)
          }}
          onComplete={() => {
            // Em modo de teste apenas fecha; no alarme real conclui/reagenda.
            if (activeReminder) crm.completeReminder(popupReminder.id)
            setPreviewReminderId(null)
          }}
          onOpenNote={(id) => {
            setPreviewReminderId(null)
            if (activeReminder) crm.acknowledgeReminder(popupReminder.id)
            openEditor(id, 'lembretes')
          }}
          onClose={() => {
            setPreviewReminderId(null)
            if (activeReminder) crm.dismissActiveReminder()
          }}
        />
      )}

      {settingsOpen && (
        <SettingsModal
          settings={settings}
          stats={{ notes: notes.length, categories: categories.length, reminders: reminders.length, trashed: trashedCount }}
          onUpdate={crm.updateSettings}
          onClose={() => setSettingsOpen(false)}
          onReseed={crm.reseed}
          onClearAll={crm.clearAll}
          onExport={crm.exportBackup}
          onImport={crm.importBackup}
          onToast={showToast}
        />
      )}

      {toast && (
        <div className="animate-fade-up pointer-events-none fixed bottom-5 left-1/2 z-[70] -translate-x-1/2">
          <div className="flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-2xl dark:bg-slate-700">
            <BellPlus size={15} className="text-brand-300" />
            {toast}
          </div>
        </div>
      )}

      {dueReminders.length > 1 && (
        <div className="fixed bottom-5 right-5 z-[65] rounded-2xl border border-rose-200 bg-white px-3 py-2 text-xs font-semibold text-rose-700 shadow-lg dark:border-rose-500/30 dark:bg-slate-900 dark:text-rose-300">
          +{dueReminders.length - 1} alarme(s) aguardando
        </div>
      )}
    </div>
  )
}

function SectionTitle({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <h2 className="mb-2 flex items-center gap-2 px-1 text-[11px] font-bold uppercase tracking-wider text-slate-400">
      {icon}
      {label}
      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{count}</span>
    </h2>
  )
}

function FilterChip({ label, color, onClear }: { label: string; color: string; onClear: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-medium" style={{ backgroundColor: `${color}1f`, color }}>
      {label}
      <button onClick={onClear} className="rounded-full p-0.5 hover:bg-black/10">
        <X size={11} />
      </button>
    </span>
  )
}

function EmptyState({ icon, title, description, action }: { icon: React.ReactNode; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-lg rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <span className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800">{icon}</span>
      <p className="text-base font-semibold text-slate-700 dark:text-slate-200">{title}</p>
      <p className="mx-auto mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-400">{description}</p>
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  )
}

interface NoteGridProps {
  notes: Note[]
  layout: Layout
  categories: React.ComponentProps<typeof NoteCard>['categories']
  theme: 'light' | 'dark'
  nextReminderFor: (noteId: string) => string | null
  onOpen: (id: string) => void
  onTogglePin: (id: string) => void
  onToggleArchive: (id: string) => void
  onTrash: (id: string) => void
  onRestore?: (id: string) => void
  onDeleteForever?: (id: string) => void
  onDuplicate?: (note: Note) => void
  onColorChange: (id: string, color: ColorKey) => void
  onAddReminder?: (note: Note) => void
}

function NoteGrid(props: NoteGridProps) {
  const { notes, layout, ...rest } = props
  const containerClass =
    layout === 'masonry'
      ? 'columns-1 gap-4 sm:columns-2 lg:columns-3 2xl:columns-4 [&>*]:mb-4'
      : layout === 'grid'
        ? 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4'
        : 'mx-auto flex max-w-3xl flex-col gap-3'

  return (
    <div className={containerClass}>
      {notes.map((note) => (
        <div key={note.id} className={layout === 'masonry' ? 'break-inside-avoid' : ''}>
          <NoteCard note={note} nextReminderAt={rest.nextReminderFor(note.id)} {...rest} />
        </div>
      ))}
    </div>
  )
}

export const PIPELINE_STAGES = STAGES
