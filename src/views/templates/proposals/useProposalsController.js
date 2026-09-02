import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import dialog from '../../../components/dialog/dialogService'
import { createBmCopy, deleteTemplate, isAbortError, listTemplates } from '../shared/templateApi'
import {
  attachBmCopyLinks,
  buildBmCopyConfirmation,
  buildExistingBmCopyConfirmation,
  getTemplateId,
  isSuccess,
  normalizeTemplateLanguage,
  templateConfigs,
  unwrapRows,
} from '../shared/templateProposalUtils'
import { getTrainingEditUrl } from '../list-training/trainingTemplateUtils'
import {
  PROPOSAL_TYPES,
  getProposalListPath,
  normalizeProposalTab,
  proposalTabBySlug,
  proposalTabOptions,
  proposalTypeByTab,
  proposalTypeMeta,
} from './proposalTabs'

const emptyData = PROPOSAL_TYPES.reduce((acc, type) => {
  acc[type] = []
  return acc
}, {})

const resolveActiveTab = (value) =>
  proposalTabOptions.some((option) => option.key === value) ? value : normalizeProposalTab(value)

const normalizeIdValue = (value) => getTemplateId({ id: value })

const getExistingBmTemplateId = (row) =>
  normalizeIdValue(
    row?.bmTemplateId ?? row?.bm_template_id ?? row?.bmProposalId ?? row?.bm_proposal_id,
  )

const attachSpecialBmCopyLinks = (rows = [], bmRows = []) => {
  const linkedRows = attachBmCopyLinks(rows, bmRows)

  return linkedRows.map((row, index) => {
    const bmTemplateId = normalizeIdValue(row?.bmTemplateId) || getExistingBmTemplateId(rows[index])

    return {
      ...row,
      hasBmCopy: Boolean(bmTemplateId),
      bmTemplateId,
    }
  })
}

const getBmTemplateIdFromResponse = (response) => {
  const directId = getTemplateId(response)
  if (directId) return directId

  const nestedDataId = getTemplateId(response?.data)
  if (nestedDataId) return nestedDataId

  const actionResultId = getTemplateId(response?.actionResult)
  if (actionResultId) return actionResultId

  const actionResultDataId = getTemplateId(response?.actionResult?.data)
  if (actionResultDataId) return actionResultDataId

  const rows = unwrapRows(response?.actionResult || response)
  return getTemplateId(rows[0])
}

const getEditUrl = (type, templateId) => {
  if (type === 'training') return getTrainingEditUrl(templateId)
  return templateConfigs[type].editUrl(templateId)
}

const getProposalDescription = (type) => {
  if (type === 'ih') return 'this industrial hygiene proposal'
  if (type === 'manpower') return 'this manpower proposal'
  if (type === 'special') return 'this special service proposal'
  return 'this training proposal'
}

const getTypesForTab = (tab) => {
  if (tab === 'all-tab') return PROPOSAL_TYPES
  const type = proposalTypeByTab[tab]
  return type ? [type] : PROPOSAL_TYPES
}

const loadTemplatesForType = async (type, language, signal) => {
  const listRequest = listTemplates(type, { language, signal })
  const bmRequest =
    language === 'en' ? listTemplates(type, { language: 'ms-MY', signal }) : Promise.resolve(null)

  const [json, bmJson] = await Promise.all([listRequest, bmRequest])
  const rows = unwrapRows(json)
  const bmRows = bmJson ? unwrapRows(bmJson) : []

  if (language !== 'en') return rows
  return type === 'special'
    ? attachSpecialBmCopyLinks(rows, bmRows)
    : attachBmCopyLinks(rows, bmRows)
}

