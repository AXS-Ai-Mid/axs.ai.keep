import { useMemo, useState } from 'react'
import { AlarmClock, BellRing, CalendarPlus, Check, CheckCircle2, ChevronDown, Clock, ExternalLink, Plus, Repeat as RepeatIcon, RotateCcw, Trash2, Zap } from 'lucide-react'
import { REPEAT_LABEL, STAGE_MAP } from '../lib/constants'
import { formatDateTime, formatTime, isSameDay } from '../lib/format'
import type { Note, Reminder, Repeat } from '../types'

interface Props {
  reminders: Reminder[]
  notes: Note[]
  onOpenNote: (id: string) => void
  onSave: (input: Partial<Reminder> & { title: string; at: string }) => void
  onUpdate: (id: string, patch: Partial<Reminder>) => void
  onDelete: (id: string) => void
  onComplete: (id: string) => void
  onSnooze: (id: string, minutes: number) => void
  onTestPopup: (reminder: Reminder) => void
}

const SNOOZE_OPTIONS = [5, 15, 60, 24 * 60]

export default function RemindersView({ reminders, notes, onOpenNote, onSave, onUpdate, onDelete, onComplete, onSnooze, onTestPopup }: Props) {
  const [showForm, setShowForm] = useState(false)
  const [title, setTitle] = useState('')
  const [at, setAt] = useState('')
  const [repeat, setRepeat] = useState<Repeat>('none')
  const [noteId, setNoteId] = useState('')
  const [showDone, setShowDone] = useState(false)

  const sorted = useMemo(() => [...reminders].sort((a, b) => Date.parse(a.at) - Date.parse(b.at)), [reminders])
  const now = Date.now()

  const buckets = useMemo(() => {
    const pending = sorted.filter((reminder) => !reminder.done)
    const done = sorted.filter((reminder) => reminder.done).reverse()
    const today = new Date()
    const in7Days = new Date(today.getTime() + 7 * 86400000)
    return {
      atrasados: pending.filter((reminder) => Date.parse(reminder.at) < now),
      hoje: pending.filter((reminder) => Date.parse(reminder.at) >= now && isSameDay(new Date(reminder.at), today)),
      proximos: pending.filter((reminder) => Date.parse(reminder.at) >= now && !isSameDay(new Date(reminder.at), today) && new Date(reminder.at) <= in7Days),
      depois: pending.filter((reminder) => new Date(reminder.at) > in7Days),
      concluidos: done,
    }
  }, [sorted, now])

  const noteById = useMemo(() => new Map(notes.map((note) => [note.id, note])), [notes])

  const submit = () => {
    if (!title.trim() || !at) return
    onSave({ title: title.trim(), at: new Date(at).toISOString(), repeat, noteId: noteId || null, done: false, active: true })
    setTitle('')
    setAt('')
    setRepeat('none')
    setNoteId('')
    setShowForm(false)
  }

  const renderRow = (reminder: Reminder) => {
    const note = reminder.noteId ? noteById.get(reminder.noteId) : undefined
    const overdue = !reminder.done && Date.parse(reminder.at) < now
    return (
      <div
        key={reminder.id}
        className={`flex flex-wrap items-center gap-3 rounded-2xl border px-3.5 py-3 shadow-[var(--shadow-card)] transition ${
          reminder.done
            ? 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
            : overdue
              ? 'border-rose-200 bg-rose-50 dark:border-rose-500/30 dark:bg-rose-500/10'
              : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900'
        }`}
      >
        <button
          onClick={() => (reminder.done ? onUpdate(reminder.id, { done: false }) : onComplete(reminder.id))}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${
            reminder.done ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-400 hover:bg-emerald-100 hover:text-emerald-700 dark:bg-slate-800'
          }`}
          title={reminder.done ? 'Reabrir alarme' : 'Concluir alarme'}
        >
          {reminder.done ? <CheckCircle2 size={18} /> : <Check size={18} />}
        </button>

        <div className="min-w-0 flex-1">
          <p className={`truncate text-sm font-semibold ${reminder.done ? 'text-slate-400 line-through dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'}`}>
            {reminder.title}
          </p>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-slate-500 dark:text-slate-400">
            <span className={`inline-flex items-center gap-1 font-semibold ${overdue ? 'text-rose-600 dark:text-rose-400' : ''}`}>
              <AlarmClock size={12} /> {formatDateTime(reminder.at)}
            </span>
            {reminder.repeat !== 'none' && (
              <span className="inline-flex items-center gap-1">
                <RepeatIcon size={12} /> {REPEAT_LABEL[reminder.repeat]}
              </span>
            )}
            {note && (
              <span className="inline-flex max-w-[280px] items-center gap-1">
                <button onClick={() => onOpenNote(note.id)} className="inline-flex max-w-[220px] items-center gap-1 truncate text-brand-600 hover:underline dark:text-brand-300">
                  <ExternalLink size={12} /> {note.title || note.company || 'Abrir nota'}
                </button>
                {note.inPipeline && (
                  <span className="rounded px-1 text-[10px] font-semibold" style={{ backgroundColor: `${STAGE_MAP[note.stage].accent}22`, color: STAGE_MAP[note.stage].accent }}>
                    {STAGE_MAP[note.stage].short}
                  </span>
                )}
              </span>
            )}
          </div>
        </div>

        {!reminder.done && (
          <div className="flex items-center gap-1">
            <div className="group/snooze relative">
              <button className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">
                <Clock size={13} /> Adiar
                <ChevronDown size={12} />
              </button>
              <div className="absolute right-0 z-20 mt-1 hidden w-36 rounded-xl border border-slate-200 bg-white p-1 shadow-xl group-hover/snooze:block dark:border-slate-700 dark:bg-slate-900">
                {SNOOZE_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    onClick={() => onSnooze(reminder.id, minutes)}
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left text-xs hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {minutes < 60 ? `+${minutes} minutos` : minutes === 60 ? '+1 hora' : '+1 dia'}
                  </button>
                ))}
              </div>
            </div>
            <button
              onClick={() => onTestPopup(reminder)}
              title="Testar popup agora"
              className="rounded-xl bg-amber-100 p-1.5 text-amber-700 hover:bg-amber-200 dark:bg-amber-500/20 dark:text-amber-300"
            >
              <Zap size={14} />
            </button>
          </div>
        )}

        <button
          onClick={() => {
            if (window.confirm('Excluir este alarme?')) onDelete(reminder.id)
          }}
          className="rounded-xl p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
          title="Excluir alarme"
        >
          <Trash2 size={15} />
        </button>
      </div>
    )
  }

  const Section = ({ title: sectionTitle, items, tone }: { title: string; items: Reminder[]; tone?: 'danger' | 'default' }) =>
    items.length === 0 ? null : (
      <section className="space-y-2">
        <h2 className={`flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide ${tone === 'danger' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400 dark:text-slate-500'}`}>
          {sectionTitle}
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">{items.length}</span>
        </h2>
        {items.map(renderRow)}
      </section>
    )

  return (
    <div className="h-full overflow-y-auto slim-scroll">
      <header className="border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-semibold text-slate-800 dark:text-slate-100">
              <BellRing size={19} className="text-rose-500" /> Lembretes e alarmes
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Verificação automática a cada 20 segundos · popup com som e notificação do navegador
            </p>
          </div>
          <button
            onClick={() => setShowForm((open) => !open)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <CalendarPlus size={16} /> Novo alarme
          </button>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Stat label="Atrasados" value={buckets.atrasados.length} tone="rose" />
          <Stat label="Hoje" value={buckets.hoje.length} tone="amber" />
          <Stat label="Próximos 7 dias" value={buckets.proximos.length} tone="blue" />
          <Stat label="Concluídos" value={buckets.concluidos.length} tone="emerald" />
        </div>

        {showForm && (
          <div className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/50 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Título</label>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Ligar para cliente X"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Data e hora</label>
              <input
                type="datetime-local"
                value={at}
                onChange={(event) => setAt(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Repetição</label>
              <select
                value={repeat}
                onChange={(event) => setRepeat(event.target.value as Repeat)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {(Object.keys(REPEAT_LABEL) as Repeat[]).map((key) => (
                  <option key={key} value={key}>
                    {REPEAT_LABEL[key]}
                  </option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-slate-400">Vincular a uma nota (opcional)</label>
              <select
                value={noteId}
                onChange={(event) => setNoteId(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">Sem vínculo</option>
                {notes.filter((note) => !note.trashed).map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title || '(sem título)'} {note.company ? `— ${note.company}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <button onClick={submit} className="flex-1 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700">
                Programar
              </button>
              <button onClick={() => setShowForm(false)} className="rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                Cancelar
              </button>
            </div>
          </div>
        )}
      </header>

      <div className="space-y-5 p-4 sm:p-6">
        <Section title="Atrasados" items={buckets.atrasados} tone="danger" />
        <Section title="Hoje" items={buckets.hoje} />
        <Section title="Próximos 7 dias" items={buckets.proximos} />
        <Section title="Mais adiante" items={buckets.depois} />

        {buckets.atrasados.length + buckets.hoje.length + buckets.proximos.length + buckets.depois.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
            <AlarmClock size={28} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Nenhum alarme pendente</p>
            <p className="mt-1 text-xs text-slate-400">Programe lembretes para não perder nenhum follow-up de venda.</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-sm font-semibold text-white hover:bg-brand-700"
            >
              <Plus size={15} /> Criar alarme
            </button>
          </div>
        )}

        <div>
          <button
            onClick={() => setShowDone((open) => !open)}
            className="flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide text-slate-400 hover:text-slate-600 dark:text-slate-500"
          >
            <ChevronDown size={13} className={showDone ? '' : '-rotate-90 transition'} />
            Concluídos
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold dark:bg-slate-800">{buckets.concluidos.length}</span>
          </button>
          {showDone && (
            <div className="mt-2 space-y-2">
              {buckets.concluidos.length === 0 && <p className="px-1 text-sm text-slate-400">Nenhum alarme concluído ainda.</p>}
              {buckets.concluidos.map(renderRow)}
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3.5 text-[12px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
          <p className="mb-1 flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
            <RotateCcw size={13} /> Como funcionam os alarmes
          </p>
          A cada 20 segundos o sistema compara os horários programados com a hora atual. Alarms vencidos abrem um popup com som e, se autorizado,
          também disparam notificação nativa do navegador. Alarmes recorrentes são reagendados automaticamente; use <strong>Adiar</strong> para empurrar
          o próximo disparo. Última checagem: {formatTime(new Date().toISOString())}.
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: number; tone: 'rose' | 'amber' | 'blue' | 'emerald' }) {
  const tones = {
    rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300',
    amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300',
    blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-300',
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300',
  } as const
  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone]}`}>
      <p className="text-[10.5px] font-semibold uppercase tracking-wide opacity-80">{label}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  )
}
