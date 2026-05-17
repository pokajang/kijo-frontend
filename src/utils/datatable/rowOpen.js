export const DEFAULT_ROW_OPEN_IGNORE_SELECTOR =
  'a, button, input, select, textarea, [role="button"], [data-no-row-open="true"], .dropdown-menu, .dropdown-toggle'

export const shouldIgnoreRowOpen = (event, ignoreSelector = DEFAULT_ROW_OPEN_IGNORE_SELECTOR) => {
  const target = event?.target
  if (!(target instanceof Element)) return false

  const interactiveTarget = target.closest(ignoreSelector)
  return Boolean(interactiveTarget && interactiveTarget !== event.currentTarget)
}

export const createRowOpenHandlers = (
  row,
  onOpen,
  { disabled = false, ignoreSelector = DEFAULT_ROW_OPEN_IGNORE_SELECTOR } = {},
) => {
  if (typeof onOpen !== 'function' || disabled) return {}

  return {
    role: 'button',
    tabIndex: 0,
    onClick: (event) => {
      if (shouldIgnoreRowOpen(event, ignoreSelector)) return
      onOpen(row)
    },
    onKeyDown: (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      if (shouldIgnoreRowOpen(event, ignoreSelector)) return
      event.preventDefault()
      onOpen(row)
    },
  }
}
