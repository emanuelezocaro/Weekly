import {
  addDays,
  addMonths,
  formatDateRange,
  formatDuration,
  formatFullDate,
  formatMonthLabel,
  groupDaysByWeek,
  startOfMonth,
  toISODate,
  toMonthISO,
} from './date'
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
function weekSummaryLines(weekDays, { activities, durations, checklist, outputs, cigarettes, food, diary, goals, monthIso }) {
  const lines = []
  const weekIsoDates = weekDays.map(toISODate)

  for (const activity of activities) {
    if (activity.mode === 'checklist') {
      const doneCount = weekIsoDates.filter((iso) =>
        checklist.some((c) => c.activityId === activity.id && c.date === iso),
      ).length
      if (doneCount === 0) continue
      const goal = goalForMonth(goals, activity.id, monthIso)
      let note = ''
      if (goal) {
        const weeklyTarget = Math.round(goalPerBar(goal, 'week'))
        const met = isGoalMet(goal, doneCount, weeklyTarget)
        note = ` (obiettivo ${goal.value}/${goalPeriodLabel(goal)}: ${met ? 'raggiunto' : 'non raggiunto'})`
      }
      lines.push(`- ${activity.name}: ${doneCount}/${weekDays.length} giorni fatti${note}`)
    } else {
      const totalMinutes = weekIsoDates.reduce(
        (sum, iso) =>
          sum +
          durations
            .filter((d) => d.activityId === activity.id && d.date === iso)
            .reduce((s, d) => s + d.minutes, 0),
        0,
      )
      if (totalMinutes === 0) continue
      const goal = goalForMonth(goals, activity.id, monthIso)
      let note = ''
      if (goal) {
        const weeklyTargetMinutes = goalPerBar(goal, 'week')
        const met = isGoalMet(goal, totalMinutes, weeklyTargetMinutes)
        note = ` (obiettivo ${minutesToHours(goal.value)}h/${goalPeriodLabel(goal)}: ${met ? 'raggiunto' : 'non raggiunto'})`
      }
      lines.push(`- ${activity.name}: ${formatDuration(totalMinutes * 60000)}${note}`)
    }
  }

  const cigRecords = weekDays.map((d) => cigarettes.find((c) => c.date === toISODate(d))).filter(Boolean)
  if (cigRecords.length > 0) {
    const total = cigRecords.reduce((sum, c) => sum + c.count, 0)
    const goal = goalForMonth(goals, 'cigarettes', monthIso)
    let note = ''
    if (goal) {
      // Fewer is better here by default, so the goal is normally a ceiling.
      const weeklyTarget = Math.round(goalPerBar(goal, 'week'))
      const respected = isGoalMet(goal, total, weeklyTarget, 'lower_is_better')
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
      const met = isGoalMet(outputsGoal, outputsTotal, weeklyTarget)
      note = ` (obiettivo ${outputsGoal.value}/${goalPeriodLabel(outputsGoal)}: ${met ? 'raggiunto' : 'non raggiunto'})`
    }
    lines.push(`Uscite: ${outputsTotal}${note}`)
    for (const d of weekDays) {
      const dayOutputs = outputs.filter((o) => o.date === toISODate(d))
      if (dayOutputs.length === 0) continue
      lines.push(formatFullDate(d))
      for (const o of dayOutputs) lines.push(`- ${o.text}`)
    }
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
        const met = isGoalMet(goal, counts.good, weeklyTarget)
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
        const met = isGoalMet(goal, extraNo, weeklyTarget)
        note = ` (obiettivo ${weeklyTarget}: ${met ? 'raggiunto' : 'non raggiunto'})`
      }
      lines.push(`Extra: evitato ${extraNo}, capitato ${extraYes}${note}`)
    }
  }

  const diaryRecords = weekDays
    .map((d) => (diary ?? []).find((entry) => entry.date === toISODate(d) && entry.text.trim()))
    .filter(Boolean)
  if (diaryRecords.length > 0) {
    lines.push(`Diary: ${diaryRecords.length}/${weekDays.length} giorni con una nota`)
    for (const d of weekDays) {
      const rec = diaryRecords.find((r) => r.date === toISODate(d))
      if (!rec) continue
      lines.push(formatFullDate(d))
      lines.push(rec.text)
    }
  }

  return lines
}

// Same per-week breakdown as one week inside buildMonthSummaryText, but
// standalone -- for when you want just that one week's summary, not the
// whole month it falls in.
export function buildWeekSummaryText(weekStart, { activities, durations, checklist, outputs, cigarettes, food, diary, goals }) {
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))
  const monthIso = toMonthISO(weekDays[weekDays.length - 1])
  const ctx = { activities, durations, checklist, outputs, cigarettes, food, diary, goals, monthIso }
  const label = formatDateRange(weekStart, addDays(weekStart, 7))

  const lines = [`Riepilogo settimana ${label}`, '']
  const weekLines = weekSummaryLines(weekDays, ctx)
  lines.push(...(weekLines.length > 0 ? weekLines : ['Nessun dato']))

  return lines.join('\n').trimEnd()
}

export function buildMonthSummaryText(monthDate, { activities, durations, checklist, outputs, cigarettes, food, diary, goals }) {
  const days = monthDays(monthDate)
  const monthIso = toMonthISO(monthDate)
  const weeks = groupDaysByWeek(days)
  const ctx = { activities, durations, checklist, outputs, cigarettes, food, diary, goals, monthIso }

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
