import { DAY_MS } from './entries'

// One ring segment per logged block, positioned at its real time of day
// (fraction of the 24h circle from midnight) rather than stacked in order --
// so ten separate "Work" blocks at different hours show as ten separate
// wedges on the clock face.
export function buildClockSegments(items, activities, dayStart) {
  return items.map((it) => {
    const activity = activities.find((a) => a.id === it.entry.activityId)
    return {
      id: it.entry.id,
      name: activity ? activity.name : 'Attività eliminata',
      colorSlot: activity ? activity.colorSlot : null,
      startFrac: (it.clippedStart.getTime() - dayStart.getTime()) / DAY_MS,
      endFrac: (it.clippedEnd.getTime() - dayStart.getTime()) / DAY_MS,
      start: it.clippedStart,
      end: it.clippedEnd,
      durationMs: it.clippedEnd.getTime() - it.clippedStart.getTime(),
      isOpen: it.isOpen,
    }
  })
}

// One row per activity actually logged that day (deduplicated -- ten "Work"
// blocks fold into a single "Work" row), sorted by time spent, with
// whatever wasn't logged always last regardless of its own share.
export function buildDayBreakdown(items, activities, accountedMs) {
  const totalsById = new Map()
  for (const it of items) {
    const id = it.entry.activityId
    const ms = it.clippedEnd.getTime() - it.clippedStart.getTime()
    totalsById.set(id, (totalsById.get(id) || 0) + ms)
  }

  const withTotals = activities.map((a) => ({
    id: a.id,
    name: a.name,
    colorSlot: a.colorSlot,
    totalMs: totalsById.get(a.id) || 0,
  }))

  const rows = withTotals.filter((r) => r.totalMs > 0).sort((a, b) => b.totalMs - a.totalMs)
  const zeroActivities = withTotals.filter((r) => r.totalMs === 0)

  const trackedMs = rows.reduce((sum, r) => sum + r.totalMs, 0)
  const notDoneMs = Math.max(0, accountedMs - trackedMs)

  return { rows, notDoneMs, zeroActivities }
}
