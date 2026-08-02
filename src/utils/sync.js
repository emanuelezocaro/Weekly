// Merge logic + wire format for syncing against a Google Apps Script Web App
// that stores a single JSON blob in a Google Sheet cell. Each activity and
// each time entry carries its own `updatedAt` timestamp so two devices that
// were offline can be merged with simple last-write-wins.

import { closeStaleOpenEntries } from './entries'

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

export function mergeOutputs(localList, remoteList) {
  const byId = new Map()
  for (const o of remoteList) byId.set(o.id, o)
  for (const o of localList) {
    const r = byId.get(o.id)
    if (!r || o.updatedAt >= r.updatedAt) byId.set(o.id, o)
  }
  return Array.from(byId.values())
}

export function mergeCigarettes(localList, remoteList) {
  const byId = new Map()
  for (const c of remoteList) byId.set(c.id, c)
  for (const c of localList) {
    const r = byId.get(c.id)
    if (!r || c.updatedAt >= r.updatedAt) byId.set(c.id, c)
  }
  return Array.from(byId.values())
}

export function mergeFood(localList, remoteList) {
  const byId = new Map()
  for (const f of remoteList) byId.set(f.id, f)
  for (const f of localList) {
    const r = byId.get(f.id)
    if (!r || f.updatedAt >= r.updatedAt) byId.set(f.id, f)
  }
  return Array.from(byId.values())
}

export function mergeGoals(localList, remoteList) {
  const byId = new Map()
  for (const g of remoteList) byId.set(g.id, g)
  for (const g of localList) {
    const r = byId.get(g.id)
    if (!r || g.updatedAt >= r.updatedAt) byId.set(g.id, g)
  }
  return Array.from(byId.values())
}

export function mergeOutputsSkipped(localList, remoteList) {
  const byId = new Map()
  for (const s of remoteList) byId.set(s.id, s)
  for (const s of localList) {
    const r = byId.get(s.id)
    if (!r || s.updatedAt >= r.updatedAt) byId.set(s.id, s)
  }
  return Array.from(byId.values())
}

export function mergeState(localState, remoteState) {
  return {
    activities: mergeActivities(localState.activities, remoteState?.activities || []),
    entries: closeStaleOpenEntries(mergeEntries(localState.entries, remoteState?.entries || [])),
    outputs: mergeOutputs(localState.outputs, remoteState?.outputs || []),
    outputsSkipped: mergeOutputsSkipped(localState.outputsSkipped, remoteState?.outputsSkipped || []),
    cigarettes: mergeCigarettes(localState.cigarettes, remoteState?.cigarettes || []),
    food: mergeFood(localState.food, remoteState?.food || []),
    goals: mergeGoals(localState.goals, remoteState?.goals || []),
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
  return {
    activities: json.activities || [],
    entries: json.entries || [],
    outputs: json.outputs || [],
    outputsSkipped: json.outputsSkipped || [],
    cigarettes: json.cigarettes || [],
    food: json.food || [],
    goals: json.goals || [],
  }
}

export async function pushRemoteState(url, token, state) {
  // text/plain avoids a CORS preflight against Apps Script, which only
  // handles simple requests reliably.
  await request(url, token, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      token,
      activities: state.activities,
      entries: state.entries,
      outputs: state.outputs,
      outputsSkipped: state.outputsSkipped,
      cigarettes: state.cigarettes,
      food: state.food,
      goals: state.goals,
    }),
  })
}

export async function syncNow(url, token, localState) {
  const remote = await fetchRemoteState(url, token)
  const merged = mergeState(localState, remote)
  await pushRemoteState(url, token, merged)
  return merged
}
