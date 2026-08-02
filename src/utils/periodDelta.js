import { isFuture } from './date'

// Trims the previous period's days to the same number of elapsed days as
// the current period, so an in-progress week isn't compared against a
// previous week's full 7 days -- clipping only the previous side is enough,
// since the current period's not-yet-elapsed days never contribute data.
export function clipPrevDays(days, prevDays) {
  const elapsedCount = days.filter((d) => !isFuture(d)).length
  return prevDays.slice(0, elapsedCount)
}

export function deltaPct(current, prev) {
  if (!prev) return null
  return Math.round(((current - prev) / prev) * 100)
}
