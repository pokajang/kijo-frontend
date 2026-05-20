import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

import dialog from '../../../../components/dialog/dialogService'
import { getRecordListPath } from '../../records/config/recordTabs'
import {
  ensureQuoteResultSuccess,
  isQuoteResultSuccess,
  normalizeQuoteResult,
  quoteSaveMethod,
  quoteServiceUrl,
} from '../quoteApi'
import { removeQuoteInquirySource } from '../quoteInquirySource'
import { clearQuoteMainDraft, clearQuoteServiceDraft } from '../quoteMainDrafts'
import { handleQuoteSuccess } from '../quoteSuccessHandler'

const invalidSaveResponseMessage = 'Server returned an invalid response while saving the quotation.'

const recordTabByService = {
  training: 'training-tab',
  ih: 'ih-tab',
  manpower: 'manpower-tab',
  equipment: 'equipment-tab',
  special: 'special-tab',
}

export const isQuoteSaveSuccess = (payload) => isQuoteResultSuccess(payload)

export const ensureQuoteSaveSuccessPayload = (payload) => ensureQuoteResultSuccess(payload)

const getServerMessage = (result, fallback) =>
  result?.message || result?.error || result?.data?.message || fallback

const readResponseJson = async (response) => {
  if (typeof response?.text === 'function') {
    const text = await response.text()
    if (!text) return {}

    try {
      return JSON.parse(text)
    } catch {
      throw new Error(invalidSaveResponseMessage)
    }
  }

  if (typeof response?.json === 'function') {
    return response.json()
  }

  return {}
}

const resolveMessage = (message, context, fallback) =>
  typeof message === 'function' ? message(context) : message || fallback

export const saveQuote = async ({
  serviceKey,
  quoteId = null,
  isEditMode = false,
  recordTabKey,
  draftContext = {},
  payload,
  navigate,
  fetcher = fetch,
  dialogService = dialog,
  successMessage,
  successTitle,
  failureMessage = 'Failed to save quotation.',
  networkErrorMessage = 'An error occurred while saving the quotation.',
  createAnotherPath = '/crm/quotes',
} = {}) => {
  const endpoint = quoteServiceUrl(serviceKey, isEditMode ? quoteId : null)

  try {
    const response = await fetcher(endpoint, {
      method: quoteSaveMethod(isEditMode),
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const result = normalizeQuoteResult(await readResponseJson(response))

    if (!response?.ok && !isQuoteSaveSuccess(result)) {
      dialogService.alert(getServerMessage(result, failureMessage))
      return { saved: false, result }
    }

    if (!isQuoteSaveSuccess(result)) {
      dialogService.alert(getServerMessage(result, failureMessage))
      return { saved: false, result }
    }

    await handleQuoteSuccess(ensureQuoteSaveSuccessPayload(result))
    clearQuoteMainDraft(serviceKey)
    clearQuoteServiceDraft({ serviceKey, ...draftContext })
    removeQuoteInquirySource()

    const context = { result, isEditMode, serviceKey }
    const goToList = await dialogService.confirm(
      resolveMessage(
        successMessage,
        context,
        `Quotation ${isEditMode ? 'updated' : 'created'} successfully. Go to quote records?`,
      ),
      {
        title: resolveMessage(
          successTitle,
          context,
          isEditMode ? 'Quotation Updated' : 'Quotation Created',
        ),
        confirmText: 'Go to list',
        cancelText: isEditMode ? 'Stay here' : 'Create another',
      },
    )

    if (goToList && typeof navigate === 'function') {
      navigate(getRecordListPath(recordTabKey || recordTabByService[serviceKey]), {
        replace: true,
      })
    } else if (!isEditMode && typeof navigate === 'function') {
      navigate(createAnotherPath, {
        replace: true,
        state: { quoteResetToken: Date.now() },
      })
    }

    return { saved: true, result }
  } catch (err) {
    console.error('Quote save error:', err)
    dialogService.alert(
      err?.message === invalidSaveResponseMessage ? err.message : networkErrorMessage,
    )
    return { saved: false, error: err }
  }
}

export const useQuoteSave = ({
  serviceKey,
  quoteId = null,
  isEditMode = false,
  recordTabKey,
  draftContext = {},
  successMessage,
  successTitle,
  failureMessage,
  networkErrorMessage,
} = {}) => {
  const navigate = useNavigate()
  const draftClientId = draftContext.clientId
  const draftLanguage = draftContext.language

  return useCallback(
    (payload, options = {}) =>
      saveQuote({
        serviceKey,
        quoteId,
        isEditMode,
        recordTabKey,
        draftContext: {
          clientId: draftClientId,
          language: draftLanguage,
        },
        payload,
        navigate,
        successMessage,
        successTitle,
        failureMessage,
        networkErrorMessage,
        ...options,
      }),
    [
      draftClientId,
      draftLanguage,
      failureMessage,
      isEditMode,
      navigate,
      networkErrorMessage,
      quoteId,
      recordTabKey,
      serviceKey,
      successMessage,
      successTitle,
    ],
  )
}
