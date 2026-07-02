// Merge logic + wire format for syncing against a Google Apps Script Web App
// that stores a single JSON blob in a Google Sheet cell. Each activity and
// each time entry carries its own `updatedAt` timestamp so two devices that
// were offline can be merged with simple last-write-wins.

export function mergeActivities(localList, remoteList) {
  const byId = new Map()
  for (const a of remoteList) byId.set(a.id, a)
  for (const a of localList) {
    const r = byId.get(a.id)
    if (!r || a.updatedAt >= r.updatedAt) byId.set(a.id, a)
  }
  return Array.from(byId.values())
}

export function mergeEntries(localList, remoteList) {
  const byId = new Map()
  for (const e of remoteList) byId.set(e.id, e)
  for (const e of localList) {
    const r = byId.get(e.id)
    if (!r || e.updatedAt >= r.updatedAt) byId.set(e.id, e)
  }
  return Array.from(byId.values())
}

export function mergeState(localState, remoteState) {
  return {
    activities: mergeActivities(localState.activities, remoteState?.activities || []),
    entries: mergeEntries(localState.entries, remoteState?.entries || []),
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
  return { activities: json.activities || [], entries: json.entries || [] }
}

export async function pushRemoteState(url, token, state) {
  // text/plain avoids a CORS preflight against Apps Script, which only
  // handles simple requests reliably.
  await request(url, token, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ token, activities: state.activities, entries: state.entries }),
  })
}

export async function syncNow(url, token, localState) {
  const remote = await fetchRemoteState(url, token)
  const merged = mergeState(localState, remote)
  await pushRemoteState(url, token, merged)
  return merged
}
