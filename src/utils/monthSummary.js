import {
  addDays,
  addMonths,
  formatDateRange,
  formatDuration,
  formatMonthLabel,
  groupDaysByWeek,
  startOfMonth,
  toISODate,
  toMonthISO,
} from './date'
import { activityStats } from './entries'
import { goalForMonth, goalPerBar, isGoalMet, minutesToHours } from './goals'

const FOOD_FIELDS = [
  { key: 'colazione', label: 'Colazione', goalKey: 'food_colazione' },
  { key: 'pranzo', label: 'Pranzo', goalKey: 'food_pranzo' },
  { key: 'cena', label: 'Cena', goalKey: 'food_cena' },
  { key: 'alcol', label: 'Alcol', goalKey: 'food_alcol' },
  { key: 'dolci', label: 'Dolci', goalKey: 'food_dolci' },
]

function monthDays(monthDate) {
  const start = startOfMonth(monthDate)
  const end = startOfMonth(addMonths(monthDate, 1))
  const days = []
  let d = start
  while (d < end) {
    days.push(d)
    d = addDays(d, 1)
  }
  return days
}

function goalPeriodLabel(goal) {
  return goal.period === 'day' ? 'giorno' : 'settimana'
}

// Lines for a single week within the month, one topic per line -- so
// nothing is summed across weeks.
function weekSummaryLines(weekDays, { activities, entries, outputs, cigarettes, food, goals, monthIso }) {
  const lines = []
  const rangeStart = weekDays[0]
  const rangeEnd = addDays(weekDays[weekDays.length - 1], 1)
  const now = new Date()

  const { stats, trackedMs, untrackedMs } = activityStats(activities, entries, rangeStart, rangeEnd, now)
  lines.push(`Ore tracciate: ${formatDuration(trackedMs)} (non registrato: ${formatDuration(untrackedMs)})`)
  for (const s of stats) {
    if (s.totalMs === 0) continue
    const goal = goalForMonth(goals, s.id, monthIso)
    let note = ''
    if (goal) {
      const weeklyTargetMinutes = goalPerBar(goal, 'week')
      const met = isGoalMet(goal, s.totalMs / 60000, weeklyTargetMinutes)
      note = ` (obiettivo ${minutesToHours(goal.value)}h/${goalPeriodLabel(goal)}: ${met ? 'raggiunto' : 'non raggiunto'})`
    }
    lines.push(`- ${s.name}: ${formatDuration(s.totalMs)}${note}`)
  }

  const cigRecords = weekDays.map((d) => cigarettes.find((c) => c.date === toISODate(d))).filter(Boolean)
  if (cigRecords.length > 0) {
    const total = cigRecords.reduce((sum, c) => sum + c.count, 0)
    const goal = goalForMonth(goals, 'cigarettes', monthIso)
    let note = ''
    if (goal) {
      // Fewer is better here, so the goal is a ceiling, not a floor.
      const weeklyTarget = Math.round(goalPerBar(goal, 'week'))
      const respected = total <= weeklyTarget
      note = ` (obiettivo ${goal.value}/${goalPeriodLabel(goal)}: ${respected ? 'rispettato' : 'superato'})`
    }
    lines.push(`Sigarette: ${total} totali${note}`)
  }

  const outputsTotal = weekDays.reduce((sum, d) => sum + outputs.filter((o) => o.date === toISODate(d)).length, 0)
  const outputsGoal = goalForMonth(goals, 'outputs', monthIso)
  if (outputsTotal > 0 || outputsGoal) {
    let note = ''
    if (outputsGoal) {
      const weeklyTarget = Math.round(goalPerBar(outputsGoal, 'week'))
      const met = outputsTotal >= weeklyTarget
      note = ` (obiettivo ${outputsGoal.value}/${goalPeriodLabel(outputsGoal)}: ${met ? 'raggiunto' : 'non raggiunto'})`
    }
    lines.push(`Uscite: ${outputsTotal}${note}`)
  }

  const foodRecords = weekDays.map((d) => food.find((f) => f.date === toISODate(d)))
  if (foodRecords.some(Boolean)) {
    for (const field of FOOD_FIELDS) {
      const counts = { good: 0, mid: 0, bad: 0 }
      for (const r of foodRecords) {
        if (r && r[field.key]) counts[r[field.key]] += 1
      }
      if (counts.good + counts.mid + counts.bad === 0) continue
      const goal = goalForMonth(goals, field.goalKey, monthIso)
      let note = ''
      if (goal) {
        const weeklyTarget = Math.round(goalPerBar(goal, 'week'))
        const met = counts.good >= weeklyTarget
        note = ` (obiettivo ${weeklyTarget}: ${met ? 'raggiunto' : 'non raggiunto'})`
      }
      lines.push(`${field.label}: ${counts.good} buono, ${counts.mid} medio, ${counts.bad} male${note}`)
    }
    const extraNo = foodRecords.filter((r) => r && r.extra === 'no').length
    const extraYes = foodRecords.filter((r) => r && r.extra === 'yes').length
    if (extraNo + extraYes > 0) {
      const goal = goalForMonth(goals, 'food_extra', monthIso)
      let note = ''
      if (goal) {
        const weeklyTarget = Math.round(goalPerBar(goal, 'week'))
        const met = extraNo >= weeklyTarget
        note = ` (obiettivo ${weeklyTarget}: ${met ? 'raggiunto' : 'non raggiunto'})`
      }
      lines.push(`Extra: evitato ${extraNo}, capitato ${extraYes}${note}`)
    }
  }

  return lines
}

export function buildMonthSummaryText(monthDate, { activities, entries, outputs, cigarettes, food, goals }) {
  const days = monthDays(monthDate)
  const monthIso = toMonthISO(monthDate)
  const weeks = groupDaysByWeek(days)
  const ctx = { activities, entries, outputs, cigarettes, food, goals, monthIso }

  const lines = [`Riepilogo ${formatMonthLabel(monthDate)}`, '']

  weeks.forEach((w, i) => {
    const label = formatDateRange(w.days[0], addDays(w.days[w.days.length - 1], 1))
    lines.push(`Settimana ${i + 1} (${label})`)
    const weekLines = weekSummaryLines(w.days, ctx)
    lines.push(...(weekLines.length > 0 ? weekLines : ['Nessun dato']))
    lines.push('')
  })

  return lines.join('\n').trimEnd()
}
