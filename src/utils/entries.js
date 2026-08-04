import { endOfDay, parseISODateTime, startOfDay, toISODate, toISODateTime } from './date'

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

// Defensive sweep for imported data: unlike resolveOverlaps (which only
// trims the neighbors of a single just-edited entry), this walks every
// entry in chronological order and trims any that bleed into the next one.
// A backup file can contain overlapping entries from outside the app's own
// edit path -- a hand-built reconstruction, a merge of two exports, a bug
// in whatever produced it -- and without this sweep, overlapping entries
// silently double-count their shared minutes in every total.
export function resolveAllOverlaps(entries, now = new Date()) {
  const nowMs = Date.now()
  const sorted = entries
    .filter((e) => !e.deleted)
    .map((e) => ({ ...e }))
    .sort((a, b) => parseISODateTime(a.start) - parseISODateTime(b.start))

  for (let i = 0; i < sorted.length - 1; i++) {
    const cur = sorted[i]
    const next = sorted[i + 1]
    const curEnd = cur.end ? parseISODateTime(cur.end) : now
    const nextStart = parseISODateTime(next.start)
    if (curEnd > nextStart) {
      cur.end = next.start
      cur.updatedAt = nowMs
    }
  }

  const byId = new Map(sorted.map((e) => [e.id, e]))
  return entries.map((e) => byId.get(e.id) ?? e)
}

// If the just-changed entry now sits exactly back-to-back with another entry
// of the SAME activity (its end matches a neighbor's start, or vice versa),
// fold them into a single entry instead of leaving two that just happen to
// touch -- so "Free 00:00-02:05" followed by adding "Free" starting exactly
// at 02:05 reads (and counts) as one continuous block, not two. Only exact
// touches merge; a real gap between them is left alone since that's
// genuinely untracked time, not a rounding artifact.
export function mergeAdjacentSameActivity(entries, changedId, now = new Date()) {
  let list = entries
  let current = list.find((e) => e.id === changedId)
  if (!current || current.deleted) return list

  function findTouchingNeighbor(entry) {
    const start = parseISODateTime(entry.start)
    const end = entry.end !== null ? parseISODateTime(entry.end) : null
    return list.find((e) => {
      if (e.id === entry.id || e.deleted || e.activityId !== entry.activityId) return false
      const eStart = parseISODateTime(e.start)
      const eEnd = e.end !== null ? parseISODateTime(e.end) : null
      return (end !== null && eStart.getTime() === end.getTime()) || (eEnd !== null && eEnd.getTime() === start.getTime())
    })
  }

  let neighbor = findTouchingNeighbor(current)
  while (neighbor) {
    const currentStart = parseISODateTime(current.start)
    const currentEnd = current.end !== null ? parseISODateTime(current.end) : now
    const neighborStart = parseISODateTime(neighbor.start)
    const neighborEnd = neighbor.end !== null ? parseISODateTime(neighbor.end) : now

    const mergedStart = currentStart <= neighborStart ? current.start : neighbor.start
    const mergedEnd =
      current.end === null || neighbor.end === null ? null : currentEnd >= neighborEnd ? current.end : neighbor.end
    const nowMs = Date.now()
    const merged = { ...current, start: mergedStart, end: mergedEnd, updatedAt: nowMs }

    list = list.map((e) => {
      if (e.id === current.id) return merged
      if (e.id === neighbor.id) return { ...e, deleted: true, updatedAt: nowMs }
      return e
    })

    current = merged
    neighbor = findTouchingNeighbor(current)
  }

  return list
}

// A day just closes: no entry is allowed to span two calendar days. Any
// entry whose start and (effective) end fall on different days is split into
// consecutive single-day fragments at each midnight it crosses, each clipped
// to that day's [00:00, 24:00) boundary. The open (end === null) state, if
// any, only ever survives on the final fragment. Called on load, import, and
// every create/edit so this invariant holds regardless of entry point --
// including an entry that was open and simply rolled past midnight since it
// was last touched.
export function splitEntriesAtMidnight(entries, now = new Date()) {
  let changed = false
  const result = []
  for (const e of entries) {
    if (e.deleted) {
      result.push(e)
      continue
    }
    const start = parseISODateTime(e.start)
    const end = e.end ? parseISODateTime(e.end) : null
    const lastMoment = end ?? now
    if (toISODate(start) === toISODate(lastMoment)) {
      result.push(e)
      continue
    }

    changed = true
    let cursor = start
    let isFirst = true
    for (;;) {
      const dayEnd = endOfDay(cursor)
      const isLastFragment = dayEnd >= lastMoment
      const fragmentEnd = isLastFragment ? end : dayEnd
      result.push({
        ...e,
        id: isFirst ? e.id : makeEntryId(),
        start: toISODateTime(cursor),
        end: fragmentEnd ? toISODateTime(fragmentEnd) : null,
      })
      if (isLastFragment) break
      cursor = dayEnd
      isFirst = false
    }
  }
  return changed ? result : entries
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
