import { endOfDay, parseISODateTime, toISODate, toISODateTime } from './date'

export function makeEntryId() {
  return `e_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

// Defensive sweep for imported data: walks every entry in chronological
// order and trims any that bleed into the next one. A backup file can
// contain overlapping entries from outside the app's own edit path -- a
// hand-built reconstruction, a merge of two exports, a bug in whatever
// produced it -- and without this sweep, overlapping entries would silently
// double-count their shared minutes once folded into per-day durations.
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

// A day just closes: no entry is allowed to span two calendar days. Any
// entry whose start and (effective) end fall on different days is split into
// consecutive single-day fragments at each midnight it crosses, each clipped
// to that day's [00:00, 24:00) boundary. The open (end === null) state, if
// any, only ever survives on the final fragment. Called on load and import
// so this invariant holds before entries get folded into per-day durations.
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