export const useProposalsController = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { proposalSlug } = useParams()
  const params = useMemo(() => new URLSearchParams(location.search), [location.search])
  const activeTab = resolveActiveTab(params.get('tab') || proposalSlug)
  const language = normalizeTemplateLanguage(params.get('language'))
  const activeTypes = useMemo(() => getTypesForTab(activeTab), [activeTab])
  const [dataByType, setDataByType] = useState(emptyData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const setRouteParams = useCallback(
    ({ tab = activeTab, nextLanguage = language }) => {
      navigate(getProposalListPath(resolveActiveTab(tab), nextLanguage), { replace: true })
    },
    [activeTab, language, navigate],
  )

  const handleTabChange = useCallback(
    (tab) => {
      setRouteParams({ tab })
    },
    [setRouteParams],
  )

  const handleLanguageChange = useCallback(
    (nextLanguage) => {
      setRouteParams({ nextLanguage: normalizeTemplateLanguage(nextLanguage) })
    },
    [setRouteParams],
  )

  const loadData = useCallback(
    async (signal) => {
      setLoading(true)
      setError('')

      try {
        const entries = await Promise.all(
          activeTypes.map(async (type) => [
            type,
            await loadTemplatesForType(type, language, signal),
          ]),
        )

        if (signal.aborted) return

        setDataByType((current) => {
          const next = activeTab === 'all-tab' ? { ...emptyData } : { ...current }
          entries.forEach(([type, rows]) => {
            next[type] = rows
          })
          return next
        })
      } catch (err) {
        if (isAbortError(err)) return
        setError(err?.message || 'Failed to load proposal templates.')
      } finally {
        if (!signal.aborted) setLoading(false)
      }
    },
    [activeTab, activeTypes, language],
  )

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const legacyTab = params.get('tab')
    const nextTab = resolveActiveTab(legacyTab || proposalSlug)
    const nextLanguage = normalizeTemplateLanguage(params.get('language'))
    const hasInvalidSlug =
      proposalSlug !== undefined && proposalTabBySlug[proposalSlug] === undefined
    const needsNormalize =
      Boolean(legacyTab) ||
      hasInvalidSlug ||
      nextTab !== resolveActiveTab(proposalSlug) ||
      (nextLanguage === 'en' && params.has('language')) ||
      (nextLanguage === 'ms-MY' && params.get('language') !== 'ms-MY')

    if (!needsNormalize) return

    navigate(getProposalListPath(nextTab, nextLanguage), { replace: true })
  }, [location.search, navigate, proposalSlug])

  useEffect(() => {
    const controller = new AbortController()
    loadData(controller.signal)
    return () => controller.abort()
  }, [loadData])

  const refreshData = useCallback(() => {
    const controller = new AbortController()
    return loadData(controller.signal)
  }, [loadData])

  const handleDelete = useCallback(async (type, id) => {
    if (
      !(await dialog.confirm('Are you sure you want to delete this proposal?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      const result = await deleteTemplate(type, id)
      if (isSuccess(result)) {
        dialog.alert('Proposal deleted successfully.')
        setDataByType((current) => ({
          ...current,
          [type]: (current[type] || []).filter((row) => getTemplateId(row) !== id),
        }))
      } else {
        dialog.alert(`Delete failed: ${result.message}`)
      }
    } catch (err) {
      console.error('Delete error', err)
      dialog.alert(err?.message || 'An error occurred during deletion.')
    }
  }, [])

  const handleCreateBmCopy = useCallback(
    async (type, id, row) => {
      if (row?.hasBmCopy && row?.bmTemplateId) {
        const confirmation = buildExistingBmCopyConfirmation(row, getProposalDescription(type))
        if (await dialog.confirm(confirmation.message, confirmation.options)) {
          navigate(getEditUrl(type, row.bmTemplateId), {
            state: { returnTo: `${location.pathname}${location.search}` },
          })
        }
        return
      }

      const confirmation = buildBmCopyConfirmation(row, getProposalDescription(type))
      const options =
        type === 'special'
          ? {
              ...confirmation.options,
              alert: {
                color: 'warning',
                message: `${confirmation.options.alert.message} Uploaded attachments are copied as-is and still require manual BM review or replacement.`,
              },
            }
          : confirmation.options

      const result = await dialog.confirm(confirmation.message, {
        ...options,
        loadingMessage: 'Translating proposal into Bahasa Melayu...',
        successMessage: 'Proposal translated... redirecting to edit proposal page.',
        onConfirm: async () => {
          const response = await createBmCopy(type, id)
          if (!isSuccess(response)) {
            throw new Error(response?.message || 'Failed to create BM copy.')
          }
          return response
        },
      })

      const bmTemplateId =
        type === 'special' ? getBmTemplateIdFromResponse(result) : getTemplateId(result)
      if (bmTemplateId) {
        navigate(getEditUrl(type, bmTemplateId), {
          state: { returnTo: `${location.pathname}${location.search}` },
        })
      }
    },
    [location.pathname, location.search, navigate],
  )

  return {
    activeTab,
    activeType: proposalTypeByTab[activeTab] || null,
    activeTypes,
    dataByType,
    error,
    handleCreateBmCopy,
    handleDelete,
    handleLanguageChange,
    handleTabChange,
    language,
    loading,
    proposalTabOptions,
    proposalTypeMeta,
    refreshData,
  }
}
