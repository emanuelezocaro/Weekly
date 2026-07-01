import { addDays, toISODate, todayISO } from './date'

// Longest run of consecutive done days ending today (or yesterday, so a
// not-yet-logged today doesn't break an ongoing streak).
export function currentStreak(logs, activityId) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let cursor = today
  if (!logs[toISODate(cursor)]?.[activityId]) {
    cursor = addDays(cursor, -1)
  }

  let streak = 0
  while (logs[toISODate(cursor)]?.[activityId]) {
    streak += 1
    cursor = addDays(cursor, -1)
  }
  return streak
}

export function bestStreak(logs, activityId) {
  const doneDates = Object.keys(logs)
    .filter((iso) => logs[iso]?.[activityId])
    .sort()
  if (doneDates.length === 0) return 0

  let best = 1
  let run = 1
  for (let i = 1; i < doneDates.length; i++) {
    const prev = new Date(doneDates[i - 1])
    const curr = new Date(doneDates[i])
    const diffDays = Math.round((curr - prev) / 86400000)
    run = diffDays === 1 ? run + 1 : 1
    best = Math.max(best, run)
  }
  return best
}

// Completion stats for an activity over the last `days` days (including today).
export function completionRate(logs, activityId, days) {
  const today = todayISO()
  let done = 0
  let total = 0
  let cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  for (let i = 0; i < days; i++) {
    const iso = toISODate(cursor)
    if (iso <= today) {
      total += 1
      if (logs[iso]?.[activityId]) done += 1
    }
    cursor = addDays(cursor, -1)
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}

// Completion stats for an activity over an explicit list of Date objects.
// Days in the future are excluded from the total (can't have been done yet).
export function rangeCompletion(logs, activityId, dates) {
  const today = todayISO()
  let done = 0
  let total = 0
  for (const date of dates) {
    const iso = toISODate(date)
    if (iso > today) continue
    total += 1
    if (logs[iso]?.[activityId]) done += 1
  }
  return { done, total, pct: total === 0 ? 0 : Math.round((done / total) * 100) }
}

// Fraction (0-1) of activities completed on a given day, for calendar dots.
export function dayCompletionRatio(logs, activities, iso) {
  if (activities.length === 0) return 0
  const day = logs[iso] || {}
  const done = activities.reduce((n, a) => n + (day[a.id] ? 1 : 0), 0)
  return done / activities.length
}
