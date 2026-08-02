import { addDays, formatDuration, startOfWeek, toISODate, toMonthISO } from './date'
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

// The Dashboard is a weekly compass: every item, whether its goal is set
// "al giorno" or "a settimana", is judged against the week as a whole --
// today alone being fine doesn't mean much if the week is already blown.
// So "actual" always covers Monday through today, never just today.
function daysSoFarThisWeek(now) {
  const start = startOfWeek(now)
  const days = []
  let d = start
  while (d <= now) {
    days.push(d)
    d = addDays(d, 1)
  }
  return days
}

// A goal set "al giorno" implies a weekly quota of value*7 (spread evenly);
// one set "a settimana" already is that quota.
function perDayRate(goal) {
  return goal.period === 'day' ? goal.value : goal.value / 7
}

// Days from today through the end of this week that don't have a value yet
// for `field` -- a day already rated (good or not) has used its one slot,
// so it's not a chance to still catch up, unlike a day that's still blank.
function openDaysThisWeek(records, field, now) {
  const todayIso = toISODate(now)
  const weekStart = startOfWeek(now)
  let count = 0
  for (let i = 0; i < 7; i++) {
    const dayIso = toISODate(addDays(weekStart, i))
    if (dayIso < todayIso) continue
    const rec = records.find((r) => r.date === dayIso)
    if (!rec || !rec[field]) count += 1
  }
  return count
}

function behindPhrase(diffLabel, targetLabel) {
  return `Mancano ${diffLabel} per raggiungere il tuo obiettivo di ${targetLabel}`
}

function overPacePhrase(diffLabel, targetLabel) {
  return `Hai fatto ${diffLabel} in più rispetto al tuo obiettivo di ${targetLabel}`
}

function failedPhrase(actualLabel, goalLabel) {
  return `Fallito perché hai fatto ${actualLabel} anziché ${goalLabel}`
}

function metPhrase(direction, diffLabel, targetLabel, actualLabel) {
  return direction === 'lower_is_better'
    ? `Hai fatto ${diffLabel} in meno di ${targetLabel} (obiettivo) per un totale di ${actualLabel}`
    : `Hai fatto ${diffLabel} in più di ${targetLabel} (obiettivo) per un totale di ${actualLabel}`
}

// `remainingCapacity` (precomputed by the caller, day-by-day data this
// function doesn't have) caps how much a "higher is better" goal can still
// close before the week ends -- past that, it's not "behind" anymore, it's
// already lost. For "lower is better" goals there's no such ceiling check:
// once the week's cumulative total already exceeds the full weekly quota,
// nothing left in the week can undo that, so it's an immediate "failed"
// regardless of days remaining (you can't un-smoke a cigarette).
function buildItem({ key, label, swatchColor, goal, actual, elapsedDaysThisWeek, fallbackDirection, formatDiff, remainingCapacity }) {
  const rate = perDayRate(goal)
  const target = rate * elapsedDaysThisWeek
  const fullWeekQuota = rate * 7
  const direction = goalDirection(goal, fallbackDirection)

  let status
  if (direction === 'lower_is_better') {
    status = actual > fullWeekQuota ? 'failed' : actual <= target ? 'met' : 'behind'
  } else {
    const met = isGoalMet(goal, actual, target, fallbackDirection)
    status = met ? 'met' : 'behind'
    if (!met && remainingCapacity !== undefined && fullWeekQuota - actual > remainingCapacity) status = 'failed'
  }

  let gapText = null
  if (status === 'behind') {
    gapText =
      direction === 'lower_is_better'
        ? overPacePhrase(formatDiff(actual - target), formatDiff(target))
        : behindPhrase(formatDiff(target - actual), formatDiff(target))
  }
  if (status === 'failed') gapText = failedPhrase(formatDiff(actual), formatDiff(fullWeekQuota))
  if (status === 'met') {
    const metDiff = direction === 'lower_is_better' ? target - actual : actual - target
    gapText = metPhrase(direction, formatDiff(Math.max(0, metDiff)), formatDiff(target), formatDiff(actual))
  }

  return {
    key,
    label,
    swatchColor,
    status,
    gapText,
    progressPct: target > 0 ? Math.min(100, Math.max(0, (actual / target) * 100)) : 100,
  }
}

