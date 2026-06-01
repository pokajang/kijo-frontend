import React, { createContext, useCallback, useContext, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

const noop = () => {}

const fallbackContext = {
  activeDrawerId: '',
  openRightDrawer: noop,
  closeRightDrawer: noop,
  isRightDrawerActive: () => false,
}

export const RIGHT_DRAWER_IDS = {
  knowledge: 'knowledge',
  workloadScore: 'workload-score',
}

const RightDrawerContext = createContext(fallbackContext)

export const RightDrawerProvider = ({ children }) => {
  const [activeDrawerId, setActiveDrawerId] = useState('')

  const openRightDrawer = useCallback((drawerId) => {
    setActiveDrawerId(drawerId || '')
  }, [])

  const closeRightDrawer = useCallback((drawerId) => {
    setActiveDrawerId((currentDrawerId) => {
      if (drawerId && currentDrawerId !== drawerId) return currentDrawerId
      return ''
    })
  }, [])

  const isRightDrawerActive = useCallback(
    (drawerId) => Boolean(drawerId) && activeDrawerId === drawerId,
    [activeDrawerId],
  )

  const value = useMemo(
    () => ({
      activeDrawerId,
      openRightDrawer,
      closeRightDrawer,
      isRightDrawerActive,
    }),
    [activeDrawerId, closeRightDrawer, isRightDrawerActive, openRightDrawer],
  )

  return <RightDrawerContext.Provider value={value}>{children}</RightDrawerContext.Provider>
}

RightDrawerProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useRightDrawer = () => useContext(RightDrawerContext)
