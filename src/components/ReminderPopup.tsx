import { useEffect } from 'react'
import { AlarmClock, BellRing, CheckCircle2, Clock, ExternalLink, Repeat, X } from 'lucide-react'
import { REPEAT_LABEL, STAGE_MAP } from '../lib/constants'
import { formatDateTime } from '../lib/format'
import { playSound } from '../lib/sound'
import type { Note, Reminder, Settings } from '../types'

interface Props {
  reminder: Reminder
  note?: Note
  settings: Settings
  isTest?: boolean
  onSnooze: (minutes: number) => void
  onComplete: () => void
  onOpenNote: (id: string) => void
  onClose: () => void
}

export default function ReminderPopup({ reminder, note, settings, isTest = false, onSnooze, onComplete, onOpenNote, onClose }: Props) {
  useEffect(() => {
    if (settings.soundEnabled) playSound(settings.sound, settings.volume)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reminder.id])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div className="animate-fade-up w-full max-w-md overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-2xl dark:border-rose-500/30 dark:bg-slate-900">
        <div className="flex items-center gap-3 bg-gradient-to-r from-rose-500 to-rose-600 px-5 py-4 text-white">
          <span className="animate-ring grid h-11 w-11 place-items-center rounded-2xl bg-white/20">
            <BellRing size={22} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">{isTest ? 'Teste de alarme' : 'Alarme disparado agora'}</p>
            <p className="truncate text-base font-semibold">{formatDateTime(reminder.at)}</p>
          </div>
          <button onClick={onClose} className="rounded-xl p-1.5 hover:bg-white/20" aria-label="Fechar popup">
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <p className="text-lg font-semibold leading-snug text-slate-800 dark:text-slate-100">{reminder.title}</p>

          <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
              <AlarmClock size={12} /> {formatDateTime(reminder.at)}
            </span>
            {reminder.repeat !== 'none' && (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 dark:bg-slate-800">
                <Repeat size={12} /> {REPEAT_LABEL[reminder.repeat]}
              </span>
            )}
            {note?.inPipeline && (
              <span className="rounded-full px-2 py-0.5 font-semibold" style={{ backgroundColor: `${STAGE_MAP[note.stage].accent}22`, color: STAGE_MAP[note.stage].accent }}>
                {STAGE_MAP[note.stage].name}
              </span>
            )}
          </div>

          {note && (note.company || note.client || note.dealValue > 0) && (
            <div className="rounded-2xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
              {note.title && <p className="font-medium text-slate-700 dark:text-slate-200">{note.title}</p>}
              {note.company && <p className="text-xs text-slate-500 dark:text-slate-400">{note.company}{note.client ? ` · ${note.client}` : ''}</p>}
              {note.dealValue > 0 && (
                <p className="mt-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Valor do negócio: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(note.dealValue)}
                </p>
              )}
              {note.content && <p className="note-body mt-1.5 line-clamp-3 text-xs text-slate-500 dark:text-slate-400">{note.content}</p>}
            </div>
          )}

          <div className="grid grid-cols-3 gap-2">
            <SnoozeButton label="5 min" onClick={() => onSnooze(5)} />
            <SnoozeButton label="15 min" onClick={() => onSnooze(15)} />
            <SnoozeButton label="1 hora" onClick={() => onSnooze(60)} />
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={onComplete}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 size={16} /> Concluir alarme
            </button>
            {note && (
              <button
                onClick={() => onOpenNote(note.id)}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <ExternalLink size={15} /> Abrir nota
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function SnoozeButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-2 py-2 text-xs font-semibold text-slate-600 transition hover:border-brand-400 hover:text-brand-700 dark:border-slate-700 dark:text-slate-300 dark:hover:border-brand-500"
    >
      <Clock size={13} /> {label}
    </button>
  )
}
