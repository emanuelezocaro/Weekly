import { useEffect } from 'react'

// Closes a form/popover when a pointer press lands outside the given
// element -- tapping anywhere else on the screen dismisses it, not just
// tapping the trigger again.
export function useClickOutside(ref, onOutside, enabled = true) {
  useEffect(() => {
    if (!enabled) return
    function handlePointerDown(event) {
      if (ref.current && !ref.current.contains(event.target)) onOutside()
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [ref, onOutside, enabled])
}
