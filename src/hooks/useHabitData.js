import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { syncNow } from '../utils/sync'
import { closeStaleOpenEntries, deleteEntry, makeEntryId, resolveOverlaps, updateEntry } from '../utils/entries'
import { APP_START_DATE, parseISODateTime } from '../utils/date'

// v2: bumped to reset everyone's local data for the fresh start on 1 luglio.
const ACTIVITIES_KEY = 'weekly:v2:activitiesMeta'
const ENTRIES_KEY = 'weekly:v2:entriesMeta'
const SETTINGS_KEY = 'weekly:v2:settings'
const OUTPUTS_KEY = 'weekly:v2:outputsMeta'
const CIGARETTES_KEY = 'weekly:v2:cigarettesMeta'
const FOOD_KEY = 'weekly:v2:foodMeta'

const DEFAULT_ACTIVITIES = []

const DEFAULT_SETTINGS = {
  sheetUrl: '',
  token: '',
}

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

function makeCigaretteId() {
  return `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function makeFoodId() {
  return `f_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function toPlainActivities(meta) {
  return meta
    .filter((a) => !a.deleted)
    .sort((a, b) => a.order - b.order)
    .map(({ id, name, colorSlot }) => ({ id, name, colorSlot }))
}

const AUTO_SYNC_INTERVAL_MS = 3 * 60 * 1000
const DEBOUNCE_SYNC_MS = 2500

export function useHabitData() {
  const [activitiesMeta, setActivitiesMeta] = useState(() =>
    loadJSON(ACTIVITIES_KEY, DEFAULT_ACTIVITIES),
  )
  const [entriesMeta, setEntriesMeta] = useState(() => closeStaleOpenEntries(loadJSON(ENTRIES_KEY, [])))
  const [settings, setSettingsState] = useState(() => loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS))
  const [outputsMeta, setOutputsMeta] = useState(() => loadJSON(OUTPUTS_KEY, []))
  const [cigarettesMeta, setCigarettesMeta] = useState(() => loadJSON(CIGARETTES_KEY, []))
  const [foodMeta, setFoodMeta] = useState(() => loadJSON(FOOD_KEY, []))
  const [syncStatus, setSyncStatus] = useState({ state: 'idle', lastSyncedAt: null, error: null })

  useEffect(() => {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activitiesMeta))
  }, [activitiesMeta])

  useEffect(() => {
    localStorage.setItem(ENTRIES_KEY, JSON.stringify(entriesMeta))
  }, [entriesMeta])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  useEffect(() => {
    localStorage.setItem(OUTPUTS_KEY, JSON.stringify(outputsMeta))
  }, [outputsMeta])

  useEffect(() => {
    localStorage.setItem(CIGARETTES_KEY, JSON.stringify(cigarettesMeta))
  }, [cigarettesMeta])

  useEffect(() => {
    localStorage.setItem(FOOD_KEY, JSON.stringify(foodMeta))
  }, [foodMeta])

  const activities = useMemo(() => toPlainActivities(activitiesMeta), [activitiesMeta])
  const entries = useMemo(
    () => entriesMeta.filter((e) => !e.deleted && parseISODateTime(e.start) >= APP_START_DATE),
    [entriesMeta],
  )
  const outputs = useMemo(() => outputsMeta.filter((o) => !o.deleted), [outputsMeta])
  const cigarettes = useMemo(() => cigarettesMeta.filter((c) => !c.deleted), [cigarettesMeta])
  const food = useMemo(() => foodMeta.filter((f) => !f.deleted), [foodMeta])

  const stateRef = useRef({ activitiesMeta, entriesMeta, outputsMeta, cigarettesMeta, foodMeta })
  stateRef.current = { activitiesMeta, entriesMeta, outputsMeta, cigarettesMeta, foodMeta }

  const runSync = useCallback(async () => {
    const { sheetUrl, token } = settings
    if (!sheetUrl) return
    setSyncStatus((s) => ({ ...s, state: 'syncing', error: null }))
    try {
      const merged = await syncNow(sheetUrl, token, {
        activities: stateRef.current.activitiesMeta,
        entries: stateRef.current.entriesMeta,
        outputs: stateRef.current.outputsMeta,
        cigarettes: stateRef.current.cigarettesMeta,
        food: stateRef.current.foodMeta,
      })
      setActivitiesMeta(merged.activities)
      setEntriesMeta(merged.entries)
      setOutputsMeta(merged.outputs)
      setCigarettesMeta(merged.cigarettes)
      setFoodMeta(merged.food)
      setSyncStatus({ state: 'synced', lastSyncedAt: Date.now(), error: null })
    } catch (err) {
      setSyncStatus((s) => ({ ...s, state: 'error', error: err.message || 'Sync fallita' }))
    }
  }, [settings])

  const runSyncRef = useRef(runSync)
  runSyncRef.current = runSync

  useEffect(() => {
    if (!settings.sheetUrl) return
    runSyncRef.current()
    const interval = setInterval(() => runSyncRef.current(), AUTO_SYNC_INTERVAL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') runSyncRef.current()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [settings.sheetUrl])

  const debounceTimer = useRef(null)
  const scheduleSync = useCallback(() => {
    if (!settings.sheetUrl) return
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => runSyncRef.current(), DEBOUNCE_SYNC_MS)
  }, [settings.sheetUrl])

  // --- Entries (continuous time blocks) ---

  const editEntry = useCallback(
    (id, patch) => {
      setEntriesMeta((prev) => resolveOverlaps(updateEntry(prev, id, patch), id))
      scheduleSync()
    },
    [scheduleSync],
  )

  const removeEntry = useCallback(
    (id) => {
      setEntriesMeta((prev) => deleteEntry(prev, id))
      scheduleSync()
    },
    [scheduleSync],
  )

  // Add a self-contained block (start and end both given), for backfilling a
  // past day without disturbing whatever is currently open today. Trims any
  // existing block it overlaps so the timeline stays gap-free and non-overlapping.
  const addManualEntry = useCallback(
    (activityId, startISO, endISO) => {
      setEntriesMeta((prev) => {
        const id = makeEntryId()
        const withNew = [
          ...prev,
          { id, activityId, start: startISO, end: endISO, updatedAt: Date.now(), deleted: false },
        ]
        return resolveOverlaps(withNew, id)
      })
      scheduleSync()
    },
    [scheduleSync],
  )

  // --- Activities ---

  const addActivity = useCallback(
    (name, colorSlot = 0) => {
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
      scheduleSync()
    },
    [scheduleSync],
  )

  const renameActivity = useCallback(
    (id, name, colorSlot) => {
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
      scheduleSync()
    },
    [scheduleSync],
  )

  const deleteActivity = useCallback(
    (id) => {
      setActivitiesMeta((prev) =>
        prev.map((a) => (a.id === id ? { ...a, deleted: true, updatedAt: Date.now() } : a)),
      )
      scheduleSync()
    },
    [scheduleSync],
  )

  // --- Outputs (per-day list of short "cosa e uscito oggi" strings) ---

  const addOutput = useCallback(
    (date, text) => {
      const trimmed = text.trim()
      if (!trimmed) return
      setOutputsMeta((prev) => [
        ...prev,
        { id: makeOutputId(), date, text: trimmed, updatedAt: Date.now(), deleted: false },
      ])
      scheduleSync()
    },
    [scheduleSync],
  )

  const removeOutput = useCallback(
    (id) => {
      setOutputsMeta((prev) =>
        prev.map((o) => (o.id === id ? { ...o, deleted: true, updatedAt: Date.now() } : o)),
      )
      scheduleSync()
    },
    [scheduleSync],
  )

  // --- Cigarettes (one indicative count per day) ---

  const setCigarettes = useCallback(
    (date, count) => {
      setCigarettesMeta((prev) => {
        const idx = prev.findIndex((c) => !c.deleted && c.date === date)
        if (idx === -1) {
          return [...prev, { id: makeCigaretteId(), date, count, updatedAt: Date.now(), deleted: false }]
        }
        const next = [...prev]
        next[idx] = { ...next[idx], count, updatedAt: Date.now() }
        return next
      })
      scheduleSync()
    },
    [scheduleSync],
  )

  // --- Food (per-day Pasti/Alcol/Dolci/Extra ratings) ---

  const setFoodField = useCallback(
    (date, field, value) => {
      setFoodMeta((prev) => {
        const idx = prev.findIndex((f) => !f.deleted && f.date === date)
        if (idx === -1) {
          return [
            ...prev,
            {
              id: makeFoodId(),
              date,
              pasti: null,
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
      scheduleSync()
    },
    [scheduleSync],
  )

  const setSettings = useCallback((patch) => {
    setSettingsState((prev) => ({ ...prev, ...patch }))
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
        cigarettes: cigarettesMeta,
        food: foodMeta,
      },
      null,
      2,
    )
  }, [activitiesMeta, entriesMeta, outputsMeta, cigarettesMeta, foodMeta])

  const importData = useCallback((json) => {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed.activities) || !Array.isArray(parsed.entries)) {
      throw new Error('File di backup non valido')
    }
    setActivitiesMeta(parsed.activities)
    setEntriesMeta(closeStaleOpenEntries(parsed.entries))
    setOutputsMeta(Array.isArray(parsed.outputs) ? parsed.outputs : [])
    setCigarettesMeta(Array.isArray(parsed.cigarettes) ? parsed.cigarettes : [])
    setFoodMeta(Array.isArray(parsed.food) ? parsed.food : [])
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
    cigarettes,
    setCigarettes,
    food,
    setFoodField,
    exportData,
    importData,
    settings,
    setSettings,
    syncStatus,
    syncNow: runSync,
  }
}
