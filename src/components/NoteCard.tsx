import type { CSSProperties, DragEvent } from 'react'
import {
  AlarmClock, Archive, Building2, CheckSquare, Clock, Copy, ExternalLink, Mail, Palette, Phone, Pin, PinOff, RotateCcw,
  Tag, Trash2, TrendingUp, User, Wallet,
} from 'lucide-react'
import { colorOf, noteSurface } from '../lib/colors'
import { PRIORITY_MAP, STAGE_MAP } from '../lib/constants'
import { formatCompactMoney, formatDateTime, formatUpdated, relativeDay } from '../lib/format'
import type { Category, ColorKey, Note } from '../types'

interface Props {
  note: Note
  categories: Category[]
  theme: 'light' | 'dark'
  nextReminderAt?: string | null
  onOpen: (id: string) => void
  onTogglePin: (id: string) => void
  onToggleArchive: (id: string) => void
  onTrash: (id: string) => void
  onRestore?: (id: string) => void
  onDeleteForever?: (id: string) => void
  onDuplicate?: (note: Note) => void
  onColorChange: (id: string, color: ColorKey) => void
  onAddReminder?: (note: Note) => void
  onDragStart?: (id: string) => void
  onDragEnd?: () => void
  draggable?: boolean
}

export default function NoteCard({
  note, categories, theme, nextReminderAt, onOpen, onTogglePin, onToggleArchive, onTrash,
  onRestore, onDeleteForever, onDuplicate, onColorChange, onAddReminder, onDragStart, onDragEnd, draggable = true,
}: Props) {
  const priority = PRIORITY_MAP[note.priority]
  const stage = STAGE_MAP[note.stage]
  const category = categories.find((item) => item.id === note.categoryId)
  const surface = noteSurface(note.color, theme) as CSSProperties
  const colorDef = colorOf(note.color)
  const checklist = note.checklist ?? []
  const doneCount = checklist.filter((item) => item.done).length
  const history = note.history ?? []
  const isDark = theme === 'dark'
  const chipText = isDark ? 'rgba(255,255,255,0.72)' : 'rgba(15,23,42,0.62)'
  const chipBg = isDark ? 'rgba(255,255,255,0.09)' : 'rgba(15,23,42,0.055)'

  const handleDragStart = (event: DragEvent<HTMLDivElement>) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', note.id)
    onDragStart?.(note.id)
  }

  const iconClass = 'h-3.5 w-3.5'
  const chipClass = 'inline-flex max-w-full items-center gap-1 truncate rounded-full px-2 py-0.5 text-[11px] font-medium'

  return (
    <div
      draggable={draggable}
      onDragStart={draggable ? handleDragStart : undefined}
      onDragEnd={onDragEnd}
      onClick={() => onOpen(note.id)}
      className={`group relative cursor-pointer break-inside-avoid rounded-2xl border p-3.5 shadow-[var(--shadow-card)] transition hover:-translate-y-0.5 hover:shadow-[var(--shadow-float)] ${
        draggable ? 'active:cursor-grabbing' : ''
      }`}
      style={surface}
    >
      <div className="mb-1 flex items-start gap-2">
        <div className="min-w-0 flex-1">
          {note.title ? (
            <h3 className="truncate text-[15px] font-semibold leading-snug text-slate-800 dark:text-slate-100" title={note.title}>
              {note.title}
            </h3>
          ) : (
            <h3 className="text-[15px] italic text-slate-400 dark:text-slate-500">Nota sem título</h3>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-1.5" style={{ color: chipText }}>
            <span className={chipClass} style={{ backgroundColor: chipBg }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: stage?.accent }} />
              {stage?.name}
            </span>
            <span className={chipClass} style={{ backgroundColor: chipBg }}>
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: priority?.dot }} />
              {priority?.label}
            </span>
            {category && (
              <span className={chipClass} style={{ backgroundColor: chipBg }}>
                <Tag className={iconClass} style={{ color: colorOf(category.color).accent }} />
                {category.name}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(event) => {
            event.stopPropagation()
            onTogglePin(note.id)
          }}
          className="shrink-0 rounded-full p-1 opacity-0 transition hover:bg-black/5 focus:opacity-100 group-hover:opacity-100 dark:hover:bg-white/10"
          style={{ opacity: note.pinned ? 1 : undefined }}
          title={note.pinned ? 'Desafixar' : 'Fixar nota'}
        >
          {note.pinned ? <Pin size={15} className="text-amber-600" fill="currentColor" /> : <PinOff size={15} style={{ color: chipText }} />}
        </button>
      </div>

      {note.content && (
        <p className="note-body line-clamp-6 mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{note.content}</p>
      )}

      {checklist.length > 0 && (
        <div className="mt-2.5 rounded-xl px-2 py-1.5" style={{ backgroundColor: chipBg }}>
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold" style={{ color: chipText }}>
            <CheckSquare className={iconClass} />
            {doneCount}/{checklist.length} concluídos
          </div>
          <ul className="space-y-0.5">
            {checklist.slice(0, 4).map((item) => (
              <li key={item.id} className={`flex items-start gap-1.5 text-[12px] ${item.done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                <span className="mt-[5px] h-1.5 w-1.5 shrink-0 rounded-full border" style={{ borderColor: chipText, backgroundColor: item.done ? colorDef.accent : 'transparent' }} />
                <span className="truncate">{item.text}</span>
              </li>
            ))}
            {checklist.length > 4 && <li className="text-[11px] text-slate-400 dark:text-slate-500">+{checklist.length - 4} itens</li>}
          </ul>
        </div>
      )}

      {(note.company || note.client || note.email || note.phone || note.dealValue > 0) && (
        <div className="mt-2.5 space-y-1 text-[12px]" style={{ color: chipText }}>
          {note.company && (
            <p className="flex items-center gap-1.5 truncate">
              <Building2 className={iconClass} />
              <span className="truncate font-medium">{note.company}</span>
            </p>
          )}
          {note.client && (
            <p className="flex items-center gap-1.5 truncate">
              <User className={iconClass} />
              <span className="truncate">{note.client}</span>
            </p>
          )}
          {note.email && (
            <a
              href={`mailto:${note.email}`}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-1.5 truncate hover:text-brand-600 hover:underline dark:hover:text-brand-300"
            >
              <Mail className={iconClass} />
              <span className="truncate">{note.email}</span>
            </a>
          )}
          {note.phone && (
            <a
              href={`tel:${note.phone.replace(/\D/g, '')}`}
              onClick={(event) => event.stopPropagation()}
              className="flex items-center gap-1.5 truncate hover:text-brand-600 hover:underline dark:hover:text-brand-300"
            >
              <Phone className={iconClass} />
              <span className="truncate">{note.phone}</span>
            </a>
          )}
          {note.dealValue > 0 && (
            <p className="flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
              <Wallet className={iconClass} />
              {formatCompactMoney(note.dealValue)}
            </p>
          )}
        </div>
      )}

      {note.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {note.tags.slice(0, 5).map((tag) => (
            <span key={tag} className="rounded-full px-2 py-0.5 text-[10.5px] font-medium" style={{ backgroundColor: chipBg, color: chipText }}>
              #{tag}
            </span>
          ))}
        </div>
      )}

      <div className="mt-3 flex items-center justify-between gap-2 text-[11px]" style={{ color: chipText }}>
        <span className="flex items-center gap-1">
          <Clock className={iconClass} />
          {formatUpdated(note.updatedAt)}
        </span>
        {nextReminderAt ? (
          <span className="flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700 dark:bg-rose-500/20 dark:text-rose-300">
            <AlarmClock className={iconClass} />
            {formatDateTime(nextReminderAt)}
          </span>
        ) : (
          note.dueDate && (
            <span className="flex items-center gap-1 rounded-full px-2 py-0.5 font-medium" style={{ backgroundColor: chipBg }}>
              <TrendingUp className={iconClass} />
              Previsão {relativeDay(note.dueDate)}
            </span>
          )
        )}
      </div>

      {history.length > 0 && (
        <p className="mt-1.5 truncate text-[10.5px] italic" style={{ color: chipText }} title={history[0].text}>
          {history[0].text} · {formatUpdated(history[0].at)}
        </p>
      )}

      {/* Barra de ações (hover) */}
      <div
        onClick={(event) => event.stopPropagation()}
        className="absolute -bottom-px left-2 right-2 flex translate-y-1 items-center justify-center gap-0.5 rounded-b-2xl px-1.5 py-1.5 opacity-0 backdrop-blur transition group-hover:translate-y-0 group-hover:opacity-100"
        style={{ backgroundColor: isDark ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,0.72)' }}
      >
        <ActionButton title="Editar" onClick={() => onOpen(note.id)}>
          <ExternalLink size={15} />
        </ActionButton>
        <div className="group/palette relative">
          <ActionButton title="Cor da nota">
            <Palette size={15} />
          </ActionButton>
          <div className="pointer-events-none absolute bottom-9 left-1/2 z-30 hidden w-[188px] -translate-x-1/2 grid-cols-5 gap-1.5 rounded-xl border border-slate-200 bg-white p-2 shadow-xl group-hover/palette:grid group-hover/palette:pointer-events-auto dark:border-slate-700 dark:bg-slate-900">
            {(['padrao', 'cinza', 'grafite', 'areia', 'amarelo', 'ambar', 'laranja', 'coral', 'rosa', 'magenta', 'roxo', 'violeta', 'indigo', 'azul', 'ceu', 'ciano', 'turquesa', 'esmeralda', 'verde', 'limao'] as ColorKey[]).map((key) => (
              <button
                key={key}
                title={colorOf(key).label}
                onClick={() => onColorChange(note.id, key)}
                className={`h-6 w-6 rounded-full border transition hover:scale-110 ${note.color === key ? 'ring-2 ring-brand-500 ring-offset-1 dark:ring-offset-slate-900' : ''}`}
                style={{ backgroundColor: isDark ? colorOf(key).darkBg : colorOf(key).bg, borderColor: isDark ? colorOf(key).darkBorder : colorOf(key).border }}
              />
            ))}
          </div>
        </div>
        {onAddReminder && (
          <ActionButton title="Programar alarme" onClick={() => onAddReminder(note)}>
            <AlarmClock size={15} />
          </ActionButton>
        )}
        {onDuplicate && (
          <ActionButton title="Duplicar" onClick={() => onDuplicate(note)}>
            <Copy size={15} />
          </ActionButton>
        )}
        {note.trashed ? (
          <>
            {onRestore && (
              <ActionButton title="Restaurar" onClick={() => onRestore(note.id)}>
                <RotateCcw size={15} />
              </ActionButton>
            )}
            {onDeleteForever && (
              <ActionButton title="Excluir definitivamente" danger onClick={() => onDeleteForever(note.id)}>
                <Trash2 size={15} />
              </ActionButton>
            )}
          </>
        ) : (
          <>
            <ActionButton title={note.archived ? 'Desarquivar' : 'Arquivar'} onClick={() => onToggleArchive(note.id)}>
              <Archive size={15} />
            </ActionButton>
            <ActionButton title="Mover para a lixeira" danger onClick={() => onTrash(note.id)}>
              <Trash2 size={15} />
            </ActionButton>
          </>
        )}
      </div>
    </div>
  )
}

function ActionButton({ children, title, onClick, danger = false }: { children: React.ReactNode; title: string; onClick?: () => void; danger?: boolean }) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-full p-1.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10 ${
        danger ? 'hover:text-rose-600 dark:hover:text-rose-400' : 'hover:text-brand-600 dark:hover:text-brand-300'
      }`}
    >
      {children}
    </button>
  )
}
