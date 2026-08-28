import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

const GlobalPromptContext = createContext(null)

export const GlobalPromptProvider = ({ children }) => {
  const [prompts, setPrompts] = useState({})

  const register = useCallback((id, priority, requested) => {
    setPrompts((current) => {
      if (!requested) {
        if (!(id in current)) return current
        const next = { ...current }
        delete next[id]
        return next
      }

      if (current[id]?.priority === priority) return current
      return { ...current, [id]: { priority } }
    })
  }, [])

  const activePromptId = useMemo(
    () =>
      Object.entries(prompts).sort(
        ([firstId, first], [secondId, second]) =>
          second.priority - first.priority || firstId.localeCompare(secondId),
      )[0]?.[0] || null,
    [prompts],
  )

  const value = useMemo(() => ({ activePromptId, register }), [activePromptId, register])

  return <GlobalPromptContext.Provider value={value}>{children}</GlobalPromptContext.Provider>
}

GlobalPromptProvider.propTypes = {
  children: PropTypes.node.isRequired,
}

export const useGlobalPrompt = (id, priority, requested) => {
  const coordinator = useContext(GlobalPromptContext)

  useEffect(() => {
    if (!coordinator) return undefined
    coordinator.register(id, priority, requested)
    return () => coordinator.register(id, priority, false)
  }, [coordinator, id, priority, requested])

  return Boolean(requested && (!coordinator || coordinator.activePromptId === id))
}
