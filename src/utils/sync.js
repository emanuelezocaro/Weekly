// Merge logic + wire format for syncing against a Google Apps Script Web App
// that stores a single JSON blob in a Google Sheet cell. Each activity and
// each day/activity log entry carries its own `updatedAt` timestamp so two
// devices that were offline can be merged with simple last-write-wins.

export function mergeActivities(localList, remoteList) {
  const byId = new Map()
  for (const a of remoteList) byId.set(a.id, a)
  for (const a of localList) {
    const r = byId.get(a.id)
    if (!r || a.updatedAt >= r.updatedAt) byId.set(a.id, a)
  }
  return Array.from(byId.values())
}

export function mergeLogs(localLogs, remoteLogs) {
  const isoSet = new Set([...Object.keys(localLogs), ...Object.keys(remoteLogs)])
  const merged = {}
  for (const iso of isoSet) {
    const l = localLogs[iso] || {}
    const r = remoteLogs[iso] || {}
    const activityIds = new Set([...Object.keys(l), ...Object.keys(r)])
    const day = {}
    for (const id of activityIds) {
      const le = l[id]
      const re = r[id]
      if (!re) day[id] = le
      else if (!le) day[id] = re
      else day[id] = le.updatedAt >= re.updatedAt ? le : re
    }
    merged[iso] = day
  }
  return merged
}

export function mergeState(localState, remoteState) {
  return {
    activities: mergeActivities(localState.activities, remoteState?.activities || []),
    logs: mergeLogs(localState.logs, remoteState?.logs || {}),
  }
}

async function request(url, token, options) {
  const res = await fetch(url, options)
  if (!res.ok) throw new Error(`Richiesta fallita (${res.status})`)
  const json = await res.json()
  if (json?.error) throw new Error(json.error)
  return json
}

export async function fetchRemoteState(url, token) {
  const u = new URL(url)
  u.searchParams.set('token', token)
  const json = await request(u.toString(), token, { method: 'GET' })
  return { activities: json.activities || [], logs: json.logs || {} }
}

export async function pushRemoteState(url, token, state) {
  // text/plain avoids a CORS preflight against Apps Script, which only
  // handles simple requests reliably.
  await request(url, token, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, activities: state.activities, logs: state.logs }),
  })
}

export async function syncNow(url, token, localState) {
  const remote = await fetchRemoteState(url, token)
  const merged = mergeState(localState, remote)
  await pushRemoteState(url, token, merged)
  return merged
}
