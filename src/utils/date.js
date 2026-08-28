// Fresh-start boundary: entries before this date are ignored everywhere,
// and navigation can't go further back than this day.
export const APP_START_DATE = new Date(2026, 6, 1)

// Monday-first, English -- dates are shown in English (3-letter month)
// everywhere except the month-statistics header, which spells the month out
// (see formatMonthLabel).
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTH_LABELS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

export function toISODate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// "YYYY-MM", used to version goals month by month.
export function toMonthISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

// "Jul" from "2026-07", to tag a goal line with the month it belonged to.
export function formatMonthShort(monthIso) {
  const m = Number(monthIso.split('-')[1])
  return MONTH_LABELS[m - 1].slice(0, 3)
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

export function dayLabel(date) {
  return DAY_LABELS[mondayIndex(date)]
}

export function formatWeekRange(weekStart) {
  return formatDateRange(weekStart, addDays(weekStart, 7))
}

// endExclusive is midnight of the day after the range (as returned by
// periodRange), so the label always reflects the actual data range shown
// -- e.g. clamped to APP_START_DATE for the very first week/month tracked.
export function formatDateRange(startInclusive, endExclusive) {
  const lastDay = addDays(endExclusive, -1)
  const sameMonth = startInclusive.getMonth() === lastDay.getMonth()
  const startStr = `${startInclusive.getDate()}${sameMonth ? '' : ' ' + MONTH_LABELS[startInclusive.getMonth()].slice(0, 3)}`
  const endStr = `${lastDay.getDate()} ${MONTH_LABELS[lastDay.getMonth()].slice(0, 3)}`
  return `${startStr} – ${endStr}`
}

// "Mon, 3 Aug" -- compact weekday + day/month, used everywhere a specific
// day needs a label (day-switcher header, per-day list headers, etc).
export function formatFullDate(date) {
  return `${dayLabel(date)}, ${date.getDate()} ${MONTH_LABELS[date.getMonth()].slice(0, 3)}`
}

export function isSameDay(a, b) {
  return toISODate(a) === toISODate(b)
}

export function isFuture(date) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d > today
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

// Month statistics get the month spelled out in full, with a 2-digit year
// ("August 26") -- everywhere else dates are abbreviated (see formatFullDate,
// formatShortDate, formatDateRange).
export function formatMonthLabel(date) {
  const yy = String(date.getFullYear()).slice(-2)
  return `${MONTH_LABELS[date.getMonth()]} ${yy}`
}

export function formatShortDate(date) {
  return `${date.getDate()} ${MONTH_LABELS[date.getMonth()].slice(0, 3)}`
}

// Buckets a (possibly irregular, e.g. quarter-clamped) list of days into
// Mon-Sun weeks, for aggregating daily charts into weekly bars.
export function groupDaysByWeek(days) {
  const weeks = []
  const indexByKey = new Map()
  for (const d of days) {
    const weekStart = startOfWeek(d)
    const key = toISODate(weekStart)
    if (!indexByKey.has(key)) {
      indexByKey.set(key, weeks.length)
      weeks.push({ weekStart, days: [] })
    }
    weeks[indexByKey.get(key)].days.push(d)
  }
  return weeks
}

// Same idea as groupDaysByWeek, but bucketed into calendar months -- for
// aggregating a year's worth of daily charts into 12 monthly bars.
export function groupDaysByMonth(days) {
  const months = []
  const indexByKey = new Map()
  for (const d of days) {
    const key = toMonthISO(d)
    if (!indexByKey.has(key)) {
      indexByKey.set(key, months.length)
      months.push({ monthStart: startOfMonth(d), days: [] })
    }
    months[indexByKey.get(key)].days.push(d)
  }
  return months
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

// --- Full datetime (date + time-of-day) helpers, for continuous time entries ---

export function toISODateTime(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  const s = String(date.getSeconds()).padStart(2, '0')
  return `${toISODate(date)}T${h}:${mi}:${s}`
}

export function nowISODateTime() {
  return toISODateTime(new Date())
}

export function parseISODateTime(iso) {
  const [datePart, timePart = '00:00:00'] = iso.split('T')
  const [y, m, d] = datePart.split('-').map(Number)
  const [h, mi, s] = timePart.split(':').map(Number)
  return new Date(y, m - 1, d, h, mi, s || 0)
}

export function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Exclusive upper bound: midnight of the following day.
export function endOfDay(date) {
  return addDays(startOfDay(date), 1)
}

export function formatTime(date) {
  const h = String(date.getHours()).padStart(2, '0')
  const mi = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${mi}`
}

// "HH:MM" rounded to the nearest half-hour, for editable time inputs.
export function formatTimeRounded(date, stepMinutes = 30) {
  const totalMinutes = date.getHours() * 60 + date.getMinutes()
  const rounded = Math.round(totalMinutes / stepMinutes) * stepMinutes
  const wrapped = ((rounded % 1440) + 1440) % 1440
  const h = String(Math.floor(wrapped / 60)).padStart(2, '0')
  const mi = String(wrapped % 60).padStart(2, '0')
  return `${h}:${mi}`
}

export function formatDuration(ms) {
  const totalMinutes = Math.round(ms / 60000)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}
