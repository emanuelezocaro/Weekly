import { useCallback, useEffect, useMemo, useState } from 'react'
import { closeStaleOpenEntries, resolveAllOverlaps, splitEntriesAtMidnight } from '../utils/entries'
import { parseISODateTime } from '../utils/date'

// v2: bumped to reset everyone's local data for the fresh start on 1 luglio.
const ACTIVITIES_KEY = 'weekly:v2:activitiesMeta'
const ENTRIES_KEY = 'weekly:v2:entriesMeta'
const DURATIONS_KEY = 'weekly:v2:durationsMeta'
const CHECKLIST_KEY = 'weekly:v2:checklistMeta'
const OUTPUTS_KEY = 'weekly:v2:outputsMeta'
const OUTPUTS_SKIPPED_KEY = 'weekly:v2:outputsSkippedMeta'
const CIGARETTES_KEY = 'weekly:v2:cigarettesMeta'
const FOOD_KEY = 'weekly:v2:foodMeta'
const DIARY_KEY = 'weekly:v2:diaryMeta'
const GOALS_KEY = 'weekly:v2:goalsMeta'
// One-time migration marker: once every activity's old time-blocks have been
// folded into durationsMeta, this stops re-running on every load (which
// would otherwise re-add the same totals again each time).
const MIGRATED_FLAG_KEY = 'weekly:v2:migratedToDurations'

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

function makeDiaryId() {
  return `dy_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeGoalId() {
  return `g_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function toPlainActivities(meta) {
  return meta
    .filter((a) => !a.deleted)
    .sort((a, b) => a.order - b.order)
    .map(({ id, name, colorSlot, mode }) => ({ id, name, colorSlot, mode: mode === 'checklist' ? 'checklist' : 'time' }))
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
  const [diaryMeta, setDiaryMeta] = useState(() => loadJSON(DIARY_KEY, []))
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
    localStorage.setItem(DIARY_KEY, JSON.stringify(diaryMeta))
  }, [diaryMeta])

  useEffect(() => {
    localStorage.setItem(GOALS_KEY, JSON.stringify(goalsMeta))
  }, [goalsMeta])

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
  const diary = useMemo(() => diaryMeta.filter((d) => !d.deleted), [diaryMeta])
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
          mode: mode === 'checklist' ? 'checklist' : 'time',
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
  // history in the new dot report doesn't start from a blank slate. Going
  // the other way (checklist -> orario) has no such conversion -- there's no
  // duration to recover from a plain yes/no, so those days just stay at 0.
  const setActivityMode = useCallback(
    (id, mode) => {
      const nextMode = mode === 'checklist' ? 'checklist' : 'time'
      setActivitiesMeta((prev) =>
        prev.map((a) => (a.id === id ? { ...a, mode: nextMode, updatedAt: Date.now() } : a)),
      )
      if (nextMode !== 'checklist') return

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

  // --- Diary (one freeform note per day, editable in place) ---

  const setDiaryEntry = useCallback((date, text) => {
    setDiaryMeta((prev) => {
      const idx = prev.findIndex((d) => !d.deleted && d.date === date)
      if (idx === -1) {
        return [...prev, { id: makeDiaryId(), date, text, updatedAt: Date.now(), deleted: false }]
      }
      const next = [...prev]
      next[idx] = { ...next[idx], text, updatedAt: Date.now() }
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
        diary: diaryMeta,
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
    diaryMeta,
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
    setDiaryMeta(Array.isArray(parsed.diary) ? parsed.diary : [])
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
    diary,
    setDiaryEntry,
    goals,
    setGoal,
    exportData,
    importData,
  }
}
