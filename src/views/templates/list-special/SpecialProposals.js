// src/templates/list/SpecialProposals.js

import React, { useCallback, useEffect, useState } from 'react'
import { CRow, CCol, CCard, CCardBody, CCardHeader } from '@coreui/react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import TemplateTable from './TemplateTable'
import dialog from '../../../components/dialog/dialogService'
import { createBmCopy, deleteTemplate, listTemplates } from '../shared/templateApi'
import TemplateLanguageDropdown from '../shared/TemplateLanguageDropdown'
import {
  getTemplateId,
  buildBmCopyConfirmation,
  buildExistingBmCopyConfirmation,
  attachBmCopyLinks,
  isSuccess,
  templateConfigs,
  unwrapRows,
} from '../shared/templateProposalUtils'

const config = templateConfigs.special
const SUPPORTED_LANGUAGES = new Set(['en', 'ms-MY'])

const normalizeLanguage = (value) => (SUPPORTED_LANGUAGES.has(value) ? value : 'en')
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

export default function SpecialProposals() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [language, setLanguage] = useState(() => normalizeLanguage(searchParams.get('language')))

  const handleLanguageChange = useCallback(
    (nextLanguage) => {
      const normalized = normalizeLanguage(nextLanguage)
      setLanguage(normalized)
      setSearchParams(normalized === 'en' ? {} : { language: normalized }, { replace: true })
    },
    [setSearchParams],
  )

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    const listRequest = listTemplates('special', { language })
    const bmRequest =
      language === 'en' ? listTemplates('special', { language: 'ms-MY' }) : Promise.resolve(null)

    Promise.all([listRequest, bmRequest])
      .then(([json, bmJson]) => {
        const rows = unwrapRows(json)
        const bmRows = bmJson ? unwrapRows(bmJson) : []
        setData(language === 'en' ? attachSpecialBmCopyLinks(rows, bmRows) : rows)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [language])

  const handleDelete = async (id) => {
    if (
      !(await dialog.confirm('Are you sure you want to delete this proposal?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      const result = await deleteTemplate('special', id)
      if (isSuccess(result)) {
        dialog.alert('Proposal deleted successfully.')
        setData((prev) => prev.filter((r) => getTemplateId(r) !== id))
      } else {
        dialog.alert(`Delete failed: ${result.message}`)
      }
    } catch (err) {
      console.error('Delete error', err)
      dialog.alert(err?.message || 'An error occurred during deletion.')
    }
  }

  const handleCreateBmCopy = async (id, row) => {
    if (row?.hasBmCopy && row?.bmTemplateId) {
      const confirmation = buildExistingBmCopyConfirmation(row, 'this special service proposal')
      if (await dialog.confirm(confirmation.message, confirmation.options)) {
        navigate(config.editUrl(row.bmTemplateId))
      }
      return
    }

    const confirmation = buildBmCopyConfirmation(row, 'this special service proposal')
    const options = {
      ...confirmation.options,
      alert: {
        color: 'warning',
        message: `${confirmation.options.alert.message} Uploaded attachments are copied as-is and still require manual BM review or replacement.`,
      },
    }
    const result = await dialog.confirm(confirmation.message, {
      ...options,
      loadingMessage: 'Translating proposal into Bahasa Melayu...',
      successMessage: 'Proposal translated... redirecting to edit proposal page.',
      onConfirm: async () => {
        const response = await createBmCopy('special', id)
        if (!isSuccess(response)) {
          throw new Error(response?.message || 'Failed to create BM copy.')
        }
        return response
      },
    })
    const bmTemplateId = getBmTemplateIdFromResponse(result)
    if (bmTemplateId) {
      navigate(config.editUrl(bmTemplateId))
    }
  }

  useEffect(() => {
    const nextLanguage = normalizeLanguage(searchParams.get('language'))
    setLanguage((current) => (current === nextLanguage ? current : nextLanguage))
  }, [searchParams])

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center gap-3">
            <strong>Special Service Proposal Templates</strong>
            <TemplateLanguageDropdown value={language} onChange={handleLanguageChange} />
          </CCardHeader>
          <CCardBody>
            {error && <p className="text-danger">Failed: {error}</p>}
            <TemplateTable
              data={data}
              onDelete={handleDelete}
              onCreateBmCopy={handleCreateBmCopy}
              loading={loading}
            />
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}
