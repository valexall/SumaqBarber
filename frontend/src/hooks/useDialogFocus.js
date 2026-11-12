import { useEffect } from 'react'

const focusableSelector = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])', 'select:not([disabled])',
  'textarea:not([disabled])', '[tabindex]:not([tabindex="-1"])',
].join(',')

export function useDialogFocus(dialogRef, active = true) {
  useEffect(() => {
    if (!active || !dialogRef.current) return
    const dialog = dialogRef.current
    const previous = document.activeElement
    const focusable = () => Array.from(dialog.querySelectorAll(focusableSelector))
    ;(focusable()[0] || dialog).focus()

    const onKeyDown = (event) => {
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (!elements.length) {
        event.preventDefault()
        dialog.focus()
        return
      }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    dialog.addEventListener('keydown', onKeyDown)
    return () => {
      dialog.removeEventListener('keydown', onKeyDown)
      if (previous instanceof HTMLElement) previous.focus()
    }
  }, [active, dialogRef])
}
