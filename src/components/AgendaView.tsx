import { useMemo, useState } from 'react'
import { AlarmClock, BarChart3, CalendarDays, ChevronLeft, ChevronRight, CircleDollarSign, Percent, Target, TrendingUp, Wallet } from 'lucide-react'
import { STAGES } from '../lib/constants'
import { formatDateFull, formatMoney, formatTime, isSameDay, startOfWeek } from '../lib/format'
import type { Note, Reminder } from '../types'

interface Props {
  notes: Note[]
  reminders: Reminder[]
  mondayFirst: boolean
  onOpenNote: (id: string) => void
  onSelectView: (view: 'reminders') => void
}

const WEEKDAYS_MON = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const WEEKDAYS_SUN = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

export default function AgendaView({ notes, reminders, mondayFirst, onOpenNote, onSelectView }: Props) {
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(() => new Date())

  const activeNotes = useMemo(() => notes.filter((note) => !note.trashed && !note.archived), [notes])
  const pipelineNotes = useMemo(() => activeNotes.filter((note) => note.inPipeline), [activeNotes])

  const calendarDays = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1)
    const start = startOfWeek(first, mondayFirst)
    return Array.from({ length: 42 }, (_, index) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + index))
  }, [cursor, mondayFirst])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, { reminders: Reminder[]; notes: Note[] }>()
    const key = (date: Date) => date.toDateString()
    for (const reminder of reminders) {
      const date = new Date(reminder.at)
      const entry = map.get(key(date)) ?? { reminders: [], notes: [] }
      entry.reminders.push(reminder)
      map.set(key(date), entry)
    }
    for (const note of activeNotes) {
      if (!note.dueDate) continue
      const date = new Date(note.dueDate)
      const entry = map.get(key(date)) ?? { reminders: [], notes: [] }
      entry.notes.push(note)
      map.set(key(date), entry)
    }
    return map
  }, [reminders, activeNotes])

  const selectedEvents = eventsByDay.get(selected.toDateString()) ?? { reminders: [], notes: [] }

  const stageStats = useMemo(
    () =>
      STAGES.map((stage) => {
        const stageNotes = pipelineNotes.filter((note) => note.stage === stage.id)
        const value = stageNotes.reduce((sum, note) => sum + (note.dealValue || 0), 0)
        const withValue = stageNotes.filter((note) => (note.dealValue || 0) > 0)
        return {
          stage,
          count: stageNotes.length,
          value,
          ticket: withValue.length ? value / withValue.length : 0,
        }
      }),
    [pipelineNotes],
  )

  const totalPipeline = stageStats.reduce((sum, item) => sum + item.value, 0)
  const won = stageStats.find((item) => item.stage.id === 'fechamento')?.value ?? 0
  const openDeals = pipelineNotes.filter((note) => note.stage !== 'fechamento')
  const conversion = pipelineNotes.length ? (pipelineNotes.filter((note) => note.stage === 'fechamento').length / pipelineNotes.length) * 100 : 0
  const overdue = reminders.filter((reminder) => !reminder.done && Date.parse(reminder.at) < Date.now()).length
  const maxValue = Math.max(...stageStats.map((item) => item.value), 1)

  return (
    <div className="slim-scroll h-full overflow-y-auto">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
          <BarChart3 size={19} className="text-sky-600" /> Agenda &amp; Análises
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Visão consolidada do funil, agenda de compromissos e previsões de fechamento</p>
      </header>

      <div className="grid gap-4 p-4 sm:p-6 xl:grid-cols-[1.1fr_1fr]">
        {/* Calendário */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <CalendarDays size={16} className="text-brand-600" />
              {MONTHS[cursor.getMonth()]} {cursor.getFullYear()}
            </h2>
            <div className="flex items-center gap-1">
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronLeft size={16} />
              </button>
              <button onClick={() => { const today = new Date(); setCursor(today); setSelected(today) }} className="rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                Hoje
              </button>
              <button onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {(mondayFirst ? WEEKDAYS_MON : WEEKDAYS_SUN).map((day) => (
              <span key={day} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day) => {
              const events = eventsByDay.get(day.toDateString())
              const isCurrentMonth = day.getMonth() === cursor.getMonth()
              const isToday = isSameDay(day, new Date())
              const isSelected = isSameDay(day, selected)
              const pendingReminders = events?.reminders.filter((reminder) => !reminder.done) ?? []
              return (
                <button
                  key={day.toISOString()}
                  onClick={() => setSelected(day)}
                  className={`relative flex h-16 flex-col items-start gap-0.5 rounded-xl border p-1.5 text-left transition ${
                    isSelected
                      ? 'border-brand-400 bg-brand-50 dark:border-brand-500/50 dark:bg-brand-500/10'
                      : 'border-transparent hover:border-slate-200 hover:bg-slate-50 dark:hover:border-slate-700 dark:hover:bg-slate-800/60'
                  } ${isCurrentMonth ? '' : 'opacity-40'}`}
                >
                  <span className={`text-xs font-semibold ${isToday ? 'grid h-5 w-5 place-items-center rounded-full bg-brand-600 text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                    {day.getDate()}
                  </span>
                  {pendingReminders.length > 0 && (
                    <span className="inline-flex items-center gap-1 rounded px-1 text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                      <AlarmClock size={10} /> {pendingReminders.length}
                    </span>
                  )}
                  {(events?.notes.length ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 rounded px-1 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <Wallet size={10} /> {events?.notes.length}
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
            <h3 className="mb-2 text-sm font-semibold text-slate-700 dark:text-slate-200">{formatDateFull(selected.toISOString())}</h3>
            {selectedEvents.reminders.length === 0 && selectedEvents.notes.length === 0 && (
              <p className="text-xs text-slate-400">Nenhum compromisso neste dia.</p>
            )}
            <div className="space-y-1.5">
              {selectedEvents.reminders.map((reminder) => (
                <div key={reminder.id} className="flex items-center gap-2 rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs dark:bg-rose-500/10">
                  <span className="font-semibold text-rose-700 dark:text-rose-300">{formatTime(reminder.at)}</span>
                  <span className={`flex-1 truncate ${reminder.done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{reminder.title}</span>
                  {reminder.noteId && (
                    <button onClick={() => onOpenNote(reminder.noteId as string)} className="text-brand-600 hover:underline dark:text-brand-300">
                      abrir
                    </button>
                  )}
                </div>
              ))}
              {selectedEvents.notes.map((note) => (
                <div key={note.id} className="flex items-center gap-2 rounded-xl bg-emerald-50 px-2.5 py-1.5 text-xs dark:bg-emerald-500/10">
                  <span className="font-semibold text-emerald-700 dark:text-emerald-300">Previsão</span>
                  <button onClick={() => onOpenNote(note.id)} className="flex-1 truncate text-left text-slate-700 hover:underline dark:text-slate-200">
                    {note.title || note.company || 'Nota'}
                  </button>
                  {note.dealValue > 0 && <span className="font-semibold text-emerald-700 dark:text-emerald-300">{formatMoney(note.dealValue)}</span>}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Indicadores */}
        <section className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Kpi label="Pipeline total" value={formatMoney(totalPipeline)} icon={<CircleDollarSign size={16} />} tone="violet" hint={`${pipelineNotes.length} negócios`} />
            <Kpi label="Receita fechada" value={formatMoney(won)} icon={<Target size={16} />} tone="emerald" hint="etapa Fechamento" />
            <Kpi label="Em negociação" value={formatMoney(openDeals.reduce((sum, note) => sum + (note.dealValue || 0), 0))} icon={<TrendingUp size={16} />} tone="amber" hint={`${openDeals.length} negócios abertos`} />
            <Kpi label="Taxa de conversão" value={`${conversion.toFixed(1)}%`} icon={<Percent size={16} />} tone="blue" hint="negócios fechados / total" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Funil por etapa</h2>
            <div className="space-y-3">
              {stageStats.map(({ stage, count, value, ticket }) => (
                <div key={stage.id}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: stage.accent }} />
                      {stage.name}
                      <span className="text-slate-400">· {count}</span>
                    </span>
                    <span className="font-semibold" style={{ color: stage.accent }}>
                      {formatMoney(value)}
                    </span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.max((value / maxValue) * 100, value > 0 ? 4 : 0)}%`, backgroundColor: stage.accent }} />
                  </div>
                  <p className="mt-0.5 text-[10.5px] text-slate-400">Ticket médio: {formatMoney(ticket)}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[var(--shadow-card)] dark:border-slate-800 dark:bg-slate-900">
            <h2 className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">Produtividade</h2>
            <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <MiniStat label="Notas ativas" value={String(activeNotes.length)} />
              <MiniStat label="Fixadas" value={String(activeNotes.filter((note) => note.pinned).length)} />
              <MiniStat label="Alarmes pendentes" value={String(reminders.filter((reminder) => !reminder.done).length)} />
              <MiniStat label="Alarmes atrasados" value={String(overdue)} tone={overdue ? 'rose' : undefined} />
              <MiniStat label="Arquivadas" value={String(notes.filter((note) => note.archived && !note.trashed).length)} />
              <MiniStat label="Na lixeira" value={String(notes.filter((note) => note.trashed).length)} />
            </div>
            <button onClick={() => onSelectView('reminders')} className="mt-3 w-full rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300">
              Ver todos os lembretes
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}

function Kpi({ label, value, icon, tone, hint }: { label: string; value: string; icon: React.ReactNode; tone: 'violet' | 'emerald' | 'amber' | 'blue'; hint: string }) {
  const tones = {
    violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-500/30 dark:bg-violet-500/10 dark:text-violet-300',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
  } as const
  return (
    <div className={`rounded-2xl border p-3.5 ${tones[tone]}`}>
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide opacity-85">
        {icon}
        {label}
      </div>
      <p className="mt-1 truncate text-xl font-bold">{value}</p>
      <p className="text-[11px] opacity-75">{hint}</p>
    </div>
  )
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'rose' }) {
  return (
    <div className={`rounded-xl px-2.5 py-2 ${tone === 'rose' ? 'bg-rose-50 dark:bg-rose-500/10' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`text-lg font-bold ${tone === 'rose' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>{value}</p>
    </div>
  )
}
