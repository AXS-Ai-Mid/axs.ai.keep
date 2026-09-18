/** Sons de alarme gerados via WebAudio (sem arquivos externos). */

let ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

/** Precisa ser chamado a partir de um gesto do usuário (política de autoplay). */
export function unlockAudio(): void {
  const context = getCtx()
  if (!context) return
  const osc = context.createOscillator()
  const gain = context.createGain()
  gain.gain.value = 0.0001
  osc.connect(gain).connect(context.destination)
  osc.start()
  osc.stop(context.currentTime + 0.02)
}

function tone(context: AudioContext, freq: number, start: number, duration: number, volume: number, type: OscillatorType) {
  const osc = context.createOscillator()
  const gain = context.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, context.currentTime + start)
  gain.gain.setValueAtTime(0, context.currentTime + start)
  gain.gain.linearRampToValueAtTime(volume, context.currentTime + start + 0.02)
  gain.gain.exponentialRampToValueAtTime(0.0005, context.currentTime + start + duration)
  osc.connect(gain).connect(context.destination)
  osc.start(context.currentTime + start)
  osc.stop(context.currentTime + start + duration + 0.05)
}

const SOUNDS: Record<string, { label: string; play: (c: AudioContext, v: number) => void }> = {
  chime: {
    label: 'Sino',
    play: (c, v) => {
      tone(c, 880, 0, 0.5, v, 'sine')
      tone(c, 1174.7, 0.18, 0.55, v * 0.8, 'sine')
      tone(c, 1567.98, 0.36, 0.7, v * 0.6, 'sine')
    },
  },
  alert: {
    label: 'Alerta',
    play: (c, v) => {
      tone(c, 740, 0, 0.16, v, 'square')
      tone(c, 740, 0.22, 0.16, v, 'square')
      tone(c, 988, 0.44, 0.22, v * 0.9, 'square')
    },
  },
  bell: {
    label: 'Campainha',
    play: (c, v) => {
      tone(c, 659.25, 0, 0.9, v, 'triangle')
      tone(c, 987.77, 0.05, 0.9, v * 0.45, 'sine')
    },
  },
  digital: {
    label: 'Digital',
    play: (c, v) => {
      ;[1046.5, 1318.5, 1568, 2093].forEach((f, i) => tone(c, f, i * 0.09, 0.12, v * 0.8, 'sine'))
    },
  },
}

export const SOUND_OPTIONS = Object.entries(SOUNDS).map(([key, value]) => ({ key, label: value.label }))

export function playSound(name = 'chime', volume = 0.7): void {
  const context = getCtx()
  if (!context) return
  const sound = SOUNDS[name] ?? SOUNDS.chime
  sound.play(context, Math.min(Math.max(volume, 0.05), 1) * 0.5)
}