const formatCount = (n) => String(Math.ceil(n))
const formatHours = (minutes) => formatDuration(minutes * 60000)

// Builds the "sono in pace con la settimana?" list for the Dashboard: every
// item with a goal, split into what needs attention right now, what's
// already lost for this week (too little time left to catch up, or -- for
// "less is better" goals -- already irreversibly over budget), and what's
// on track. Unlike the Report cards (which judge a whole, often-still-open
// period against its full target with no notion of "so far"), this always
// compares the week's cumulative total against a target scaled to how much
// of the week has elapsed.
export function buildDashboardItems({ activities, entries, cigarettes, outputs, food, goals, now = new Date() }) {
  const monthIso = toMonthISO(now)
  const items = []
  const weekDays = daysSoFarThisWeek(now)
  const isoWeekDays = new Set(weekDays.map(toISODate))
  const elapsedDaysThisWeek = weekDays.length

  for (const activity of activities) {
    const goal = goalForMonth(goals, activity.id, monthIso)
    if (!goal) continue
    const totals = aggregateDuration(entries, weekDays[0], addDays(weekDays[weekDays.length - 1], 1), now)
    const actualMinutes = (totals.get(activity.id) || 0) / 60000
    items.push(
      buildItem({
        key: activity.id,
        label: activity.name,
        swatchColor: colorVar(activity.colorSlot),
        goal,
        actual: actualMinutes,
        elapsedDaysThisWeek,
        fallbackDirection: 'higher_is_better',
        formatDiff: formatHours,
      }),
    )
  }

  const cigGoal = goalForMonth(goals, 'cigarettes', monthIso)
  if (cigGoal) {
    const actual = cigarettes.filter((c) => isoWeekDays.has(c.date)).reduce((sum, c) => sum + c.count, 0)
    items.push(
      buildItem({
        key: 'cigarettes',
        label: 'Sigarette',
        swatchColor: 'var(--series-1)',
        goal: cigGoal,
        actual,
        elapsedDaysThisWeek,
        fallbackDirection: 'lower_is_better',
        formatDiff: formatCount,
      }),
    )
  }

  const outputsGoal = goalForMonth(goals, 'outputs', monthIso)
  if (outputsGoal) {
    const actual = outputs.filter((o) => isoWeekDays.has(o.date)).length
    items.push(
      buildItem({
        key: 'outputs',
        label: 'Uscite',
        swatchColor: 'var(--accent)',
        goal: outputsGoal,
        actual,
        elapsedDaysThisWeek,
        fallbackDirection: 'higher_is_better',
        formatDiff: formatCount,
      }),
    )
  }

  for (const field of FOOD_FIELDS) {
    const goal = goalForMonth(goals, field.goalKey, monthIso)
    if (!goal) continue
    const actual = food.filter((f) => isoWeekDays.has(f.date) && f[field.key] === 'good').length
    items.push(
      buildItem({
        key: field.goalKey,
        label: field.label,
        swatchColor: 'var(--series-2)',
        goal,
        actual,
        elapsedDaysThisWeek,
        fallbackDirection: 'higher_is_better',
        formatDiff: formatCount,
        remainingCapacity: openDaysThisWeek(food, field.key, now),
      }),
    )
  }

  const extraGoal = goalForMonth(goals, 'food_extra', monthIso)
  if (extraGoal) {
    const actual = food.filter((f) => isoWeekDays.has(f.date) && f.extra === 'no').length
    items.push(
      buildItem({
        key: 'food_extra',
        label: 'Extra evitato',
        swatchColor: 'var(--series-2)',
        goal: extraGoal,
        actual,
        elapsedDaysThisWeek,
        fallbackDirection: 'higher_is_better',
        formatDiff: formatCount,
        remainingCapacity: openDaysThisWeek(food, 'extra', now),
      }),
    )
  }

  const behind = items.filter((i) => i.status === 'behind')
  const failed = items.filter((i) => i.status === 'failed')
  const onTrack = items.filter((i) => i.status === 'met')

  return { behind, failed, onTrack }
}
