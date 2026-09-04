import { useCallback, useEffect, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

const isAbortLikeError = (error) => {
  const message = String(error?.message || '').toLowerCase()
  return (
    error?.name === 'AbortError' ||
    error?.code === 20 ||
    message.includes('abort') ||
    message.includes('failed to fetch')
  )
}

export const useNotificationList = ({ enabled, limit = 20 }) => {
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [errored, setErrored] = useState(false)
  const [loadMoreErrored, setLoadMoreErrored] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const loadingMoreRef = useRef(false)
  const loadMoreControllerRef = useRef(null)

  const loadList = useCallback(
    async ({ signal, offset = 0, append = false }) => {
      if (append) {
        setLoadingMore(true)
        setLoadMoreErrored(false)
      } else {
        setLoading(true)
        setErrored(false)
        setHasLoaded(false)
      }
      try {
        const response = await fetch(
          `${API_BASE}notifications/list?limit=${limit}&offset=${offset}`,
          {
            credentials: 'include',
            silentError: true,
            signal,
          },
        )
        const data = await response.json()
        if (data?.status === 'success') {
          const nextItems = Array.isArray(data.data?.items) ? data.data.items : []
          setItems((currentItems) => (append ? [...currentItems, ...nextItems] : nextItems))
          setTotal(Number(data.data?.total ?? nextItems.length))
        } else {
          if (append) setLoadMoreErrored(true)
          else setErrored(true)
        }
      } catch (error) {
        if (!isAbortLikeError(error)) {
          if (append) setLoadMoreErrored(true)
          else setErrored(true)
        }
      } finally {
        if (!signal?.aborted) {
          if (append) {
            loadingMoreRef.current = false
            setLoadingMore(false)
          } else {
            setLoading(false)
            setHasLoaded(true)
          }
        }
      }
    },
    [limit],
  )

  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    loadList({ signal: controller.signal })
    return () => {
      controller.abort()
      loadMoreControllerRef.current?.abort()
    }
  }, [enabled, loadList])

  const loadMore = useCallback(() => {
    if (!enabled || loadingMoreRef.current || items.length >= total) return
    loadingMoreRef.current = true
    loadMoreControllerRef.current?.abort()
    const controller = new AbortController()
    loadMoreControllerRef.current = controller
    loadList({ signal: controller.signal, offset: items.length, append: true })
  }, [enabled, items.length, loadList, total])

  return {
    items,
    total,
    loading,
    loadingMore,
    errored,
    loadMoreErrored,
    hasLoaded,
    hasMore: items.length < total,
    loadMore,
  }
}
