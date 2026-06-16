import { useCallback, useEffect, useRef, useState } from 'react'
import dialog from '../../../../components/dialog/dialogService'
import { fetchersByTab } from '../config/recordFetchers'

export const useRecordsFetch = (activeTab) => {
  const [quotes, setQuotes] = useState([])
  const [quotesLoading, setQuotesLoading] = useState(false)
  const quotesRef = useRef([])
  const fetchSeqRef = useRef(0)
  const abortControllerRef = useRef(null)

  useEffect(() => {
    quotesRef.current = quotes
  }, [quotes])

  const fetchQuotes = useCallback(
    async (tabKey = activeTab, options = {}) => {
      const { showLoader = true } = options
      const fetcher = fetchersByTab[tabKey]
      const requestId = ++fetchSeqRef.current
      if (showLoader) setQuotesLoading(true)

      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      abortControllerRef.current = new AbortController()

      if (!fetcher) {
        if (requestId === fetchSeqRef.current) {
          setQuotes([])
          setQuotesLoading(false)
        }
        return
      }

      try {
        const nextQuotes = await fetcher()
        if (requestId === fetchSeqRef.current && !abortControllerRef.current.signal.aborted) {
          setQuotes(nextQuotes)
          setQuotesLoading(false)
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return
        }
        console.error('Error fetching quotes:', err)
        if (requestId === fetchSeqRef.current) {
          if (showLoader || quotesRef.current.length === 0) {
            setQuotes([])
          }
          setQuotesLoading(false)
          dialog.alert('Failed to load quotations. Please refresh the page.')
        }
      }
    },
    [activeTab],
  )

  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  useEffect(() => {
    fetchSeqRef.current += 1
    setQuotes([])
    setQuotesLoading(true)
    fetchQuotes(activeTab, { showLoader: true })
  }, [activeTab, fetchQuotes])

  return {
    quotes,
    setQuotes,
    quotesLoading,
    fetchQuotes,
  }
}
