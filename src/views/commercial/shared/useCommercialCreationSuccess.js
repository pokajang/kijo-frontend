import { useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { navigateToProjectDocument } from './commercialReturnNavigation'
import { showCommercialCreationSuccess } from './commercialCreationSuccess'

const RECEIPT_PREFIX = 'commercialCreationReceipt'
const RECEIPT_TTL_MS = 24 * 60 * 60 * 1000
const EMPTY_ACTIONS = []

export const getCommercialCreationReceiptKey = (documentType, projectId) =>
  `${RECEIPT_PREFIX}:${documentType}:${String(projectId || '')}`

const readReceipt = (key) => {
  try {
    const receipt = JSON.parse(sessionStorage.getItem(key) || 'null')
    if (!receipt || Date.now() - Number(receipt.createdAt || 0) > RECEIPT_TTL_MS) {
      sessionStorage.removeItem(key)
      return null
    }
    return receipt
  } catch {
    sessionStorage.removeItem(key)
    return null
  }
}

const storeReceipt = (key, receipt) => {
  try {
    sessionStorage.setItem(key, JSON.stringify({ ...receipt, createdAt: Date.now() }))
  } catch {
    // The success modal remains available even when browser storage is unavailable.
  }
}

const clearReceipt = (key) => {
  try {
    sessionStorage.removeItem(key)
  } catch {
    // Nothing else is required when browser storage is unavailable.
  }
}

const useCommercialCreationSuccess = ({
  documentType,
  documentLabel,
  projectId,
  projectLabel,
  origin,
  listOrigin,
  listPath,
  detailPath,
  viewLabel,
  listLabel,
  additionalActions = EMPTY_ACTIONS,
  onAdditionalAction,
}) => {
  const navigate = useNavigate()
  const recoveryStartedRef = useRef('')
  const receiptKey = getCommercialCreationReceiptKey(documentType, projectId)

  const presentReceipt = useCallback(
    async (receipt, { persist = true } = {}) => {
      if (persist) storeReceipt(receiptKey, receipt)

      const action = await showCommercialCreationSuccess({
        documentLabel,
        documentReference: receipt.reference,
        projectLabel,
        viewLabel,
        listLabel,
        canView: Boolean(receipt.detailId),
        additionalActions,
        detailLines: receipt.detailLines || [],
      })

      clearReceipt(receiptKey)

      if (action === 'view' && receipt.detailId) {
        const href = `${detailPath}/${receipt.detailId}`
        if (origin === listOrigin) navigate(href)
        else navigateToProjectDocument(navigate, href, projectId)
        return
      }

      if (action === 'list') {
        navigate(listPath)
        return
      }

      if (additionalActions.some((item) => item.key === action)) {
        await onAdditionalAction?.(action, receipt)
      }

      navigate(`/project/manage/${projectId}`)
    },
    [
      additionalActions,
      detailPath,
      documentLabel,
      listLabel,
      listOrigin,
      listPath,
      navigate,
      onAdditionalAction,
      origin,
      projectId,
      projectLabel,
      receiptKey,
      viewLabel,
    ],
  )

  useEffect(() => {
    const recoveryTimer = window.setTimeout(() => {
      const receipt = readReceipt(receiptKey)
      if (!receipt || recoveryStartedRef.current === receiptKey) return

      recoveryStartedRef.current = receiptKey
      presentReceipt(receipt, { persist: false })
    }, 0)

    return () => window.clearTimeout(recoveryTimer)
  }, [presentReceipt, receiptKey])

  return presentReceipt
}

export default useCommercialCreationSuccess
