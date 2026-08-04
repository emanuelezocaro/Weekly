const KEY = 'weekly:v2:lastBackupAt'

export function markBackupDone() {
  localStorage.setItem(KEY, String(Date.now()))
}
