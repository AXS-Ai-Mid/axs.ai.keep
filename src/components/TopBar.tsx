import { Bell, BellRing, LayoutGrid, Menu, Moon, Rows3, Search, Settings, SlidersHorizontal, StretchHorizontal, Sun, X } from 'lucide-react'
import { PRIORITIES } from '../lib/constants'
import type { Priority } from '../types'

export type Layout = 'masonry' | 'grid' | 'list'
export type SortKey = 'recentes' | 'criacao' | 'titulo' | 'valor' | 'previsao' | 'prioridade'

interface Props {
  title: string
  subtitle: string
  search: string
  onSearch: (value: string) => void
  searchRef: React.RefObject<HTMLInputElement | null>
  priority: Priority | 'todas'
  onPriority: (value: Priority | 'todas') => void
  sort: SortKey
  onSort: (value: SortKey) => void
  layout: Layout
  onLayout: (value: Layout) => void
  theme: 'light' | 'dark'
  onToggleTheme: () => void
  notificationsEnabled: boolean
  onToggleNotifications: () => void
  pendingReminders: number
  onOpenReminders: () => void
  onOpenSettings: () => void
  onOpenNav: () => void
}

const SORT_LABEL: Record<SortKey, string> = {
  recentes: 'Alteradas recentemente',
  criacao: 'Criadas recentemente',
  titulo: 'Título (A–Z)',
  valor: 'Maior valor',
  previsao: 'Previsão de fechamento',
  prioridade: 'Prioridade',
}

export default function TopBar({
  title, subtitle, search, onSearch, searchRef, priority, onPriority, sort, onSort, layout, onLayout, theme, onToggleTheme,
  notificationsEnabled, onToggleNotifications, pendingReminders, onOpenReminders, onOpenSettings, onOpenNav,
}: Props) {
  return (
    <header className="no-print border-b border-slate-200 bg-white/95 px-3 py-2.5 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-5">
      <div className="flex items-center gap-2">
        <button onClick={onOpenNav} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-800" aria-label="Abrir menu">
          <Menu size={18} />
        </button>

        <div className="hidden min-w-0 lg:block">
          <h1 className="truncate text-[15px] font-semibold text-slate-800 dark:text-slate-100">{title}</h1>
          <p className="truncate text-[11.5px] text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>

        <div className="relative ml-auto w-full max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            ref={searchRef}
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Buscar por título, conteúdo, cliente, empresa, tag...  (Ctrl+K)"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-8 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-2 focus:ring-brand-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-brand-500/20"
          />
          {search && (
            <button onClick={() => onSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700">
              <X size={14} />
            </button>
          )}
        </div>

        <div className="hidden items-center gap-1 xl:flex">
          <div className="relative">
            <SlidersHorizontal size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <select
              value={priority}
              onChange={(event) => onPriority(event.target.value as Priority | 'todas')}
              className="rounded-xl border border-slate-200 bg-slate-50 py-2 pl-7 pr-2 text-xs font-medium outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="todas">Todas as prioridades</option>
              {PRIORITIES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <select
            value={sort}
            onChange={(event) => onSort(event.target.value as SortKey)}
            className="max-w-[190px] rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-2 text-xs font-medium outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {(Object.keys(SORT_LABEL) as SortKey[]).map((key) => (
              <option key={key} value={key}>
                {SORT_LABEL[key]}
              </option>
            ))}
          </select>
        </div>

        <div className="hidden items-center gap-0.5 rounded-xl bg-slate-100 p-0.5 md:flex dark:bg-slate-800">
          <LayoutButton active={layout === 'masonry'} onClick={() => onLayout('masonry')} title="Mosaico">
            <LayoutGrid size={16} />
          </LayoutButton>
          <LayoutButton active={layout === 'grid'} onClick={() => onLayout('grid')} title="Grade">
            <StretchHorizontal size={16} />
          </LayoutButton>
          <LayoutButton active={layout === 'list'} onClick={() => onLayout('list')} title="Lista">
            <Rows3 size={16} />
          </LayoutButton>
        </div>

        <button
          onClick={onToggleNotifications}
          title={notificationsEnabled ? 'Notificações do navegador ativadas' : 'Notificações do navegador desativadas'}
          className={`rounded-xl p-2 transition ${notificationsEnabled ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
        >
          {notificationsEnabled ? <Bell size={17} /> : <BellRing size={17} />}
        </button>

        <button onClick={onOpenReminders} className="relative rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Lembretes pendentes">
          <BellRing size={17} className={pendingReminders ? 'text-rose-500' : ''} />
          {pendingReminders > 0 && (
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{pendingReminders}</span>
          )}
        </button>

        <button onClick={onToggleTheme} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Alternar tema">
          {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
        </button>
        <button onClick={onOpenSettings} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Configurações">
          <Settings size={17} />
        </button>
      </div>

      <div className="mt-1.5 flex items-center gap-2 lg:hidden">
        <p className="truncate text-[13px] font-semibold text-slate-700 dark:text-slate-200">{title}</p>
        <span className="truncate text-[11px] text-slate-400">{subtitle}</span>
      </div>
    </header>
  )
}

function LayoutButton({ children, active, onClick, title }: { children: React.ReactNode; active: boolean; onClick: () => void; title: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`rounded-lg p-1.5 transition ${active ? 'bg-white text-brand-700 shadow-sm dark:bg-slate-900 dark:text-brand-300' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'}`}
    >
      {children}
    </button>
  )
}
