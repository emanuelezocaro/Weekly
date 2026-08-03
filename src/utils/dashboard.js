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

// `remainingCapacity` (precomputed by the caller, day-by-day data this
// function doesn't have) caps how much a "higher is better" goal can still
// close before the week ends -- past that, it's not "behind" anymore, it's
// already lost. For "lower is better" goals there's no such ceiling check:
// once the week's cumulative total already exceeds the full weekly quota,
// nothing left in the week can undo that, so it's an immediate "failed"
// regardless of days remaining (you can't un-smoke a cigarette).
function buildItem({
  key,
  label,
  swatchColor,
  goal,
  actual,
  elapsedDaysThisWeek,
  fallbackDirection,
  formatDiff,
  round = Math.ceil,
  remainingCapacity,
  alwaysFullWeekTarget = false,
}) {
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

  const roundedActual = round(actual)
  let displayTarget, diffStatLabel, diffValue

  if (direction === 'lower_is_better') {
    // "Meno è meglio" (es. sigarette): il numero che conta è sempre il tetto
    // dell'intera settimana, non il ritmo del giorno -- "quante me ne restano
    // prima di sforare" è più diretto di una frazione giornaliera. Resta lo
    // stesso in ogni tab, e passa da "margine" a "sforato" esattamente
    // quando lo superi (lo stesso istante in cui lo status diventa 'failed').
    displayTarget = round(fullWeekQuota)
    const margin = displayTarget - roundedActual
    if (margin >= 0) {
      diffStatLabel = 'Margine'
      diffValue = margin
    } else {
      diffStatLabel = 'Sforo'
      diffValue = -margin
    }
  } else {
    // "Più è meglio": il riferimento resta il ritmo del giorno finché c'è
    // ancora tempo per recuperare, il traguardo pieno della settimana una
    // volta fallito (il ritmo non significa più nulla a quel punto) --
    // oppure sempre il traguardo pieno se il chiamante lo richiede (es. il
    // Cibo, dove il ritmo dei primi giorni collassa sempre su valori piccoli
    // e poco informativi, indipendentemente dall'obiettivo reale).
    const referenceTarget = alwaysFullWeekTarget || status === 'failed' ? fullWeekQuota : target
    displayTarget = round(referenceTarget)
    const diff = roundedActual - displayTarget
    if (status === 'failed') {
      diffStatLabel = 'Mancavano'
      diffValue = -diff
    } else if (diff >= 0) {
      diffStatLabel = 'Vantaggio'
      diffValue = diff
    } else {
      diffStatLabel = 'Manca'
      diffValue = -diff
    }
  }

  const progressBase = direction === 'lower_is_better' || alwaysFullWeekTarget ? fullWeekQuota : target

  return {
    key,
    label,
    swatchColor,
    status,
    targetLabel: formatDiff(displayTarget),
    actualLabel: formatDiff(roundedActual),
    diffStatLabel,
    diffLabel: formatDiff(diffValue),
    progressPct: progressBase > 0 ? Math.min(100, Math.max(0, (actual / progressBase) * 100)) : 100,
  }
}

const formatCount = (n) => String(Math.ceil(n))
const formatHours = (minutes) => formatDuration(minutes * 60000)
const roundMinutes = (n) => Math.round(n)

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
        round: roundMinutes,
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
        alwaysFullWeekTarget: true,
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
        alwaysFullWeekTarget: true,
      }),
    )
  }

  const behind = items.filter((i) => i.status === 'behind')
  const failed = items.filter((i) => i.status === 'failed')
  const onTrack = items.filter((i) => i.status === 'met')

  return { behind, failed, onTrack }
}
