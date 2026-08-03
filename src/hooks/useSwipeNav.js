import { useRef } from 'react'

// A horizontal swipe must clearly outrun any vertical movement (dominant
// axis) and cover a minimum distance, so normal vertical scrolling and taps
// never get mistaken for a swipe.
const SWIPE_THRESHOLD_PX = 60

// Attaches touch handlers (spread onto a container) that call onPrev/onNext
// on a left/right swipe -- swipe left moves forward (next), swipe right
// moves back (previous), matching how calendar/photo apps read in LTR.
export function useSwipeNav({ onPrev, onNext, prevDisabled, nextDisabled }) {
  const start = useRef(null)

  function onTouchStart(e) {
    const t = e.touches[0]
    start.current = { x: t.clientX, y: t.clientY }
  }

  function onTouchEnd(e) {
    const origin = start.current
    start.current = null
    if (!origin) return
    const t = e.changedTouches[0]
    const dx = t.clientX - origin.x
    const dy = t.clientY - origin.y
    if (Math.abs(dx) < SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return
    if (dx < 0 && !nextDisabled) onNext()
    if (dx > 0 && !prevDisabled) onPrev()
  }

  return { onTouchStart, onTouchEnd }
}
