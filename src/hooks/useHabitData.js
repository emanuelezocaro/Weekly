import { useCallback, useEffect, useMemo, useState } from 'react'
import { closeStaleOpenEntries, resolveAllOverlaps, splitEntriesAtMidnight } from '../utils/entries'
import { addDays, parseISODate, parseISODateTime, toISODate } from '../utils/date'
import { ratingForMinutes } from '../utils/timeRatings'

// v2: bumped to reset everyone's local data for the fresh start on 1 luglio.
const ACTIVITIES_KEY = 'weekly:v2:activitiesMeta'
const ENTRIES_KEY = 'weekly:v2:entriesMeta'
const DURATIONS_KEY = 'weekly:v2:durationsMeta'
const CHECKLIST_KEY = 'weekly:v2:checklistMeta'
const OUTPUTS_KEY = 'weekly:v2:outputsMeta'
const OUTPUTS_SKIPPED_KEY = 'weekly:v2:outputsSkippedMeta'
const CIGARETTES_KEY = 'weekly:v2:cigarettesMeta'
const FOOD_KEY = 'weekly:v2:foodMeta'
const RATINGS_KEY = 'weekly:v2:ratingsMeta'
const GOALS_KEY = 'weekly:v2:goalsMeta'
// One-time migration marker: once every activity's old time-blocks have been
// folded into durationsMeta, this stops re-running on every load (which
// would otherwise re-add the same totals again each time).
const MIGRATED_FLAG_KEY = 'weekly:v2:migratedToDurations'
// One-time backfill marker: Diario used to be its own free-text feature
// (removed) before becoming a plain checklist activity the user adds by
// hand -- every day from 4 August (when journaling actually started) through
// yesterday was in fact written, so the very first time a checklist activity
// named "Diario" exists, those days are backfilled as done instead of
// starting that history blank. Guarded the same way as MIGRATED_FLAG_KEY so
// it only ever runs once.
const DIARIO_BACKFILL_FLAG_KEY = 'weekly:v2:diarioBackfilled'
const DIARIO_BACKFILL_START = '2026-08-04'

