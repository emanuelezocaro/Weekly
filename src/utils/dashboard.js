import { addDays, formatDuration, startOfDay, startOfWeek, toISODate, toMonthISO } from './date'
import { aggregateDuration } from './entries'
import { goalDirection, goalForMonth, isGoalMet } from './goals'
import { colorVar } from './palette'

const FOOD_FIELDS = [
  { key: 'colazione', label: 'Colazione buona', goalKey: 'food_colazione' },
  { key: 'pranzo', label: 'Pranzo buono', goalKey: 'food_pranzo' },
  { key: 'cena', label: 'Cena buona', goalKey: 'food_cena' },
  { key: 'alcol', label: 'Alcol buono', goalKey: 'food_alcol' },
  { key: 'dolci', label: 'Dolci buono', goalKey: 'food_dolci' },
]

// Days "unlocked" so far within the goal's own period, counting today as a
// full day (e.g. Wednesday = day 3 of 7 in its week) -- this "if you spread
// the goal evenly across the period, how much should be unlocked by now" is
// the pace clock the whole dashboard is built around.
function daysSoFar(period, now) {
  const start = period === 'day' ? startOfDay(now) : startOfWeek(now)
  const days = []
  let d = start
  while (d <= now) {
    days.push(d)
    d = addDays(d, 1)
  }
  return days
}

function paceTarget(goal, elapsedDaysCount) {
  return goal.period === 'day' ? goal.value : (goal.value / 7) * elapsedDaysCount
}

function gapPhrase(direction, period, diffLabel) {
  if (direction === 'lower_is_better') {
    const periodPhrase = period === 'day' ? 'di oggi' : 'di questa settimana'
    return `Hai già superato di ${diffLabel} il margine ${periodPhrase}`
  }
  return period === 'day'
    ? `Mancano ${diffLabel} per raggiungere l'obiettivo di oggi`
    : `Mancano ${diffLabel} per stare in pace con la settimana`
}

function failedPhrase(diffLabel) {
  return `Obiettivo della settimana ormai fallito: ne mancherebbero ancora ${diffLabel} e non c'è più tempo`
}

// For goals where each day can only move the needle by so much (e.g. one
// "colazione buona" per day), catching up stops being possible once what's
// still missing exceeds what the remaining days could even provide -- at
// that point it's not "behind", it's already lost for this week, and no
// amount of "recupera" framing is honest. `maxPerDay` is omitted for items
// without a meaningful per-day ceiling (hours, Uscite), which skips this
// check entirely.
function buildItem({ key, label, swatchColor, goal, actual, elapsedDaysCount, fallbackDirection, formatDiff, maxPerDay }) {
  const target = paceTarget(goal, elapsedDaysCount)
  const direction = goalDirection(goal, fallbackDirection)
  const met = isGoalMet(goal, actual, target, fallbackDirection)

  let status = met ? 'met' : 'behind'
  if (!met && direction === 'higher_is_better' && goal.period === 'week' && maxPerDay !== undefined) {
    const remainingDays = 7 - elapsedDaysCount + 1
    const stillMissing = goal.value - actual
    if (stillMissing > remainingDays * maxPerDay) status = 'failed'
  }

  const paceDiff = direction === 'lower_is_better' ? actual - target : target - actual
  const fullGap = direction === 'lower_is_better' ? actual - goal.value : goal.value - actual

  let gapText = null
  if (status === 'behind') gapText = gapPhrase(direction, goal.period, formatDiff(Math.max(0, paceDiff)))
  if (status === 'failed') gapText = failedPhrase(formatDiff(Math.max(0, fullGap)))

  return {
    key,
    label,
    swatchColor,
    period: goal.period,
    status,
    gapText,
    progressPct: target > 0 ? Math.min(100, Math.max(0, (actual / target) * 100)) : 100,
  }
}

const formatCount = (n) => String(Math.ceil(n))
const formatHours = (minutes) => formatDuration(minutes * 60000)

