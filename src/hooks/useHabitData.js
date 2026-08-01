import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { syncNow } from '../utils/sync'
import { closeStaleOpenEntries, deleteEntry, makeEntryId, resolveOverlaps, updateEntry } from '../utils/entries'
import { APP_START_DATE, parseISODateTime } from '../utils/date'

// v2: bumped to reset everyone's local data for the fresh start on 1 luglio.
const ACTIVITIES_KEY = 'weekly:v2:activitiesMeta'
const ENTRIES_KEY = 'weekly:v2:entriesMeta'
const SETTINGS_KEY = 'weekly:v2:settings'
const OUTPUTS_KEY = 'weekly:v2:outputsMeta'

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

  const activities = useMemo(() => toPlainActivities(activitiesMeta), [activitiesMeta])
  const entries = useMemo(
    () => entriesMeta.filter((e) => !e.deleted && parseISODateTime(e.start) >= APP_START_DATE),
    [entriesMeta],
  )
  const outputs = useMemo(() => outputsMeta.filter((o) => !o.deleted), [outputsMeta])

  const stateRef = useRef({ activitiesMeta, entriesMeta, outputsMeta })
  stateRef.current = { activitiesMeta, entriesMeta, outputsMeta }

  const runSync = useCallback(async () => {
    const { sheetUrl, token } = settings
    if (!sheetUrl) return
    setSyncStatus((s) => ({ ...s, state: 'syncing', error: null }))
    try {
      const merged = await syncNow(sheetUrl, token, {
        activities: stateRef.current.activitiesMeta,
        entries: stateRef.current.entriesMeta,
        outputs: stateRef.current.outputsMeta,
      })
      setActivitiesMeta(merged.activities)
      setEntriesMeta(merged.entries)
      setOutputsMeta(merged.outputs)
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
      },
      null,
      2,
    )
  }, [activitiesMeta, entriesMeta, outputsMeta])

  const importData = useCallback((json) => {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed.activities) || !Array.isArray(parsed.entries)) {
      throw new Error('File di backup non valido')
    }
    setActivitiesMeta(parsed.activities)
    setEntriesMeta(closeStaleOpenEntries(parsed.entries))
    setOutputsMeta(Array.isArray(parsed.outputs) ? parsed.outputs : [])
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
    exportData,
    importData,
    settings,
    setSettings,
    syncStatus,
    syncNow: runSync,
  }
}