const DEFAULT_ACTIVITIES = []

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function makeActivityId() {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeDurationId() {
  return `du_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeChecklistId() {
  return `ck_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeOutputId() {
  return `o_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeOutputsSkippedId() {
  return `os_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeCigaretteId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeFoodId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeGoalId() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeRatingId() {
  return `rt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function normalizeMode(mode) {
  if (mode === 'checklist' || mode === 'rating') return mode
  return 'time'
}

function toPlainActivities(meta) {
  return meta
    .filter((a) => !a.deleted)
    .sort((a, b) => a.order - b.order)
    .map(({ id, name, colorSlot, mode }) => ({ id, name, colorSlot, mode: normalizeMode(mode) }))
}

// Sums an entry's start/end (or start/now, if still open) into whole minutes
// -- entries are already single-day by the time this runs (see
// splitEntriesAtMidnight), so the date is just the start's own date.
function minutesForEntry(entry, now) {
  const start = parseISODateTime(entry.start)
  const end = entry.end ? parseISODateTime(entry.end) : now
  return Math.max(0, Math.round((end - start) / 60000))
}

// Folds old time-block entries into "total minutes per (activity, day)" --
// the shape every activity's data lives in now, orario or checklist alike.
// Only what matters (how long, that day) survives; the exact clock time
// doesn't, which is exactly the point of this whole switch.
function migrateEntriesToDurations(entries, now) {
  const totals = new Map()
  for (const e of entries) {
    if (e.deleted) continue
    const date = e.start.slice(0, 10)
    const key = `${e.activityId}|${date}`
    totals.set(key, (totals.get(key) || 0) + minutesForEntry(e, now))
  }
  const nowMs = Date.now()
  const result = []
  for (const [key, minutes] of totals) {
    if (minutes <= 0) continue
    const [activityId, date] = key.split('|')
    result.push({ id: makeDurationId(), activityId, date, minutes, updatedAt: nowMs, deleted: false })
  }
  return result
}

function loadEntries() {
  return closeStaleOpenEntries(splitEntriesAtMidnight(loadJSON(ENTRIES_KEY, [])))
}

// Runs the entries -> durations fold exactly once, ever, per device: guarded
// by MIGRATED_FLAG_KEY so re-loading the app doesn't keep re-adding the same
// totals on top of themselves.
function loadDurationsWithMigration(entries) {
  const existing = loadJSON(DURATIONS_KEY, [])
  if (localStorage.getItem(MIGRATED_FLAG_KEY)) return existing
  const migrated = migrateEntriesToDurations(entries, new Date())
  localStorage.setItem(MIGRATED_FLAG_KEY, '1')
  return [...existing, ...migrated]
}

export function useHabitData() {
  const [activitiesMeta, setActivitiesMeta] = useState(() =>
    loadJSON(ACTIVITIES_KEY, DEFAULT_ACTIVITIES),
  )
  // Kept only as a passive historical record now (still exported in
  // backups) -- nothing edits time-blocks anymore, see durationsMeta below.
  const [entriesMeta, setEntriesMeta] = useState(() => loadEntries())
  const [durationsMeta, setDurationsMeta] = useState(() => loadDurationsWithMigration(entriesMeta))
  const [checklistMeta, setChecklistMeta] = useState(() => loadJSON(CHECKLIST_KEY, []))
  const [outputsMeta, setOutputsMeta] = useState(() => loadJSON(OUTPUTS_KEY, []))
  const [outputsSkippedMeta, setOutputsSkippedMeta] = useState(() => loadJSON(OUTPUTS_SKIPPED_KEY, []))
  const [cigarettesMeta, setCigarettesMeta] = useState(() => loadJSON(CIGARETTES_KEY, []))
  const [foodMeta, setFoodMeta] = useState(() => loadJSON(FOOD_KEY, []))
  const [ratingsMeta, setRatingsMeta] = useState(() => loadJSON(RATINGS_KEY, []))
  const [goalsMeta, setGoalsMeta] = useState(() => loadJSON(GOALS_KEY, []))

  useEffect(() => {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activitiesMeta))
  }, [activitiesMeta])

  useEffect(() => {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entriesMeta))
  }, [entriesMeta])

  useEffect(() => {
    localStorage.setItem(DURATIONS_KEY, JSON.stringify(durationsMeta))
  }, [durationsMeta])

  useEffect(() => {
    localStorage.setItem(CHECKLIST_KEY, JSON.stringify(checklistMeta))
  }, [checklistMeta])

  useEffect(() => {
    localStorage.setItem(OUTPUTS_KEY, JSON.stringify(outputsMeta))
  }, [outputsMeta])

  useEffect(() => {
    localStorage.setItem(OUTPUTS_SKIPPED_KEY, JSON.stringify(outputsSkippedMeta))
  }, [outputsSkippedMeta])

  useEffect(() => {
    localStorage.setItem(CIGARETTES_KEY, JSON.stringify(cigarettesMeta))
  }, [cigarettesMeta])

  useEffect(() => {
    localStorage.setItem(FOOD_KEY, JSON.stringify(foodMeta))
  }, [foodMeta])

  useEffect(() => {
    localStorage.setItem(RATINGS_KEY, JSON.stringify(ratingsMeta))
  }, [ratingsMeta])

  useEffect(() => {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goalsMeta))
  }, [goalsMeta])

  // One-time: backfill "Diario" checklist days from 4 August through
  // yesterday, the moment such an activity exists -- see
  // DIARIO_BACKFILL_FLAG_KEY above. Runs at most once ever, whenever it
  // first finds the activity (now or after the user creates it later).
  useEffect(() => {
    if (localStorage.getItem(DIARIO_BACKFILL_FLAG_KEY)) return
    const diario = activitiesMeta.find(
      (a) => !a.deleted && a.mode === 'checklist' && ['diario', 'diary'].includes(a.name.trim().toLowerCase()),
    )
    if (!diario) return
    const yesterdayIso = toISODate(addDays(new Date(), -1))
    const already = new Set(checklistMeta.filter((c) => !c.deleted && c.activityId === diario.id).map((c) => c.date))
    const nowMs = Date.now()
    const additions = []
    for (let d = parseISODate(DIARIO_BACKFILL_START); toISODate(d) <= yesterdayIso; d = addDays(d, 1)) {
      const iso = toISODate(d)
      if (!already.has(iso)) {
        additions.push({ id: makeChecklistId(), activityId: diario.id, date: iso, updatedAt: nowMs, deleted: false })
      }
    }
    if (additions.length > 0) setChecklistMeta((prev) => [...prev, ...additions])
    localStorage.setItem(DIARIO_BACKFILL_FLAG_KEY, '1')
  }, [activitiesMeta, checklistMeta])

  // Ongoing (not one-time): for every rating-mode activity, fill in a rating
  // for any day that already has logged minutes but no rating yet -- using
  // that activity's own thresholds (see ratingForMinutes). Runs on every
  // load instead of only at the moment the mode switches, so an activity
  // whose thresholds only become known later (a new one added to
  // ratingForMinutes after it was already switched) still gets backfilled,
  // and it's a no-op once every already-logged day has its rating.
  useEffect(() => {
    const ratingActivities = activitiesMeta.filter((a) => !a.deleted && a.mode === 'rating')
    if (ratingActivities.length === 0) return
    const nowMs = Date.now()
    const additions = []
    for (const activity of ratingActivities) {
      const totalsByDate = new Map()
      for (const d of durationsMeta) {
        if (d.deleted || d.activityId !== activity.id) continue
        totalsByDate.set(d.date, (totalsByDate.get(d.date) || 0) + d.minutes)
      }
      if (totalsByDate.size === 0) continue
      const already = new Set(ratingsMeta.filter((r) => !r.deleted && r.activityId === activity.id).map((r) => r.date))
      for (const [date, minutes] of totalsByDate) {
        if (already.has(date)) continue
        const value = ratingForMinutes(activity.name, minutes)
        if (!value) continue
        additions.push({ id: makeRatingId(), activityId: activity.id, date, value, updatedAt: nowMs, deleted: false })
      }
    }
    if (additions.length > 0) setRatingsMeta((prev) => [...prev, ...additions])
  }, [activitiesMeta, durationsMeta, ratingsMeta])

  const activities = useMemo(() => toPlainActivities(activitiesMeta), [activitiesMeta])
  const durations = useMemo(() => durationsMeta.filter((d) => !d.deleted), [durationsMeta])
  const checklist = useMemo(() => checklistMeta.filter((c) => !c.deleted), [checklistMeta])
  const outputs = useMemo(() => outputsMeta.filter((o) => !o.deleted), [outputsMeta])
  const outputsSkipped = useMemo(
    () => outputsSkippedMeta.filter((o) => !o.deleted),
    [outputsSkippedMeta],
  )
  const cigarettes = useMemo(() => cigarettesMeta.filter((c) => !c.deleted), [cigarettesMeta])
  const food = useMemo(() => foodMeta.filter((f) => !f.deleted), [foodMeta])
  const ratings = useMemo(() => ratingsMeta.filter((r) => !r.deleted), [ratingsMeta])
  const goals = useMemo(() => goalsMeta.filter((g) => !g.deleted), [goalsMeta])

  // --- Activities ---

  const addActivity = useCallback((name, colorSlot = 0, mode = 'time') => {
    const trimmed = name.trim()
    if (!trimmed) return
    setActivitiesMeta((prev) => {
      const maxOrder = prev.reduce((m, a) => Math.max(m, a.order), -1)
      return [
        ...prev,
        {
          id: makeActivityId(),
          name: trimmed,
          colorSlot,
          mode: normalizeMode(mode),
          order: maxOrder + 1,
          updatedAt: Date.now(),
          deleted: false,
        },
      ]
    })
  }, [])

  const renameActivity = useCallback((id, name, colorSlot) => {
    setActivitiesMeta((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              name: name.trim() || a.name,
              colorSlot: colorSlot ?? a.colorSlot,
              updatedAt: Date.now(),
            }
          : a,
      ),
    )
  }, [])

  // Switching an activity to checklist mode retroactively turns every day it
  // already has tracked minutes for into a "done" checklist day, so its
  // history in the new dot report doesn't start from a blank slate. Going to
  // plain "a tempo" has no such conversion -- there's no duration to recover
  // from a yes/no, so those days just stay at 0. Rating mode's own backfill
  // happens separately (see the reconciliation effect below).
  const setActivityMode = useCallback(
    (id, mode) => {
      const nextMode = normalizeMode(mode)
      setActivitiesMeta((prev) =>
        prev.map((a) => (a.id === id ? { ...a, mode: nextMode, updatedAt: Date.now() } : a)),
      )
      if (nextMode === 'checklist') {
        const doneDates = new Set(
          durationsMeta.filter((d) => !d.deleted && d.activityId === id && d.minutes > 0).map((d) => d.date),
        )
        if (doneDates.size === 0) return
        const already = new Set(checklistMeta.filter((c) => !c.deleted && c.activityId === id).map((c) => c.date))
        const nowMs = Date.now()
        const additions = [...doneDates]
          .filter((date) => !already.has(date))
          .map((date) => ({ id: makeChecklistId(), activityId: id, date, updatedAt: nowMs, deleted: false }))
        if (additions.length > 0) setChecklistMeta((prev) => [...prev, ...additions])
      }
      // Rating mode's own backfill isn't done here -- see the reconciliation
      // effect below, which also covers an activity whose thresholds (see
      // ratingForMinutes) only became known after it was already switched.
    },
    [durationsMeta, checklistMeta],
  )

  const deleteActivity = useCallback((id) => {
    setActivitiesMeta((prev) =>
      prev.map((a) => (a.id === id ? { ...a, deleted: true, updatedAt: Date.now() } : a)),
    )
  }, [])

  // --- Durations (orario activities: one or more logged sessions a day) ---

  const addDuration = useCallback((activityId, date, minutes) => {
    if (!minutes || minutes <= 0) return
    setDurationsMeta((prev) => [
      ...prev,
      { id: makeDurationId(), activityId, date, minutes: Math.round(minutes), updatedAt: Date.now(), deleted: false },
    ])
  }, [])

  const removeDuration = useCallback((id) => {
    setDurationsMeta((prev) => prev.map((d) => (d.id === id ? { ...d, deleted: true, updatedAt: Date.now() } : d)))
  }, [])

  // --- Checklist (checklist activities: done/not-done per day) ---

  const toggleChecklist = useCallback((activityId, date) => {
    setChecklistMeta((prev) => {
      const idx = prev.findIndex((c) => !c.deleted && c.activityId === activityId && c.date === date)
      if (idx === -1) {
        return [...prev, { id: makeChecklistId(), activityId, date, updatedAt: Date.now(), deleted: false }]
      }
      const next = [...prev]
      next[idx] = { ...next[idx], deleted: true, updatedAt: Date.now() }
      return next
    })
  }, [])

  // --- Outputs (per-day list of short "cosa e uscito oggi" strings) ---

  const addOutput = useCallback((date, text) => {
    const trimmed = text.trim()
    if (!trimmed) return
    setOutputsMeta((prev) => [
      ...prev,
      { id: makeOutputId(), date, text: trimmed, updatedAt: Date.now(), deleted: false },
    ])
    // A real output beats an earlier "niente da segnalare" for the same day.
    setOutputsSkippedMeta((prev) =>
      prev.map((o) => (!o.deleted && o.date === date ? { ...o, deleted: true, updatedAt: Date.now() } : o)),
    )
  }, [])

  const removeOutput = useCallback((id) => {
    setOutputsMeta((prev) =>
      prev.map((o) => (o.id === id ? { ...o, deleted: true, updatedAt: Date.now() } : o)),
    )
  }, [])

  // --- Outputs skipped (per-day "niente da segnalare oggi" confirmation) ---

  const confirmNoOutputs = useCallback((date) => {
    setOutputsSkippedMeta((prev) => {
      const idx = prev.findIndex((o) => !o.deleted && o.date === date)
      if (idx !== -1) return prev
      return [...prev, { id: makeOutputsSkippedId(), date, updatedAt: Date.now(), deleted: false }]
    })
  }, [])

  const undoNoOutputs = useCallback((date) => {
    setOutputsSkippedMeta((prev) =>
      prev.map((o) => (!o.deleted && o.date === date ? { ...o, deleted: true, updatedAt: Date.now() } : o)),
    )
  }, [])

  // --- Cigarettes (one indicative count per day) ---

  const setCigarettes = useCallback((date, count) => {
    setCigarettesMeta((prev) => {
      const idx = prev.findIndex((c) => !c.deleted && c.date === date)
      if (idx === -1) {
        return [...prev, { id: makeCigaretteId(), date, count, updatedAt: Date.now(), deleted: false }]
      }
      const next = [...prev]
      next[idx] = { ...next[idx], count, updatedAt: Date.now() }
      return next
    })
  }, [])

  // --- Food (per-day Pasti/Alcol/Dolci/Extra ratings) ---

  const setFoodField = useCallback((date, field, value) => {
    setFoodMeta((prev) => {
      const idx = prev.findIndex((f) => !f.deleted && f.date === date)
      if (idx === -1) {
        return [
          ...prev,
          {
            id: makeFoodId(),
            date,
            colazione: null,
            pranzo: null,
            cena: null,
            alcol: null,
            dolci: null,
            extra: null,
            [field]: value,
            updatedAt: Date.now(),
            deleted: false,
          },
        ]
      }
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value, updatedAt: Date.now() }
      return next
    })
  }, [])

  // --- Ratings (rating-mode activities: one Bad/Medium/Good tap per day) ---

  const setRating = useCallback((activityId, date, value) => {
    setRatingsMeta((prev) => {
      const idx = prev.findIndex((r) => !r.deleted && r.activityId === activityId && r.date === date)
      if (idx === -1) {
        return [...prev, { id: makeRatingId(), activityId, date, value, updatedAt: Date.now(), deleted: false }]
      }
      const next = [...prev]
      next[idx] = { ...next[idx], value, updatedAt: Date.now() }
      return next
    })
  }, [])

  // --- Goals (per item, versioned month by month) ---

  const setGoal = useCallback((itemKey, month, period, value, direction) => {
    setGoalsMeta((prev) => {
      const idx = prev.findIndex((g) => !g.deleted && g.itemKey === itemKey && g.month === month)
      if (idx === -1) {
        return [
          ...prev,
          { id: makeGoalId(), itemKey, month, period, value, direction, updatedAt: Date.now(), deleted: false },
        ]
      }
      const next = [...prev]
      next[idx] = { ...next[idx], period, value, direction, updatedAt: Date.now() }
      return next
    })
  }, [])

  const exportData = useCallback(() => {
    return JSON.stringify(
      {
        app: 'weekly-habit-tracker',
        version: 4,
        exportedAt: new Date().toISOString(),
        activities: activitiesMeta,
        entries: entriesMeta,
        durations: durationsMeta,
        checklist: checklistMeta,
        outputs: outputsMeta,
        outputsSkipped: outputsSkippedMeta,
        cigarettes: cigarettesMeta,
        food: foodMeta,
        ratings: ratingsMeta,
        goals: goalsMeta,
      },
      null,
      2,
    )
  }, [
    activitiesMeta,
    entriesMeta,
    durationsMeta,
    checklistMeta,
    outputsMeta,
    outputsSkippedMeta,
    cigarettesMeta,
    foodMeta,
    ratingsMeta,
    goalsMeta,
  ])

  const importData = useCallback((json) => {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed.activities) || !Array.isArray(parsed.entries)) {
      throw new Error('File di backup non valido')
    }
    setActivitiesMeta(parsed.activities)
    const cleanedEntries = closeStaleOpenEntries(splitEntriesAtMidnight(resolveAllOverlaps(parsed.entries)))
    setEntriesMeta(cleanedEntries)
    // Older backups (from before orario/checklist modes existed) have no
    // durations/checklist of their own -- fold their entries the same way
    // the one-time device migration does, instead of importing empty.
    setDurationsMeta(
      Array.isArray(parsed.durations) ? parsed.durations : migrateEntriesToDurations(cleanedEntries, new Date()),
    )
    setChecklistMeta(Array.isArray(parsed.checklist) ? parsed.checklist : [])
    setOutputsMeta(Array.isArray(parsed.outputs) ? parsed.outputs : [])
    setOutputsSkippedMeta(Array.isArray(parsed.outputsSkipped) ? parsed.outputsSkipped : [])
    setCigarettesMeta(Array.isArray(parsed.cigarettes) ? parsed.cigarettes : [])
    setFoodMeta(Array.isArray(parsed.food) ? parsed.food : [])
    setRatingsMeta(Array.isArray(parsed.ratings) ? parsed.ratings : [])
    setGoalsMeta(Array.isArray(parsed.goals) ? parsed.goals : [])
  }, [])

  return {
    activities,
    addActivity,
    renameActivity,
    setActivityMode,
    deleteActivity,
    durations,
    addDuration,
    removeDuration,
    checklist,
    toggleChecklist,
    outputs,
    addOutput,
    removeOutput,
    outputsSkipped,
    confirmNoOutputs,
    undoNoOutputs,
    cigarettes,
    setCigarettes,
    food,
    setFoodField,
    ratings,
    setRating,
    goals,
    setGoal,
    exportData,
    importData,
  }
}
