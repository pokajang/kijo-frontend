import React, { createContext, useCallback, useContext, useMemo, useReducer, useRef } from 'react'
import PropTypes from 'prop-types'

import { initialMobileNavSheetState, mobileNavSheetReducer } from './mobileNavSheetReducer'

const noop = () => {}
const fallbackContext = {
  ...initialMobileNavSheetState,
  activeRoot: null,
  currentView: null,
  canGoBack: false,
  openRoot: noop,
  pushView: noop,
  replaceView: noop,
  goBack: noop,
  closeSheet: noop,
  resetAfterRoute: noop,
}

const MobileNavSheetContext = createContext(fallbackContext)

export const MobileNavSheetProvider = ({ children }) => {
  const [state, dispatch] = useReducer(mobileNavSheetReducer, initialMobileNavSheetState)
  const focusTargetRef = useRef(null)

  const openRoot = useCallback((section, trigger) => {
    focusTargetRef.current = trigger || null
    dispatch({
      type: 'OPEN_ROOT',
      section,
      returnFocusId: trigger?.id || null,
    })
  }, [])

  const pushView = useCallback((view) => dispatch({ type: 'PUSH_VIEW', view }), [])
  const replaceView = useCallback((view) => dispatch({ type: 'REPLACE_VIEW', view }), [])
  const goBack = useCallback(() => dispatch({ type: 'POP_VIEW' }), [])

  const closeSheet = useCallback(() => {
    const focusTarget = focusTargetRef.current
    focusTargetRef.current = null
    dispatch({ type: 'CLOSE' })
    if (typeof window !== 'undefined') {
      window.requestAnimationFrame?.(() => focusTarget?.focus?.())
    }
  }, [])

  const resetAfterRoute = useCallback(() => {
    focusTargetRef.current = null
    dispatch({ type: 'RESET_AFTER_ROUTE' })
  }, [])

  const currentView = state.viewStack[state.viewStack.length - 1] || null
  const value = useMemo(
    () => ({
      ...state,
      activeRoot: state.rootSection,
      currentView,
      canGoBack: state.viewStack.length > 1,
      openRoot,
      pushView,
      replaceView,
      goBack,
      closeSheet,
      resetAfterRoute,
    }),
    [closeSheet, currentView, goBack, openRoot, pushView, replaceView, resetAfterRoute, state],
  )

  return <MobileNavSheetContext.Provider value={value}>{children}</MobileNavSheetContext.Provider>
}

MobileNavSheetProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useMobileNavSheet = () => useContext(MobileNavSheetContext)
