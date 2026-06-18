import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useParams } from 'react-router-dom'
import {
  fetchEquipmentQuotes,
  fetchIHQuotes,
  fetchManpowerQuotes,
  fetchSpecialQuotes,
  fetchTrainingQuotes,
} from '../services/quoteService'
import { getRecordListPath, normalizeRecordTab } from '../config/recordTabs'
import { getQuotationAgeDays } from '../utils/recordFilters'
import { getDetailReturnTo } from '../../../../utils/navigation/returnTo'

const SERVICE_MAP = {
  'training-tab': { label: 'Training', fetcher: fetchTrainingQuotes },
  'ih-tab': { label: 'Industrial Hygiene', fetcher: fetchIHQuotes },
  'manpower-tab': { label: 'Manpower Supply', fetcher: fetchManpowerQuotes },
  'equipment-tab': { label: 'Equipment Supply', fetcher: fetchEquipmentQuotes },
  'special-tab': { label: 'Special', fetcher: fetchSpecialQuotes },
}

const getSubject = (record) => {
  const formData = record?.formData || {}
  if (formData.trainingTopic) return formData.trainingTopic
  if (formData.serviceTitle) return formData.serviceTitle
  if (Array.isArray(record?.lineItems) && record.lineItems.length > 0) {
    const first = record.lineItems[0]
    return first?.itemName || first?.title || first?.description || '-'
  }
  return formData.inquiryRemarks || '-'
}

export const getStatusColor = (status) => {
  if (status === 'Awarded') return 'success'
  if (status === 'Failed') return 'danger'
  if (status === 'Terminated') return 'dark'
  return 'info'
}

export const useRecordDetailsData = () => {
  const { serviceTab: serviceParam, recordId } = useParams()
  const location = useLocation()

  const [loading, setLoading] = useState(true)
  const [record, setRecord] = useState(null)
  const [error, setError] = useState('')
  const loadSeqRef = useRef(0)
  const isMountedRef = useRef(true)

  const serviceTab = normalizeRecordTab(serviceParam)
  const serviceConfig = SERVICE_MAP[serviceTab]
  const parsedId = Number(recordId)
  const returnTab = normalizeRecordTab(
    new URLSearchParams(location.search).get('tab') || serviceTab,
  )
  const returnTo = getDetailReturnTo(location, getRecordListPath(returnTab))

  const loadRecord = useCallback(
    async ({ preferState = true, withSpinner = false } = {}) => {
      const loadSeq = loadSeqRef.current + 1
      loadSeqRef.current = loadSeq

      if (!serviceConfig) {
        if (isMountedRef.current && loadSeq === loadSeqRef.current) {
          setError('Unknown service tab.')
          setRecord(null)
        }
        return
      }
      if (!Number.isFinite(parsedId)) {
        if (isMountedRef.current && loadSeq === loadSeqRef.current) {
          setError('Invalid record id.')
          setRecord(null)
        }
        return
      }

      if (preferState) {
        const stateRecord = location.state?.record
        if (
          stateRecord &&
          Number(stateRecord?.id) === parsedId &&
          String(stateRecord?.serviceTab) === String(serviceTab)
        ) {
          if (isMountedRef.current && loadSeq === loadSeqRef.current) {
            setError('')
            setRecord(stateRecord)
            if (withSpinner) setLoading(false)
          }
          return
        }
      }

      if (withSpinner) setLoading(true)
      if (isMountedRef.current && loadSeq === loadSeqRef.current) {
        setError('')
      }
      try {
        const rows = await serviceConfig.fetcher()
        if (!isMountedRef.current || loadSeq !== loadSeqRef.current) return

        const found = rows.find((row) => Number(row?.id) === parsedId) || null
        if (!found) {
          setError('Record not found.')
        }
        setRecord(found)
      } catch (err) {
        if (!isMountedRef.current || loadSeq !== loadSeqRef.current) return
        console.error('Failed loading record details:', err)
        setError('Failed to load record details.')
      } finally {
        if (withSpinner && isMountedRef.current && loadSeq === loadSeqRef.current) {
          setLoading(false)
        }
      }
    },
    [location.state, parsedId, serviceConfig, serviceTab],
  )

  useEffect(() => {
    isMountedRef.current = true
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    const initialLoad = async () => {
      setLoading(true)
      await loadRecord({ preferState: true, withSpinner: false })
      if (isMountedRef.current) setLoading(false)
    }

    initialLoad()
  }, [loadRecord])

  const amountDisplay = useMemo(() => {
    const amount = Number(record?.amount ?? record?.grandTotal ?? 0)
    if (!Number.isFinite(amount)) return '-'
    return amount.toLocaleString('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }, [record])

  const subject = useMemo(() => getSubject(record), [record])
  const quotationAgeDays = getQuotationAgeDays(record?.dateCreated)
  const isAwarded = record?.status === 'Awarded'

  return {
    serviceTab,
    serviceConfig,
    returnTab,
    returnTo,
    loading,
    record,
    error,
    loadRecord,
    amountDisplay,
    subject,
    quotationAgeDays,
    isAwarded,
  }
}
