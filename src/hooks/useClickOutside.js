import { useEffect } from 'react'

// Closes a form/popover when a pointer press lands outside the given
// element -- tapping anywhere else on the screen dismisses it, not just
// tapping the trigger again. `exceptSelector` carves out elements that have
// their own open/close logic (e.g. the trigger itself) so this doesn't
// fight with them.
export function useClickOutside(ref, onOutside, enabled = true, exceptSelector = null) {
  useEffect(() => {
    if (!enabled) return
    function handlePointerDown(event) {
      if (ref.current && ref.current.contains(event.target)) return
      if (exceptSelector && event.target.closest && event.target.closest(exceptSelector)) return
      onOutside()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [ref, onOutside, enabled, exceptSelector])
}
