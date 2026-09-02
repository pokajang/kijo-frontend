import { useEffect, useRef } from 'react'

export const scrollToTemplateField = (field) => {
  if (!field || typeof document === 'undefined') return

  window.setTimeout(() => {
    const escapedField = String(field).replace(/"/g, '\\"')
    const target = document.querySelector(`[data-template-field="${escapedField}"]`)
    if (!target) return

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const focusable = target.matches('input, textarea, select, button')
      ? target
      : target.querySelector('input, textarea, select, button, [tabindex]')
    focusable?.focus?.({ preventScroll: true })
  }, 0)
}

export const useTemplateDirtyState = (value, onDirtyChange, enabled = true) => {
  const serializedValue = JSON.stringify(value)
  const baselineRef = useRef(null)
  if (!enabled) {
    baselineRef.current = null
  } else if (baselineRef.current === null) {
    baselineRef.current = serializedValue
  }
  const isDirty = enabled && serializedValue !== baselineRef.current

  useEffect(() => {
    onDirtyChange?.(isDirty)
    return () => onDirtyChange?.(false)
  }, [isDirty, onDirtyChange])

  return isDirty
}
