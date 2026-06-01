import { useEffect, useRef, useState } from 'react'

const TABLE_VIEWPORT_BOTTOM_RESERVE = 8

export const useTableViewportHeight = (deps = []) => {
  const [tableViewportHeight, setTableViewportHeight] = useState(null)
  const tableViewportRef = useRef(null)
  const tableFooterRef = useRef(null)

  useEffect(() => {
    const updateViewportHeight = () => {
      const viewportEl = tableViewportRef.current
      if (!viewportEl) return

      const footerHeight = tableFooterRef.current?.offsetHeight || 0
      const viewportRect = viewportEl.getBoundingClientRect()
      const minHeight = 220
      const nextHeight = Math.max(
        minHeight,
        Math.floor(
          window.innerHeight - viewportRect.top - footerHeight - TABLE_VIEWPORT_BOTTOM_RESERVE,
        ),
      )

      setTableViewportHeight((prev) => (prev === nextHeight ? prev : nextHeight))
    }

    const rafUpdate = () => window.requestAnimationFrame(updateViewportHeight)
    rafUpdate()
    window.addEventListener('resize', rafUpdate)

    return () => {
      window.removeEventListener('resize', rafUpdate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return {
    tableViewportHeight,
    tableViewportRef,
    tableFooterRef,
  }
}

export default useTableViewportHeight
