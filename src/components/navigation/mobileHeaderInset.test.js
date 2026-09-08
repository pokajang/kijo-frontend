import { afterEach, describe, expect, it } from 'vitest'
import { clearMobileHeaderInset, syncMobileHeaderInset } from './mobileHeaderInset'

const HEADER_HEIGHT_VARIABLE = '--app-mobile-fixed-header-height'
const BOTTOM_INSET_VARIABLE = '--app-mobile-fixed-bottom-inset'

describe('mobileHeaderInset', () => {
  afterEach(() => {
    clearMobileHeaderInset()
  })

  it('shares the measured fixed-header height with every mobile inset consumer', () => {
    const header = {
      getBoundingClientRect: () => ({ height: 111.2 }),
    }

    expect(syncMobileHeaderInset(header)).toBe(112)
    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VARIABLE)).toBe('112px')
    expect(document.documentElement.style.getPropertyValue(BOTTOM_INSET_VARIABLE)).toBe('112px')
  })

  it('updates both values after the prompt changes size and removes them on cleanup', () => {
    let height = 64
    const header = {
      getBoundingClientRect: () => ({ height }),
    }

    syncMobileHeaderInset(header)
    height = 108
    syncMobileHeaderInset(header)

    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VARIABLE)).toBe('108px')
    expect(document.documentElement.style.getPropertyValue(BOTTOM_INSET_VARIABLE)).toBe('108px')

    clearMobileHeaderInset()

    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VARIABLE)).toBe('')
    expect(document.documentElement.style.getPropertyValue(BOTTOM_INSET_VARIABLE)).toBe('')
  })

  it('leaves the current inset intact when the header cannot be measured', () => {
    document.documentElement.style.setProperty(HEADER_HEIGHT_VARIABLE, '64px')
    document.documentElement.style.setProperty(BOTTOM_INSET_VARIABLE, '64px')

    expect(syncMobileHeaderInset(null)).toBe(0)

    expect(document.documentElement.style.getPropertyValue(HEADER_HEIGHT_VARIABLE)).toBe('64px')
    expect(document.documentElement.style.getPropertyValue(BOTTOM_INSET_VARIABLE)).toBe('64px')
  })
})
