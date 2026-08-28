// Goals are versioned month by month: setting a new value only creates a
// record effective from that month onward, so past months keep whatever was
// in effect at the time. Looking one up means finding the most recent
// non-deleted record at or before the month being viewed.
export function goalForMonth(goals, itemKey, monthIso) {
  let best = null
  for (const g of goals) {
    if (g.itemKey !== itemKey || g.month > monthIso) continue
    if (!best || g.month > best.month) best = g
  }
  return best
}

// Duration goals are stored in minutes internally (for precision) but edited
// and displayed as plain hours (e.g. 7.5 instead of 7h 30m).
export function minutesToHours(minutes) {
  return Number((minutes / 60).toFixed(2))
}

export function hoursToMinutes(hours) {
  return Math.round((Number(hours) || 0) * 60)
}

// Whether exceeding the goal is good or bad depends on the item: more hours
// of "Lavoro" is good, more hours of "Social" is bad; fewer sigarette is
// good. `fallback` is used only when the goal record itself doesn't carry an
// explicit direction (goals set before this field existed, or items where
// direction isn't user-editable, like Alimentazione).
export function goalDirection(goal, fallback = 'higher_is_better') {
  if (goal?.direction === 'lower_is_better' || goal?.direction === 'higher_is_better') return goal.direction
  return fallback
}

export function isGoalMet(goal, actualValue, target, fallback = 'higher_is_better') {
  return goalDirection(goal, fallback) === 'lower_is_better' ? actualValue <= target : actualValue >= target
}

// A goal set to "none" is tracked (value/period still recorded) but not
// judged -- it should stay out of the Dashboard and lose the goal line /
// trend indicator in the Report, as if no goal existed for evaluation.
export function isGoalTracked(goal) {
  return goal?.direction !== 'none'
}

// Scales a goal (expressed per day or per week) to a target for an arbitrary
// number of days, so a card showing e.g. a whole month can compare its total
// against a same-shape target instead of only per-bar amounts.
export function goalTargetForDays(goal, daysCount) {
  if (!goal) return null
  const perDay = goal.period === 'day' ? goal.value : goal.value / 7
  return perDay * daysCount
}

// Average calendar-month length, for scaling a goal to a "typical month"
// bar -- a real month is 28-31 days, but one dashed line at a constant
// height reads far better than 12 slightly different ones, and the error
// that introduces (at most ~3 days) is not worth that cost.
const DAYS_PER_MONTH_AVG = 365 / 12

// Converts a goal (expressed in its own period) into a reference value for a
// chart whose bars represent `barGranularity` ('day' | 'week' | 'month'), so
// the same goal can be drawn as a line regardless of whether the chart shows
// daily, weekly, or (an average) monthly bars.
export function goalPerBar(goal, barGranularity) {
  if (!goal) return null
  if (goal.period === barGranularity) return goal.value
  if (goal.period === 'day' && barGranularity === 'week') return goal.value * 7
  if (goal.period === 'week' && barGranularity === 'day') return goal.value / 7
  if (goal.period === 'day' && barGranularity === 'month') return goal.value * DAYS_PER_MONTH_AVG
  if (goal.period === 'week' && barGranularity === 'month') return (goal.value / 7) * DAYS_PER_MONTH_AVG
  return goal.value
}
