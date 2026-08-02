import { addDays, addMonths, formatDuration, formatMonthLabel, startOfMonth, toISODate, toMonthISO } from './date'
import { activityStats } from './entries'
import { goalForMonth, minutesToHours } from './goals'

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

// A goal set per day or per week, scaled to a target for the whole month.
function scaledTarget(goal, daysCount) {
  if (!goal) return null
  const perDay = goal.period === 'day' ? goal.value : goal.value / 7
  return perDay * daysCount
}

function goalPeriodLabel(goal) {
  return goal.period === 'day' ? 'giorno' : 'settimana'
}

export function buildMonthSummaryText(monthDate, { activities, entries, outputs, cigarettes, food, goals }) {
  const days = monthDays(monthDate)
  const daysCount = days.length
  const rangeStart = days[0]
  const rangeEnd = addDays(days[days.length - 1], 1)
  const monthIso = toMonthISO(monthDate)
  const now = new Date()

  const lines = [`Riepilogo ${formatMonthLabel(monthDate)}`, '']

  const { stats, trackedMs, untrackedMs } = activityStats(activities, entries, rangeStart, rangeEnd, now)
  lines.push('ORE')
  lines.push(`Tracciato: ${formatDuration(trackedMs)}`)
  lines.push(`Non registrato: ${formatDuration(untrackedMs)}`)
  lines.push('')

  if (stats.length > 0) {
    lines.push('ATTIVITÀ')
    for (const s of stats) {
      const goal = goalForMonth(goals, s.id, monthIso)
      let note = ''
      if (goal) {
        const targetMinutes = scaledTarget(goal, daysCount)
        const met = s.totalMs / 60000 >= targetMinutes
        note = ` (obiettivo ${minutesToHours(goal.value)}h/${goalPeriodLabel(goal)}: ${met ? 'raggiunto' : 'non raggiunto'})`
      }
      lines.push(`${s.name}: ${formatDuration(s.totalMs)} totali, ${formatDuration(s.avgMsPerDay)}/giorno${note}`)
    }
    lines.push('')
  }

  const cigRecords = days.map((d) => cigarettes.find((c) => c.date === toISODate(d))).filter(Boolean)
  const cigTotal = cigRecords.reduce((sum, c) => sum + c.count, 0)
  const cigAvg = cigRecords.length > 0 ? Math.round(cigTotal / cigRecords.length) : 0
  lines.push('SIGARETTE')
  if (cigRecords.length === 0) {
    lines.push('Nessun dato')
  } else {
    const goal = goalForMonth(goals, 'cigarettes', monthIso)
    let note = ''
    if (goal) {
      // Fewer is better here, so the goal is a ceiling, not a floor.
      const target = Math.round(scaledTarget(goal, daysCount))
      const respected = cigTotal <= target
      note = ` (obiettivo ${goal.value}/${goalPeriodLabel(goal)}: ${respected ? 'rispettato' : 'superato'})`
    }
    lines.push(`${cigTotal} in totale, ${cigAvg}/giorno in media${note}`)
  }
  lines.push('')

  const outputsTotal = days.reduce(
    (sum, d) => sum + outputs.filter((o) => o.date === toISODate(d)).length,
    0,
  )
  const outputsDaysWithData = days.filter((d) => outputs.some((o) => o.date === toISODate(d))).length
  lines.push('USCITE')
  {
    const goal = goalForMonth(goals, 'outputs', monthIso)
    let note = ''
    if (goal) {
      const target = Math.round(scaledTarget(goal, daysCount))
      const met = outputsTotal >= target
      note = ` (obiettivo ${goal.value}/${goalPeriodLabel(goal)}: ${met ? 'raggiunto' : 'non raggiunto'})`
    }
    lines.push(`${outputsTotal} in totale, ${outputsDaysWithData}/${daysCount} giorni con almeno un'uscita${note}`)
  }
  lines.push('')

  const foodRecords = days.map((d) => food.find((f) => f.date === toISODate(d)))
  lines.push('ALIMENTAZIONE')
  for (const field of FOOD_FIELDS) {
    const counts = { good: 0, mid: 0, bad: 0 }
    for (const r of foodRecords) {
      if (r && r[field.key]) counts[r[field.key]] += 1
    }
    const goal = goalForMonth(goals, field.goalKey, monthIso)
    let note = ''
    if (goal) {
      const target = Math.round(scaledTarget(goal, daysCount))
      const met = counts.good >= target
      note = ` (obiettivo ${target}: ${met ? 'raggiunto' : 'non raggiunto'})`
    }
    lines.push(`${field.label}: ${counts.good} buono, ${counts.mid} medio, ${counts.bad} male${note}`)
  }
  {
    const extraNo = foodRecords.filter((r) => r && r.extra === 'no').length
    const extraYes = foodRecords.filter((r) => r && r.extra === 'yes').length
    const goal = goalForMonth(goals, 'food_extra', monthIso)
    let note = ''
    if (goal) {
      const target = Math.round(scaledTarget(goal, daysCount))
      const met = extraNo >= target
      note = ` (obiettivo ${target}: ${met ? 'raggiunto' : 'non raggiunto'})`
    }
    lines.push(`Extra: evitato ${extraNo} giorni, capitato ${extraYes} giorni${note}`)
  }

  return lines.join('\n')
}