// Builds the "sei in pace?" list for the Dashboard: every item with a goal,
// split into what needs attention right now, what's already lost for this
// period (too little time left to catch up), and what's on track. Unlike
// the Report cards (which judge a whole, often-still-open period against
// its full target), this compares actual-so-far against a target scaled to
// how much of the period has elapsed -- so day 1 of a week doesn't read as
// "behind" just because the week has barely started.
export function buildDashboardItems({ activities, entries, cigarettes, outputs, food, goals, now = new Date() }) {
  const monthIso = toMonthISO(now)
  const items = []

  for (const activity of activities) {
    const goal = goalForMonth(goals, activity.id, monthIso)
    if (!goal) continue
    const days = daysSoFar(goal.period, now)
    const totals = aggregateDuration(entries, days[0], addDays(startOfDay(now), 1), now)
    const actualMinutes = (totals.get(activity.id) || 0) / 60000
    items.push(
      buildItem({
        key: activity.id,
        label: activity.name,
        swatchColor: colorVar(activity.colorSlot),
        goal,
        actual: actualMinutes,
        elapsedDaysCount: days.length,
        fallbackDirection: 'higher_is_better',
        formatDiff: formatHours,
      }),
    )
  }

  const cigGoal = goalForMonth(goals, 'cigarettes', monthIso)
  if (cigGoal) {
    const days = daysSoFar(cigGoal.period, now)
    const isoDays = new Set(days.map(toISODate))
    const actual = cigarettes.filter((c) => isoDays.has(c.date)).reduce((sum, c) => sum + c.count, 0)
    items.push(
      buildItem({
        key: 'cigarettes',
        label: 'Sigarette',
        swatchColor: 'var(--series-1)',
        goal: cigGoal,
        actual,
        elapsedDaysCount: days.length,
        fallbackDirection: 'lower_is_better',
        formatDiff: formatCount,
      }),
    )
  }

  const outputsGoal = goalForMonth(goals, 'outputs', monthIso)
  if (outputsGoal) {
    const days = daysSoFar(outputsGoal.period, now)
    const isoDays = new Set(days.map(toISODate))
    const actual = outputs.filter((o) => isoDays.has(o.date)).length
    items.push(
      buildItem({
        key: 'outputs',
        label: 'Uscite',
        swatchColor: 'var(--accent)',
        goal: outputsGoal,
        actual,
        elapsedDaysCount: days.length,
        fallbackDirection: 'higher_is_better',
        formatDiff: formatCount,
      }),
    )
  }

  for (const field of FOOD_FIELDS) {
    const goal = goalForMonth(goals, field.goalKey, monthIso)
    if (!goal) continue
    const days = daysSoFar(goal.period, now)
    const isoDays = new Set(days.map(toISODate))
    const actual = food.filter((f) => isoDays.has(f.date) && f[field.key] === 'good').length
    items.push(
      buildItem({
        key: field.goalKey,
        label: field.label,
        swatchColor: 'var(--series-2)',
        goal,
        actual,
        elapsedDaysCount: days.length,
        fallbackDirection: 'higher_is_better',
        formatDiff: formatCount,
        maxPerDay: 1,
      }),
    )
  }

  const extraGoal = goalForMonth(goals, 'food_extra', monthIso)
  if (extraGoal) {
    const days = daysSoFar(extraGoal.period, now)
    const isoDays = new Set(days.map(toISODate))
    const actual = food.filter((f) => isoDays.has(f.date) && f.extra === 'no').length
    items.push(
      buildItem({
        key: 'food_extra',
        label: 'Extra evitato',
        swatchColor: 'var(--series-2)',
        goal: extraGoal,
        actual,
        elapsedDaysCount: days.length,
        fallbackDirection: 'higher_is_better',
        formatDiff: formatCount,
        maxPerDay: 1,
      }),
    )
  }

  const behind = items
    .filter((i) => i.status === 'behind')
    .sort((a, b) => (a.period === b.period ? 0 : a.period === 'day' ? -1 : 1))
  const failed = items.filter((i) => i.status === 'failed')
  const onTrack = items.filter((i) => i.status === 'met')

  return { behind, failed, onTrack }
}
