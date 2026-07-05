import { endOfDay, parseISODateTime, startOfDay, toISODateTime } from './date'

export const DAY_MS = 24 * 60 * 60 * 1000

export function makeEntryId() {
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function updateEntry(entries, id, patch) {
  const now = Date.now()
  return entries.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: now } : e))
}

export function deleteEntry(entries, id) {
  const now = Date.now()
  return entries.map((e) => (e.id === id ? { ...e, deleted: true, updatedAt: now } : e))
}

// After a manual time edit (or a manually added block) can end up overlapping
// a neighbor, this trims that neighbor's boundary back to where the changed
// block now begins/ends — or removes it if fully covered — so the timeline
// never ends up with two blocks claiming the same minute.
export function resolveOverlaps(entries, changedId, now = new Date()) {
  const changed = entries.find((e) => e.id === changedId)
  if (!changed || changed.deleted) return entries
  const newStart = parseISODateTime(changed.start)
  const newEnd = changed.end ? parseISODateTime(changed.end) : now
  const nowMs = Date.now()

  return entries.map((e) => {
    if (e.id === changedId || e.deleted) return e
    const eStart = parseISODateTime(e.start)
    const eEnd = e.end ? parseISODateTime(e.end) : now
    if (!(eStart < newEnd && eEnd > newStart)) return e

    if (eStart < newStart) {
      // e started earlier and now bleeds into the changed block: pull its end back.
      return { ...e, end: changed.start, updatedAt: nowMs }
    }
    // e starts at/after the changed block and spills past its end: push its start forward.
    const trimmedStart = changed.end ?? toISODateTime(newEnd)
    return e.end !== null && parseISODateTime(trimmedStart) >= eEnd
      ? { ...e, deleted: true, updatedAt: nowMs }
      : { ...e, start: trimmedStart, updatedAt: nowMs }
  })
}

function effectiveEnd(entry, now) {
  return entry.end ? parseISODateTime(entry.end) : now
}

// Overlap in ms between an entry's [start, effectiveEnd) and [rangeStart, rangeEnd).
export function msInRange(entry, rangeStart, rangeEnd, now) {
  const start = parseISODateTime(entry.start)
  const end = effectiveEnd(entry, now)
  const overlapStart = start < rangeStart ? rangeStart : start
  const overlapEnd = end > rangeEnd ? rangeEnd : end
  const ms = overlapEnd - overlapStart
  return ms > 0 ? ms : 0
}

// Entries (or entry fragments) that touch a single day, clipped to that
// day's [00:00, 24:00) boundary and sorted chronologically.
export function entriesForDay(entries, dayDate, now = new Date()) {
  const dayStart = startOfDay(dayDate)
  const dayEnd = endOfDay(dayDate)
  return entries
    .filter((e) => !e.deleted)
    .map((e) => {
      const start = parseISODateTime(e.start)
      const end = effectiveEnd(e, now)
      const clippedStart = start < dayStart ? dayStart : start
      const clippedEnd = end > dayEnd ? dayEnd : end
      return { entry: e, clippedStart, clippedEnd, isOpen: e.end === null }
    })
    .filter(({ clippedStart, clippedEnd }) => clippedEnd > clippedStart)
    .sort((a, b) => a.clippedStart - b.clippedStart)
}

// Merging entries from two devices can leave more than one entry "open"
// (end === null) if each device started a different activity while offline.
// Only the most recently started one should stay open; earlier ones are
// chained closed at the moment the later one began.
export function closeStaleOpenEntries(entries) {
  const open = entries.filter((e) => !e.deleted && e.end === null)
  if (open.length <= 1) return entries
  const latest = open.reduce((a, b) => (parseISODateTime(b.start) > parseISODateTime(a.start) ? b : a))
  const now = Date.now()
  return entries.map((e) =>
    open.includes(e) && e.id !== latest.id ? { ...e, end: latest.start, updatedAt: now } : e,
  )
}

// Total ms spent per activity within [rangeStart, rangeEnd).
export function aggregateDuration(entries, rangeStart, rangeEnd, now = new Date()) {
  const totals = new Map()
  const clampedEnd = rangeEnd > now ? now : rangeEnd
  if (clampedEnd <= rangeStart) return totals
  for (const entry of entries) {
    if (entry.deleted) continue
    const ms = msInRange(entry, rangeStart, clampedEnd, now)
    if (ms > 0) totals.set(entry.activityId, (totals.get(entry.activityId) || 0) + ms)
  }
  return totals
}

// Interprets a period as "what does an average 24h day look like": for each
// activity, the total is expressed as ms/day (total divided by how many days
// have actually elapsed so far), plus what fraction of a full day that is.
// Always sorted with the biggest time-eaters first.
export function activityStats(activities, entries, rangeStart, rangeEnd, now = new Date()) {
  const totals = aggregateDuration(entries, rangeStart, rangeEnd, now)
  const elapsedMs = Math.max(0, Math.min(rangeEnd, now) - rangeStart)
  // "Daily average" divides by the number of calendar days that have
  // started so far (each one counts as a full day even while still in
  // progress) -- e.g. 9h yesterday + 8h so far today averages to 8.5h/day,
  // not an hour-weighted extrapolation of today's still-open total.
  const elapsedDays = Math.max(1, Math.ceil(elapsedMs / DAY_MS))

  const stats = activities
    .map((a) => {
      const totalMs = totals.get(a.id) || 0
      const avgMsPerDay = totalMs / elapsedDays
      return { ...a, totalMs, avgMsPerDay, pctOfDay: avgMsPerDay / DAY_MS }
    })
    .sort((a, b) => b.totalMs - a.totalMs)

  const trackedMs = stats.reduce((sum, s) => sum + s.totalMs, 0)
  const untrackedMs = Math.max(0, elapsedMs - trackedMs)
  const avgUntrackedMsPerDay = untrackedMs / elapsedDays

  return { stats, elapsedDays, trackedMs, untrackedMs, avgUntrackedMsPerDay }
}

const MIN_GAP_MS = 60 * 1000

// Unlogged stretches within a day: before the first block, between blocks,
// and after the last block up to now (or midnight, for a past day).
export function findGapsForDay(entries, dayDate, now = new Date()) {
  const dayStart = startOfDay(dayDate)
  const dayEnd = endOfDay(dayDate)
  const upperBound = now < dayEnd ? now : dayEnd
  const items = entriesForDay(entries, dayDate, now)
  const gaps = []
  let cursor = dayStart
  for (const { clippedStart, clippedEnd } of items) {
    if (clippedStart - cursor >= MIN_GAP_MS) gaps.push({ start: cursor, end: clippedStart })
    if (clippedEnd > cursor) cursor = clippedEnd
  }
  if (upperBound - cursor >= MIN_GAP_MS) gaps.push({ start: cursor, end: upperBound })
  return gaps
}

// Per-day ms spent on a single activity, for a day-by-day trend/drill-down
// chart. `days` is an array of Date, one entry per day to report on.
export function dailyTotalsForActivity(entries, activityId, days, now = new Date()) {
  const relevant = entries.filter((e) => !e.deleted && e.activityId === activityId)
  return days.map((day) => {
    const dayStart = startOfDay(day)
    const dayEnd = endOfDay(day)
    let ms = 0
    for (const entry of relevant) {
      ms += msInRange(entry, dayStart, dayEnd, now)
    }
    return { date: day, ms }
  })
}
