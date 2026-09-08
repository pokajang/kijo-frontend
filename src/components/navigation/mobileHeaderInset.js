const MOBILE_HEADER_HEIGHT_VARIABLE = '--app-mobile-fixed-header-height'
const MOBILE_BOTTOM_INSET_VARIABLE = '--app-mobile-fixed-bottom-inset'

export const syncMobileHeaderInset = (header, root = document.documentElement) => {
  if (!header || !root) return 0

  const height = Math.ceil(header.getBoundingClientRect().height)
  if (height <= 0) return 0

  const value = `${height}px`
  root.style.setProperty(MOBILE_HEADER_HEIGHT_VARIABLE, value)
  root.style.setProperty(MOBILE_BOTTOM_INSET_VARIABLE, value)

  return height
}

export const clearMobileHeaderInset = (root = document.documentElement) => {
  if (!root) return

  root.style.removeProperty(MOBILE_HEADER_HEIGHT_VARIABLE)
  root.style.removeProperty(MOBILE_BOTTOM_INSET_VARIABLE)
}
