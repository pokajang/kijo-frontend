import { describe, expect, it } from 'vitest'

import { initialMobileNavSheetState, mobileNavSheetReducer } from './mobileNavSheetReducer'
import { MOBILE_NAV_ROOTS, MOBILE_NAV_VIEWS } from './mobileNavSheetViews'

describe('mobileNavSheetReducer', () => {
  it('opens a root and replaces the view stack when switching bottom-nav sections', () => {
    const toolsState = mobileNavSheetReducer(initialMobileNavSheetState, {
      type: 'OPEN_ROOT',
      section: MOBILE_NAV_ROOTS.tools,
      returnFocusId: 'tools',
    })
    const searchState = mobileNavSheetReducer(toolsState, {
      type: 'PUSH_VIEW',
      view: { id: MOBILE_NAV_VIEWS.moduleSearch },
    })
    const accountState = mobileNavSheetReducer(searchState, {
      type: 'OPEN_ROOT',
      section: MOBILE_NAV_ROOTS.account,
      returnFocusId: 'account',
    })

    expect(accountState).toMatchObject({
      isOpen: true,
      rootSection: MOBILE_NAV_ROOTS.account,
      returnFocusId: 'account',
      viewStack: [{ id: MOBILE_NAV_VIEWS.account }],
    })
  })

  it('supports nested views, back navigation, and route reset', () => {
    const open = mobileNavSheetReducer(initialMobileNavSheetState, {
      type: 'OPEN_ROOT',
      section: MOBILE_NAV_ROOTS.tools,
    })
    const nested = mobileNavSheetReducer(open, {
      type: 'PUSH_VIEW',
      view: { id: MOBILE_NAV_VIEWS.knowledge },
    })
    const back = mobileNavSheetReducer(nested, { type: 'POP_VIEW' })

    expect(back.viewStack).toEqual([{ id: MOBILE_NAV_VIEWS.tools }])
    expect(mobileNavSheetReducer(back, { type: 'RESET_AFTER_ROUTE' })).toEqual(
      initialMobileNavSheetState,
    )
  })
})
