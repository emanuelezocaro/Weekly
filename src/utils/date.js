const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom']
const DAY_LABELS_FULL = [
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
  'Domenica',
]
const MONTH_LABELS = [
  'Gennaio',
  'Febbraio',
  'Marzo',
  'Aprile',
  'Maggio',
  'Giugno',
  'Luglio',
  'Agosto',
  'Settembre',
  'Ottobre',
  'Novembre',
  'Dicembre',
]

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function todayISO() {
  return toISODate(new Date())
}

export function parseISODate(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

// Monday-based weekday index: 0 = Monday, 6 = Sunday
function mondayIndex(date) {
  return (date.getDay() + 6) % 7
}

export function startOfWeek(date) {
  const d = new Date(date)
  d.setDate(d.getDate() - mondayIndex(d))
  d.setHours(0, 0, 0, 0)
  return d
}

export function addDays(date, amount) {
  const d = new Date(date)
  d.setDate(d.getDate() + amount)
  return d
}

export function getWeekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
}

export function dayLabel(date, full = false) {
  return (full ? DAY_LABELS_FULL : DAY_LABELS)[mondayIndex(date)]
}

export function formatWeekRange(weekStart) {
  const weekEnd = addDays(weekStart, 6)
  const sameMonth = weekStart.getMonth() === weekEnd.getMonth()
  const startStr = `${weekStart.getDate()}${sameMonth ? '' : ' ' + MONTH_LABELS[weekStart.getMonth()].slice(0, 3)}`
  const endStr = `${weekEnd.getDate()} ${MONTH_LABELS[weekEnd.getMonth()].slice(0, 3)}`
  return `${startStr} – ${endStr}`
}

export function formatFullDate(date) {
  return `${dayLabel(date, true)} ${date.getDate()} ${MONTH_LABELS[date.getMonth()]}`
}

export function isSameDay(a, b) {
  return toISODate(a) === toISODate(b)
}

export function isFuture(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return date > today
}

export function isSameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
}

export function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function endOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0)
}

export function addMonths(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1)
}

export function formatMonthLabel(date) {
  return `${MONTH_LABELS[date.getMonth()]} ${date.getFullYear()}`
}

export function getDatesInMonth(monthDate) {
  const start = startOfMonth(monthDate)
  const end = endOfMonth(monthDate)
  const days = []
  let d = start
  while (d <= end) {
    days.push(d)
    d = addDays(d, 1)
  }
  return days
}

// Full weeks (Mon-Sun) covering the month, for a calendar grid.
export function getMonthMatrix(monthDate) {
  const gridStart = startOfWeek(startOfMonth(monthDate))
  const gridEndWeekStart = startOfWeek(endOfMonth(monthDate))
  const weeks = []
  let cursor = gridStart
  while (cursor <= gridEndWeekStart) {
    weeks.push(getWeekDates(cursor))
    cursor = addDays(cursor, 7)
  }
  return weeks
}
