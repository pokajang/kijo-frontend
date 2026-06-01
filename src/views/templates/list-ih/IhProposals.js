// src/templates/IhProposals.js

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
  normalizeTemplateLanguage,
  templateConfigs,
  unwrapRows,
} from '../shared/templateProposalUtils'

const config = templateConfigs.ih

export default function IhProposals() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const language = normalizeTemplateLanguage(searchParams.get('language'))
  const [data, setData] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(() => {
    setLoading(true)
    setError(null)
    const listRequest = listTemplates('ih', { language })
    const bmRequest =
      language === 'en' ? listTemplates('ih', { language: 'ms-MY' }) : Promise.resolve(null)

    Promise.all([listRequest, bmRequest])
      .then(([json, bmJson]) => {
        const rows = unwrapRows(json)
        const bmRows = bmJson ? unwrapRows(bmJson) : []
        setData(language === 'en' ? attachBmCopyLinks(rows, bmRows) : rows)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [language])

  const handleLanguageChange = useCallback(
    (nextLanguage) => {
      const normalized = normalizeTemplateLanguage(nextLanguage)
      setSearchParams(
        (current) => {
          const params = new URLSearchParams(current)
          if (normalized === 'ms-MY') {
            params.set('language', 'ms-MY')
          } else {
            params.delete('language')
          }
          return params
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const handleDelete = async (id) => {
    if (
      !(await dialog.confirm('Are you sure you want to delete this proposal?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      const result = await deleteTemplate('ih', id)
      if (isSuccess(result)) {
        dialog.alert('Proposal deleted successfully.')
        setData((prev) => prev.filter((row) => getTemplateId(row) !== id))
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
      const confirmation = buildExistingBmCopyConfirmation(row, 'this industrial hygiene proposal')
      if (await dialog.confirm(confirmation.message, confirmation.options)) {
        navigate(config.editUrl(row.bmTemplateId))
      }
      return
    }

    const confirmation = buildBmCopyConfirmation(row, 'this industrial hygiene proposal')
    const result = await dialog.confirm(confirmation.message, {
      ...confirmation.options,
      loadingMessage: 'Translating proposal into Bahasa Melayu...',
      successMessage: 'Proposal translated... redirecting to edit proposal page.',
      onConfirm: async () => {
        const response = await createBmCopy('ih', id)
        if (!isSuccess(response)) {
          throw new Error(response?.message || 'Failed to create BM copy.')
        }
        return response
      },
    })
    const bmTemplateId = getTemplateId(result)
    if (bmTemplateId) {
      navigate(config.editUrl(bmTemplateId))
    }
  }

  useEffect(() => {
    loadData()
  }, [loadData])

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex justify-content-between align-items-center gap-3">
            <strong>Industrial Hygiene Proposal Templates</strong>
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
