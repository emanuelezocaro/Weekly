import { useCallback, useEffect, useState } from 'react'

const LAST_FIRED_KEY = 'weekly:notifLastFired'
const CHECK_INTERVAL_MS = 30 * 1000

const supported = typeof window !== 'undefined' && 'Notification' in window

async function showNotification(title, body) {
  if (navigator.serviceWorker) {
    try {
      const reg = await navigator.serviceWorker.ready
      await reg.showNotification(title, { body, icon: '/pwa-192.png' })
      return
    } catch {
      // fall through to the plain Notification API
    }
  }
  new Notification(title, { body, icon: '/pwa-192.png' })
}

// Best-effort local reminder: while the app/tab is open (or briefly in the
// background), checks every 30s whether it's time to fire today's reminder.
// This is not a true background push — iOS only wakes the service worker for
// actual Push API messages from a server, which this app doesn't have.
export function useNotifications({ enabled, time }) {
  const [permission, setPermission] = useState(supported ? Notification.permission : 'unsupported')

  const requestPermission = useCallback(async () => {
    if (!supported) return 'unsupported'
    const result = await Notification.requestPermission()
    setPermission(result)
    return result
  }, [])

  useEffect(() => {
    if (!supported || !enabled || permission !== 'granted') return

    const check = () => {
      const now = new Date()
      const hh = String(now.getHours()).padStart(2, '0')
      const mm = String(now.getMinutes()).padStart(2, '0')
      const current = `${hh}:${mm}`
      if (current !== time) return

      const today = now.toISOString().slice(0, 10)
      const lastFired = localStorage.getItem(LAST_FIRED_KEY)
      if (lastFired === today) return

      localStorage.setItem(LAST_FIRED_KEY, today)
      showNotification('Weekly', 'Non dimenticare di segnare le tue attività di oggi ✅')
    }

    check()
    const id = setInterval(check, CHECK_INTERVAL_MS)
    return () => clearInterval(id)
  }, [enabled, time, permission])

  return { supported, permission, requestPermission }
}
