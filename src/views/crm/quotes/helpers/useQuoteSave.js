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

const formatMoney = (value) => {
  const number = Number(value)
  if (!Number.isFinite(number)) return 'RM 0.00'

  return `RM ${number.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const readConfirmResult = (result) =>
  typeof result === 'object' && result !== null
    ? { confirmed: result.confirmed === true, value: result.value }
    : { confirmed: result === true, value: null }

const resolveProjectValueDecision = async (result, dialogService) => {
  const decision = result?.project_value_decision
  if (!decision || typeof dialogService?.confirm !== 'function') return null

  const options = [
    ...(decision.sync_allowed
      ? [
          {
            value: 'sync',
            label: 'Update Project Current Value',
          },
        ]
      : []),
    {
      value: 'keep',
      label: 'Keep Project Value',
    },
  ]

  const confirmResult = await dialogService.confirm(
    [
      `This quotation is already awarded and its total changed from ${formatMoney(
        decision.old_quote_total,
      )} to ${formatMoney(decision.new_quote_total)}.`,
      `Linked project: ${decision.project_name || `#${decision.project_id}`}.`,
      decision.sync_allowed
        ? 'Choose whether the project current value should follow the revised quotation total.'
        : decision.block_reason ||
          'The linked project already has invoices, so the project value cannot be updated from this quote edit.',
    ].join('\n\n'),
    {
      title: 'Awarded Quote Value Changed',
      confirmText: 'Continue Save',
      cancelText: 'Cancel Save',
      confirmColor: decision.sync_allowed ? 'warning' : 'primary',
      select: {
        label: 'Project Value Action',
        helperText: decision.sync_allowed
          ? `Awarded value remains ${formatMoney(decision.awarded_value)}.`
          : 'You can keep the project value and save the quote, or cancel this save.',
        options,
        defaultValue: options[0]?.value,
      },
    },
  )

  const { confirmed, value } = readConfirmResult(confirmResult)
  return confirmed ? value || options[0]?.value || null : null
}

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
  allowProjectValueDecision = true,
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

    if (
      allowProjectValueDecision &&
      !response?.ok &&
      result?.status === 'project_value_decision_required'
    ) {
      const decision = await resolveProjectValueDecision(result, dialogService)
      if (!decision) {
        return { saved: false, cancelled: true, result }
      }

      return saveQuote({
        serviceKey,
        quoteId,
        isEditMode,
        recordTabKey,
        draftContext,
        payload: {
          ...payload,
          project_value_sync_decision: decision,
          ...(decision === 'sync'
            ? {
                project_value_sync_reason:
                  'Project current value updated from awarded quotation edit.',
              }
            : {}),
        },
        navigate,
        fetcher,
        dialogService,
        successMessage,
        successTitle,
        failureMessage,
        networkErrorMessage,
        createAnotherPath,
        allowProjectValueDecision: false,
      })
    }

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
