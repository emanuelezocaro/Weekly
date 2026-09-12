// Rating-mode activities (Sleep, Put off) are logged the same way Food is:
// a single Bad/Medium/Good tap per day, no numbers -- the thresholds below
// only exist to (a) explain what each label means in the legend, and (b)
// migrate each activity's old hour logs into this scale once, the moment it
// switches from "a tempo" to this mode (see setActivityMode).
export const RATING_OPTIONS = [
  { value: 'bad', label: 'Bad', cls: 'sel-bad' },
  { value: 'mid', label: 'Medium', cls: 'sel-mid' },
  { value: 'good', label: 'Good', cls: 'sel-good' },
]

export const RATING_COLOR = { bad: 'var(--series-6)', mid: 'var(--series-3)', good: 'var(--series-2)' }

const THRESHOLDS = {
  Sleep: { bad: 'up to 6h', mid: '6h-7h', good: 'over 7h', upToBad: 360, upToMid: 420 },
  'Put off': { bad: 'over 1h', mid: '30min-1h', good: 'up to 30min', upToGood: 30, upToMid: 60 },
}

export function legendText(activityName) {
  const t = THRESHOLDS[activityName]
  return t ? `Bad: ${t.bad} · Medium: ${t.mid} · Good: ${t.good}` : null
}

// Only Sleep and Put off have known thresholds -- any other activity
// switched to this mode has no way to derive a rating from old minutes, so
// its history just starts blank (still fine: nothing to migrate yet).
export function ratingForMinutes(activityName, minutes) {
  if (activityName === 'Sleep') {
    const t = THRESHOLDS.Sleep
    if (minutes <= t.upToBad) return 'bad'
    if (minutes <= t.upToMid) return 'mid'
    return 'good'
  }
  if (activityName === 'Put off') {
    const t = THRESHOLDS['Put off']
    if (minutes <= t.upToGood) return 'good'
    if (minutes <= t.upToMid) return 'mid'
    return 'bad'
  }
  return null
}
