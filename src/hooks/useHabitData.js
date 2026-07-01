import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { syncNow } from '../utils/sync'

const ACTIVITIES_KEY = 'weekly:activitiesMeta'
const LOGS_KEY = 'weekly:logsMeta'
const SETTINGS_KEY = 'weekly:settings'

const DEFAULT_ACTIVITIES = [
  { id: 'leggere', name: 'Leggere', emoji: '📖' },
  { id: 'sport', name: 'Sport', emoji: '🏃' },
  { id: 'inglese', name: 'Inglese', emoji: '🇬🇧' },
  { id: 'linkedin', name: 'LinkedIn', emoji: '💼' },
].map((a, i) => ({ ...a, order: i, updatedAt: 0, deleted: false }))

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

function makeId() {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

function toPlainActivities(meta) {
  return meta
    .filter((a) => !a.deleted)
    .sort((a, b) => a.order - b.order)
    .map(({ id, name, emoji }) => ({ id, name, emoji }))
}

function toPlainLogs(meta) {
  const plain = {}
  for (const [iso, day] of Object.entries(meta)) {
    const plainDay = {}
    for (const [activityId, entry] of Object.entries(day)) {
      if (entry?.done) plainDay[activityId] = true
    }
    plain[iso] = plainDay
  }
  return plain
}

const AUTO_SYNC_INTERVAL_MS = 3 * 60 * 1000
const DEBOUNCE_SYNC_MS = 2500

export function useHabitData() {
  const [activitiesMeta, setActivitiesMeta] = useState(() =>
    loadJSON(ACTIVITIES_KEY, DEFAULT_ACTIVITIES),
  )
  const [logsMeta, setLogsMeta] = useState(() => loadJSON(LOGS_KEY, {}))
  const [settings, setSettingsState] = useState(() => loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS))
  const [syncStatus, setSyncStatus] = useState({ state: 'idle', lastSyncedAt: null, error: null })

  useEffect(() => {
    localStorage.setItem(ACTIVITIES_KEY, JSON.stringify(activitiesMeta))
  }, [activitiesMeta])

  useEffect(() => {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logsMeta))
  }, [logsMeta])

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
  }, [settings])

  const activities = useMemo(() => toPlainActivities(activitiesMeta), [activitiesMeta])
  const logs = useMemo(() => toPlainLogs(logsMeta), [logsMeta])

  const stateRef = useRef({ activitiesMeta, logsMeta })
  stateRef.current = { activitiesMeta, logsMeta }

  const runSync = useCallback(async () => {
    const { sheetUrl, token } = settings
    if (!sheetUrl) return
    setSyncStatus((s) => ({ ...s, state: 'syncing', error: null }))
    try {
      const merged = await syncNow(sheetUrl, token, {
        activities: stateRef.current.activitiesMeta,
        logs: stateRef.current.logsMeta,
      })
      setActivitiesMeta(merged.activities)
      setLogsMeta(merged.logs)
      setSyncStatus({ state: 'synced', lastSyncedAt: Date.now(), error: null })
    } catch (err) {
      setSyncStatus((s) => ({ ...s, state: 'error', error: err.message || 'Sync fallita' }))
    }
  }, [settings])

  const runSyncRef = useRef(runSync)
  runSyncRef.current = runSync

  // Initial sync + periodic sync while the sheet is configured.
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

  // Debounced sync after local changes.
  const debounceTimer = useRef(null)
  const scheduleSync = useCallback(() => {
    if (!settings.sheetUrl) return
    clearTimeout(debounceTimer.current)
    debounceTimer.current = setTimeout(() => runSyncRef.current(), DEBOUNCE_SYNC_MS)
  }, [settings.sheetUrl])

  const toggleEntry = useCallback(
    (iso, activityId) => {
      setLogsMeta((prev) => {
        const day = prev[iso] || {}
        const wasDone = !!day[activityId]?.done
        const nextDay = { ...day, [activityId]: { done: !wasDone, updatedAt: Date.now() } }
        return { ...prev, [iso]: nextDay }
      })
      scheduleSync()
    },
    [scheduleSync],
  )

  const addActivity = useCallback(
    (name, emoji) => {
      const trimmed = name.trim()
      if (!trimmed) return
      setActivitiesMeta((prev) => {
        const maxOrder = prev.reduce((m, a) => Math.max(m, a.order), -1)
        return [
          ...prev,
          {
            id: makeId(),
            name: trimmed,
            emoji: emoji || '✅',
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
    (id, name, emoji) => {
      setActivitiesMeta((prev) =>
        prev.map((a) =>
          a.id === id
            ? { ...a, name: name.trim() || a.name, emoji: emoji || a.emoji, updatedAt: Date.now() }
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

  const reorderActivities = useCallback(
    (fromIndex, toIndex) => {
      setActivitiesMeta((prev) => {
        const visible = prev
          .filter((a) => !a.deleted)
          .sort((a, b) => a.order - b.order)
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
        version: 2,
        exportedAt: new Date().toISOString(),
        activities: activitiesMeta,
        logs: logsMeta,
      },
      null,
      2,
    )
  }, [activitiesMeta, logsMeta])

  const importData = useCallback((json) => {
    const parsed = JSON.parse(json)
    if (!Array.isArray(parsed.activities) || typeof parsed.logs !== 'object' || parsed.logs === null) {
      throw new Error('File di backup non valido')
    }
    if (parsed.version === 2) {
      setActivitiesMeta(parsed.activities)
      setLogsMeta(parsed.logs)
    } else {
      // v1 backup: plain {id,name,emoji} activities and boolean logs.
      const now = Date.now()
      setActivitiesMeta(
        parsed.activities.map((a, i) => ({ ...a, order: i, updatedAt: now, deleted: false })),
      )
      const migratedLogs = {}
      for (const [iso, day] of Object.entries(parsed.logs)) {
        const migratedDay = {}
        for (const [activityId, done] of Object.entries(day)) {
          migratedDay[activityId] = { done: !!done, updatedAt: now }
        }
        migratedLogs[iso] = migratedDay
      }
      setLogsMeta(migratedLogs)
    }
  }, [])

  return {
    activities,
    logs,
    toggleEntry,
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
