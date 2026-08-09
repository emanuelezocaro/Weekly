import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  closeStaleOpenEntries,
  deleteEntry,
  makeEntryId,
  mergeAdjacentSameActivity,
  resolveAllOverlaps,
  resolveOverlaps,
  splitEntriesAtMidnight,
  updateEntry,
} from '../utils/entries'
import { APP_START_DATE, parseISODateTime } from '../utils/date'

// v2: bumped to reset everyone's local data for the fresh start on 1 luglio.
const ACTIVITIES_KEY = 'weekly:v2:activitiesMeta'
const ENTRIES_KEY = 'weekly:v2:entriesMeta'
const OUTPUTS_KEY = 'weekly:v2:outputsMeta'
const OUTPUTS_SKIPPED_KEY = 'weekly:v2:outputsSkippedMeta'
const CIGARETTES_KEY = 'weekly:v2:cigarettesMeta'
const FOOD_KEY = 'weekly:v2:foodMeta'
const DIARY_KEY = 'weekly:v2:diaryMeta'
const GOALS_KEY = 'weekly:v2:goalsMeta'

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
    .map(({ id, name, colorSlot }) => ({ id, name, colorSlot }))
}

export function useHabitData() {
  const [activitiesMeta, setActivitiesMeta] = useState(() =>
    loadJSON(ACTIVITIES_KEY, DEFAULT_ACTIVITIES),
  )
  const [entriesMeta, setEntriesMeta] = useState(() =>
    closeStaleOpenEntries(splitEntriesAtMidnight(loadJSON(ENTRIES_KEY, []))),
  )
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
  const entries = useMemo(
    () => entriesMeta.filter((e) => !e.deleted && parseISODateTime(e.start) >= APP_START_DATE),
    [entriesMeta],
  )
  const outputs = useMemo(() => outputsMeta.filter((o) => !o.deleted), [outputsMeta])
  const outputsSkipped = useMemo(
    () => outputsSkippedMeta.filter((o) => !o.deleted),
    [outputsSkippedMeta],
  )
  const cigarettes = useMemo(() => cigarettesMeta.filter((c) => !c.deleted), [cigarettesMeta])
  const food = useMemo(() => foodMeta.filter((f) => !f.deleted), [foodMeta])
  const diary = useMemo(() => diaryMeta.filter((d) => !d.deleted), [diaryMeta])
  const goals = useMemo(() => goalsMeta.filter((g) => !g.deleted), [goalsMeta])

  // --- Entries (continuous time blocks) ---

  const editEntry = useCallback((id, patch) => {
    setEntriesMeta((prev) =>
      splitEntriesAtMidnight(mergeAdjacentSameActivity(resolveOverlaps(updateEntry(prev, id, patch), id), id)),
    )
  }, [])

  const removeEntry = useCallback((id) => {
    setEntriesMeta((prev) => deleteEntry(prev, id))
  }, [])

  // Add a self-contained block (start and end both given), for backfilling a
  // past day without disturbing whatever is currently open today. Trims any
  // existing block it overlaps so the timeline stays gap-free and non-overlapping.
  const addManualEntry = useCallback((activityId, startISO, endISO) => {
    setEntriesMeta((prev) => {
      const id = makeEntryId()
      const withNew = [
        ...prev,
        { id, activityId, start: startISO, end: endISO, updatedAt: Date.now(), deleted: false },
      ]
      return splitEntriesAtMidnight(mergeAdjacentSameActivity(resolveOverlaps(withNew, id), id))
    })
  }, [])

  // --- Activities ---

  const addActivity = useCallback((name, colorSlot = 0) => {
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

  const deleteActivity = useCallback((id) => {
    setActivitiesMeta((prev) =>
      prev.map((a) => (a.id === id ? { ...a, deleted: true, updatedAt: Date.now() } : a)),
    )
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
        version: 3,
        exportedAt: new Date().toISOString(),
        activities: activitiesMeta,
        entries: entriesMeta,
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
    setEntriesMeta(closeStaleOpenEntries(splitEntriesAtMidnight(resolveAllOverlaps(parsed.entries))))
    setOutputsMeta(Array.isArray(parsed.outputs) ? parsed.outputs : [])
    setOutputsSkippedMeta(Array.isArray(parsed.outputsSkipped) ? parsed.outputsSkipped : [])
    setCigarettesMeta(Array.isArray(parsed.cigarettes) ? parsed.cigarettes : [])
    setFoodMeta(Array.isArray(parsed.food) ? parsed.food : [])
    setDiaryMeta(Array.isArray(parsed.diary) ? parsed.diary : [])
    setGoalsMeta(Array.isArray(parsed.goals) ? parsed.goals : [])
  }, [])

  return {
    activities,
    entries,
    editEntry,
    removeEntry,
    addManualEntry,
    addActivity,
    renameActivity,
    deleteActivity,
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
