import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { syncNow } from '../utils/sync'
import { closeStaleOpenEntries, deleteEntry, makeEntryId, startEntry, updateEntry } from '../utils/entries'
import { nowISODateTime } from '../utils/date'

const ACTIVITIES_KEY = 'weekly:activitiesMeta'
const ENTRIES_KEY = 'weekly:entriesMeta'
const SETTINGS_KEY = 'weekly:settings'

const DEFAULT_ACTIVITIES = [
  { id: 'leggere', name: 'Leggere' },
  { id: 'sport', name: 'Sport' },
  { id: 'lavoro', name: 'Lavoro' },
  { id: 'sonno', name: 'Sonno' },
].map((a, i) => ({ ...a, colorSlot: i, order: i, updatedAt: 0, deleted: false }))

const DEFAULT_SETTINGS = {
  sheetUrl: '',
  token: '',
  notifEnabled: false,
  notifTime: '20:00',
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

  const activities = useMemo(() => toPlainActivities(activitiesMeta), [activitiesMeta])
  const entries = useMemo(() => entriesMeta.filter((e) => !e.deleted), [entriesMeta])

  const stateRef = useRef({ activitiesMeta, entriesMeta })
  stateRef.current = { activitiesMeta, entriesMeta }

  const runSync = useCallback(async () => {
    const { sheetUrl, token } = settings
    if (!sheetUrl) return
    setSyncStatus((s) => ({ ...s, state: 'syncing', error: null }))
    try {
      const merged = await syncNow(sheetUrl, token, {
        activities: stateRef.current.activitiesMeta,
        entries: stateRef.current.entriesMeta,
      })
      setActivitiesMeta(merged.activities)
      setEntriesMeta(merged.entries)
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

  const startActivity = useCallback(
    (activityId, atISO = nowISODateTime()) => {
      setEntriesMeta((prev) => startEntry(prev, activityId, atISO))
      scheduleSync()
    },
    [scheduleSync],
  )

  const editEntry = useCallback(
    (id, patch) => {
      setEntriesMeta((prev) => updateEntry(prev, id, patch))
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
  // past day without disturbing whatever is currently open today.
  const addManualEntry = useCallback(
    (activityId, startISO, endISO) => {
      setEntriesMeta((prev) => [
        ...prev,
        { id: makeEntryId(), activityId, start: startISO, end: endISO, updatedAt: Date.now(), deleted: false },
      ])
      scheduleSync()
    },
    [scheduleSync],
  )

  // --- Activities ---

  const addActivity = useCallback(
    (name) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setActivitiesMeta((prev) => {
        const maxOrder = prev.reduce((m, a) => Math.max(m, a.order), -1)
        return [
          ...prev,
          {
            id: makeActivityId(),
            name: trimmed,
            colorSlot: prev.length,
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
    (id, name) => {
      setActivitiesMeta((prev) =>
        prev.map((a) => (a.id === id ? { ...a, name: name.trim() || a.name, updatedAt: Date.now() } : a)),
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

  const reorderActivities = useCallback(
    (fromIndex, toIndex) => {
      setActivitiesMeta((prev) => {
        const visible = prev.filter((a) => !a.deleted).sort((a, b) => a.order - b.order)
        if (toIndex < 0 || toIndex >= visible.length) return prev
        const reordered = [...visible]
        const [moved] = reordered.splice(fromIndex, 1)
        reordered.splice(toIndex, 0, moved)
        const now = Date.now()
        const orderById = new Map(reordered.map((a, i) => [a.id, i]))
        return prev.map((a) =>
          orderById.has(a.id) ? { ...a, order: orderById.get(a.id), updatedAt: now } : a,
        )
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
      },
      null,
      2,
    )
  }, [activitiesMeta, entriesMeta])

  const importData = useCallback((json) => {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed.activities) || !Array.isArray(parsed.entries)) {
      throw new Error('File di backup non valido')
    }
    setActivitiesMeta(parsed.activities)
    setEntriesMeta(closeStaleOpenEntries(parsed.entries))
  }, [])

  return {
    activities,
    entries,
    startActivity,
    editEntry,
    removeEntry,
    addManualEntry,
    addActivity,
    renameActivity,
    deleteActivity,
    reorderActivities,
    exportData,
    importData,
    settings,
    setSettings,
    syncStatus,
    syncNow: runSync,
  }
}
