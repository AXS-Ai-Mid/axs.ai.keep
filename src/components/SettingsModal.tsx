import { useRef, useState } from 'react'
import { Bell, BellOff, Database, Download, Moon, RefreshCw, Sun, Trash2, Upload, Volume2, X } from 'lucide-react'
import { SOUND_OPTIONS, playSound } from '../lib/sound'
import { notificationPermission, requestNotificationPermission } from '../lib/notify'
import type { Settings } from '../types'

interface Props {
  settings: Settings
  stats: { notes: number; categories: number; reminders: number; trashed: number }
  onUpdate: (patch: Partial<Settings>) => void
  onClose: () => void
  onReseed: () => Promise<void>
  onClearAll: () => Promise<void>
  onExport: () => Promise<void>
  onImport: (file: File) => Promise<void>
  onToast: (message: string) => void
}

export default function SettingsModal({ settings, stats, onUpdate, onClose, onReseed, onClearAll, onExport, onImport, onToast }: Props) {
  const [permission, setPermission] = useState(notificationPermission())
  const fileInput = useRef<HTMLInputElement>(null)

  const askPermission = async () => {
    const result = await requestNotificationPermission()
    setPermission(result)
    if (result === 'granted') {
      onUpdate({ notificationsEnabled: true })
      onToast('Notificações do navegador ativadas')
    } else if (result === 'denied') {
      onToast('Permissão negada — o popup interno continua funcionando')
    } else if (result === 'unsupported') {
      onToast('Este navegador não suporta notificações nativas')
    }
  }

  const Row = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 py-3 last:border-0 dark:border-slate-800">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{title}</p>
        {description && <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>}
      </div>
      {children}
    </div>
  )

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto bg-slate-900/50 p-3 backdrop-blur-sm sm:p-6" onMouseDown={onClose}>
      <div
        onMouseDown={(event) => event.stopPropagation()}
        className="animate-fade-up my-auto w-full max-w-xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <header className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">Configurações</h2>
          <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X size={18} />
          </button>
        </header>

        <div className="slim-scroll max-h-[70vh] overflow-y-auto px-5 py-3">
          <Row title="Aparência" description="Tema claro ou escuro para todo o sistema">
            <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                onClick={() => onUpdate({ theme: 'light' })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${settings.theme === 'light' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
              >
                <Sun size={14} /> Claro
              </button>
              <button
                onClick={() => onUpdate({ theme: 'dark' })}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${settings.theme === 'dark' ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-400'}`}
              >
                <Moon size={14} /> Escuro
              </button>
            </div>
          </Row>

          <Row title="Semana começa na segunda-feira" description="Afeta o calendário da tela Agenda">
            <input
              type="checkbox"
              checked={settings.mondayFirst}
              onChange={(event) => onUpdate({ mondayFirst: event.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            />
          </Row>

          <Row title="Alarme com som" description="Toca automaticamente quando o horário chega">
            <input
              type="checkbox"
              checked={settings.soundEnabled}
              onChange={(event) => onUpdate({ soundEnabled: event.target.checked })}
              className="h-5 w-5 rounded border-slate-300 text-brand-600 focus:ring-brand-400"
            />
          </Row>

          <Row title="Tom do alarme" description="Toque para ouvir uma prévia">
            <div className="flex items-center gap-2">
              <select
                value={settings.sound}
                onChange={(event) => {
                  onUpdate({ sound: event.target.value })
                  playSound(event.target.value, settings.volume)
                }}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                {SOUND_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
              <button
                onClick={() => playSound(settings.sound, settings.volume)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <Volume2 size={14} /> Testar
              </button>
            </div>
          </Row>

          <Row title="Volume" description={`${Math.round(settings.volume * 100)}%`}>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={settings.volume}
              onChange={(event) => onUpdate({ volume: Number(event.target.value) })}
              className="w-40 accent-brand-600"
            />
          </Row>

          <Row
            title="Notificação nativa do navegador"
            description={
              permission === 'granted'
                ? 'Permissão concedida — notificações ativas'
                : permission === 'denied'
                  ? 'Permissão negada nas configurações do navegador'
                  : permission === 'unsupported'
                    ? 'Navegador sem suporte a notificações'
                    : 'Peça a permissão para receber alertas do sistema'
            }
          >
            <div className="flex items-center gap-2">
              {permission === 'granted' ? (
                <button
                  onClick={() => onUpdate({ notificationsEnabled: !settings.notificationsEnabled })}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold ${settings.notificationsEnabled ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800'}`}
                >
                  {settings.notificationsEnabled ? <Bell size={14} /> : <BellOff size={14} />}
                  {settings.notificationsEnabled ? 'Ativadas' : 'Desativadas'}
                </button>
              ) : (
                <button onClick={askPermission} className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                  <Bell size={14} /> Permitir
                </button>
              )}
            </div>
          </Row>

          <div className="mt-3 rounded-2xl bg-slate-50 p-3.5 dark:bg-slate-800/50">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <Database size={15} className="text-brand-600" /> Dados
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {stats.notes} notas · {stats.categories} categorias · {stats.reminders} alarmes · {stats.trashed} na lixeira
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => void onReseed()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
              >
                <RefreshCw size={13} /> Restaurar dados de exemplo
              </button>
              <button
                onClick={() => void onExport()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
              >
                <Download size={13} /> Exportar backup
              </button>
              <button
                onClick={() => fileInput.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200"
              >
                <Upload size={13} /> Importar backup
              </button>
              <input
                ref={fileInput}
                type="file"
                accept="application/json"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file) void onImport(file)
                  event.target.value = ''
                }}
              />
              <button
                onClick={() => {
                  if (window.confirm('Remover TODAS as notas? Esta ação não pode ser desfeita (as categorias são mantidas).')) void onClearAll()
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-300"
              >
                <Trash2 size={13} /> Apagar todas as notas
              </button>
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-3 dark:border-slate-800">
          <p className="text-[11px] text-slate-400">Dados salvos em server/data/db.json via API local</p>
          <button onClick={onClose} className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Fechar
          </button>
        </footer>
      </div>
    </div>
  )
}
