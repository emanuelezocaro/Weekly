// Rating-mode activities (Sleep, Put off, Work) are logged the same way
// Food is: a single Bad/Medium/Good tap per day, no numbers. The thresholds
// below exist to (a) label each button with what it means -- no separate
// legend line, the hint sits inside the button itself -- and (b) migrate old
// hour logs into this scale (see the reconciliation effect in
// useHabitData.js).
export const RATING_COLOR = { bad: 'var(--series-6)', mid: 'var(--series-3)', good: 'var(--series-2)' }

// Each activity's zones list its thresholds in ascending-minutes order;
// `upTo` is that zone's inclusive upper bound (Infinity for the last one).
// `hint` is the short text shown inside that zone's button and used to
// build the Report's legend line.
const THRESHOLDS = {
  Sleep: [
    { value: 'bad', upTo: 360, hint: 'up to 6h' },
    { value: 'mid', upTo: 420, hint: '6h-7h' },
    { value: 'good', upTo: Infinity, hint: 'over 7h' },
  ],
  'Put off': [
    { value: 'good', upTo: 30, hint: 'up to 30min' },
    { value: 'mid', upTo: 60, hint: '30min-1h' },
    { value: 'bad', upTo: Infinity, hint: 'over 1h' },
  ],
  Work: [
    { value: 'bad', upTo: 59, hint: 'under 1h' },
    { value: 'mid', upTo: 240, hint: '1h-4h' },
    { value: 'good', upTo: Infinity, hint: 'over 4h' },
  ],
}

export const RATING_OPTIONS = [
  { value: 'bad', label: 'Bad', cls: 'sel-bad' },
  { value: 'mid', label: 'Medium', cls: 'sel-mid' },
  { value: 'good', label: 'Good', cls: 'sel-good' },
]

// Only activities in THRESHOLDS have known boundaries -- any other one
// switched to rating mode has no way to derive a rating from old minutes
// (nor a hint to show on its buttons), so its history just starts blank.
export function ratingForMinutes(activityName, minutes) {
  const zones = THRESHOLDS[activityName]
  if (!zones) return null
  for (const zone of zones) {
    if (minutes <= zone.upTo) return zone.value
  }
  return zones[zones.length - 1].value
}

export function thresholdHint(activityName, value) {
  return THRESHOLDS[activityName]?.find((z) => z.value === value)?.hint ?? null
}

export function legendText(activityName) {
  const zones = THRESHOLDS[activityName]
  if (!zones) return null
  const byValue = Object.fromEntries(zones.map((z) => [z.value, z.hint]))
  return `Bad: ${byValue.bad} · Medium: ${byValue.mid} · Good: ${byValue.good}`
}
