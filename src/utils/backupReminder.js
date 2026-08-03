const KEY = 'weekly:v2:lastBackupAt'
const REMINDER_AFTER_DAYS = 14

export function markBackupDone() {
  localStorage.setItem(KEY, String(Date.now()))
}

export function daysSinceBackup(now = new Date()) {
  const raw = localStorage.getItem(KEY)
  if (!raw) return Infinity
  return Math.floor((now.getTime() - Number(raw)) / 86400000)
}

export function shouldShowBackupReminder(now = new Date()) {
  return daysSinceBackup(now) >= REMINDER_AFTER_DAYS
}
