/** Notificações nativas do navegador (com fallback silencioso). */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!notificationsSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported'
  try {
    const result = await Notification.requestPermission()
    return result
  } catch {
    return Notification.permission
  }
}

export function showNotification(title: string, body: string, tag?: string): boolean {
  if (!notificationsSupported() || Notification.permission !== 'granted') return false
  try {
    const notification = new Notification(title, { body, tag, requireInteraction: false })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
    return true
  } catch {
    return false
  }
}

/** Som sintetizado de reserva caso o autoplay esteja bloqueado. */
export function fallbackBeep(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.frequency.value = 880
    gain.gain.value = 0.15
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.4)
  } catch {
    /* ignora */
  }
}
