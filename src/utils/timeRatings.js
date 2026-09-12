// Rating-mode activities (Sleep, Put off, Work, Cigarettes) are logged the
// same way Food is: a single Bad/Medium/Good tap per day, no numbers. The
// thresholds below exist to (a) label each button with what it means -- no
// separate legend line, the hint sits inside the button itself -- and (b)
// migrate old logs (hours for Sleep/Put off/Work, a daily count for
// Cigarettes) into this scale (see the reconciliation effect in
// useHabitData.js). The matching logic doesn't care what unit `upTo` is in
// -- minutes for the time-tracked ones, a plain count for Cigarettes -- it's
// just "which zone does this raw number fall into" either way.
// Each activity's zones list its thresholds in ascending order; `upTo` is
// that zone's inclusive upper bound (Infinity for the last one). `hint` is
// the short text shown inside that zone's button and used to build the
// Report's legend line.
const THRESHOLDS = {
  Sleep: [
    { value: 'bad', upTo: 359, hint: '- 6 h' },
    { value: 'mid', upTo: 420, hint: '6-7 h' },
    { value: 'good', upTo: Infinity, hint: '+ 7 h' },
  ],
  'Put off': [
    { value: 'good', upTo: 30, hint: '- 30 min' },
    { value: 'mid', upTo: 60, hint: '30-60 min' },
    { value: 'bad', upTo: Infinity, hint: '+ 1 h' },
  ],
  Work: [
    { value: 'bad', upTo: 59, hint: '- 1 h' },
    { value: 'mid', upTo: 240, hint: '1-4 h' },
    { value: 'good', upTo: Infinity, hint: '+ 4 h' },
  ],
  Cigarettes: [
    { value: 'good', upTo: 4, hint: '- 5' },
    { value: 'mid', upTo: 15, hint: '5-15' },
    { value: 'bad', upTo: Infinity, hint: '+ 15' },
  ],
}

export const RATING_OPTIONS = [
  { value: 'bad', label: 'Bad', cls: 'sel-bad' },
  { value: 'mid', label: 'Medium', cls: 'sel-mid' },
  { value: 'good', label: 'Good', cls: 'sel-good' },
]

// Only activities in THRESHOLDS have known boundaries -- any other one
// switched to rating mode has no way to derive a rating from its old logs
// (nor a hint to show on its buttons), so its history just starts blank.
export function ratingForValue(activityName, value) {
  const zones = THRESHOLDS[activityName]
  if (!zones) return null
  for (const zone of zones) {
    if (value <= zone.upTo) return zone.value
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
