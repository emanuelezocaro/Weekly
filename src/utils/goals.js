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

// Converts a goal (expressed in its own period) into a reference value for a
// chart whose bars represent `barGranularity` ('day' | 'week'), so the same
// goal can be drawn as a line regardless of whether the chart shows daily or
// weekly bars.
export function goalPerBar(goal, barGranularity) {
  if (!goal) return null
  if (goal.period === barGranularity) return goal.value
  if (goal.period === 'day' && barGranularity === 'week') return goal.value * 7
  if (goal.period === 'week' && barGranularity === 'day') return goal.value / 7
  return goal.value
}
