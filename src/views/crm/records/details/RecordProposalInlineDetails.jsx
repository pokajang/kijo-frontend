import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CBadge, CButton, CCardBody, CCardHeader, CCol, CRow } from '@coreui/react'
import { DataTableLoadingState } from '../../../../components/datatable'
import {
  buildTrainingDisplayTitle,
  normalizeTrainingTemplateRow,
} from '../../../templates/list-training/trainingTemplateUtils'
import { getTemplate } from '../../../templates/shared/templateApi'
import {
  normalizeTemplateRow,
  sanitizeDisplayHtml,
  templateConfigs,
  unwrapRows,
} from '../../../templates/shared/templateProposalUtils'
import {
  canPreviewRecordProposal,
  getRecordProposal,
  getRecordProposalChipText,
  getRecordProposalLanguageLabel,
  isProposalAttached,
} from '../utils/recordProposal'

const languageLabels = {
  en: 'English',
  'ms-MY': 'Bahasa Melayu',
}

const trainingSections = [
  ['Introduction', 'introduction'],
  ['Objectives', 'objectives'],
  ['Modules', 'modules'],
  ['Training Requirements', 'trainingRequirements'],
  ['Additional Requirements', 'additionalRequirements'],
  ['Training Materials', 'trainingMaterials'],
  ['Lecture Medium', 'lectureMedium'],
]

const normalizeProposalRecord = (type, row) => {
  if (!row) return null
  return type === 'training' ? normalizeTrainingTemplateRow(row) : normalizeTemplateRow(row, type)
}

const getProposalSections = (type) =>
  type === 'training' ? trainingSections : templateConfigs[type]?.sections || []

const getProposalLanguageLabel = (record, fallback = '') => {
  const language = record?.proposalLanguage || record?.proposal_language || fallback || ''
  return languageLabels[language] || language || '-'
}

const DetailField = ({ label, value }) => (
  <CCol xs={12} md={6} lg={4}>
    <div className="records-detail-field records-detail-field--inline">
      <div className="small text-muted records-detail-label">{label}</div>
      <div className="records-detail-value">{value || '-'}</div>
    </div>
  </CCol>
)

const HtmlSection = ({ title, value }) => {
  if (!value) return null

  return (
    <section className="records-detail-section mt-4">
      <h6 className="mb-2">{title}</h6>
      <div
        className="records-detail-rich-text"
        dangerouslySetInnerHTML={{
          __html: sanitizeDisplayHtml(value) || '<em>No content provided.</em>',
        }}
      />
    </section>
  )
}

const RecordProposalInlineDetails = ({ record }) => {
  const [expanded, setExpanded] = useState(false)
  const [proposalRecord, setProposalRecord] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const proposal = getRecordProposal(record)
  const proposalType = proposal.templateType
  const proposalId = proposal.templateId
  const attachedProposal = isProposalAttached(record)
  const quoteProposalLanguage = getRecordProposalLanguageLabel(record)
  const canLoadProposal = canPreviewRecordProposal(record)
  const proposalChipText = getRecordProposalChipText(record)

  const loadProposal = useCallback(
    async (signal) => {
      if (!canLoadProposal) return
      setLoading(true)
      setError('')

      try {
        const response = await getTemplate(proposalType, proposalId, { signal })
        if (signal.aborted) return

        const nextRecord =
          unwrapRows(response)
            .map((row) => normalizeProposalRecord(proposalType, row))
            .find(Boolean) || null

        setProposalRecord(nextRecord)
        if (!nextRecord) {
          setError('Linked proposal template was not found.')
        }
      } catch (err) {
        if (signal.aborted) return
        setProposalRecord(null)
        setError(err?.message || 'Unable to load linked proposal template.')
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    },
    [canLoadProposal, proposalId, proposalType],
  )

  useEffect(() => {
    setExpanded(false)
    setProposalRecord(null)
    setError('')
  }, [proposalId, proposalType])

  useEffect(() => {
    if (!expanded || proposalRecord || !canLoadProposal) return undefined

    const controller = new AbortController()
    loadProposal(controller.signal)
    return () => controller.abort()
  }, [canLoadProposal, expanded, loadProposal, proposalRecord])

  const proposalTitle = useMemo(() => {
    if (!proposalRecord) return ''
    if (proposalType === 'training') return buildTrainingDisplayTitle(proposalRecord)
    return proposalRecord.title || proposalRecord.serviceTitle || proposalRecord.ihTitle || ''
  }, [proposalRecord, proposalType])

  const fields = useMemo(() => {
    if (!proposalRecord) return []

    const commonFields = [
      ['Title', proposalTitle],
      ['Code', proposalRecord.trainingCode || proposalRecord.serviceCode],
      [
        'Language',
        getProposalLanguageLabel(proposalRecord, quoteProposalLanguage || record?.proposalLanguage),
      ],
      ['Date Created', proposalRecord.dateCreated],
    ]

    if (proposalType === 'training') {
      return [
        ...commonFields,
        ['Duration', proposalRecord.durationLabel],
        ['HRD Program Number', proposalRecord.hrdNo],
        ['Last Edited By', proposalRecord.editedBy],
      ]
    }

    return [
      ...commonFields,
      ['Created By', proposalRecord.createdBy],
      ...(proposalType === 'special'
        ? [['Attachments', String(proposalRecord.attachmentsCount || 0)]]
        : []),
    ]
  }, [proposalRecord, proposalTitle, proposalType, quoteProposalLanguage, record?.proposalLanguage])

  return (
    <>
      <CCardHeader className="records-detail-section-header">
        <h2 className="h6 mb-0">Proposal</h2>
      </CCardHeader>
      <CCardBody>
        <div className="d-flex flex-column align-items-start gap-2">
          <CBadge
            color={attachedProposal ? 'success' : 'secondary'}
            className="text-start text-wrap"
          >
            {proposalChipText}
          </CBadge>
          {canLoadProposal ? (
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded ? 'Hide Detail Proposal' : 'Show Detail Proposal'}
            </CButton>
          ) : null}
        </div>

        {expanded ? (
          <div className="mt-3">
            {loading ? (
              <DataTableLoadingState message="Loading proposal details..." />
            ) : error ? (
              <CAlert color="warning" className="mb-0">
                {error}
              </CAlert>
            ) : proposalRecord ? (
              <>
                <CRow className="g-3">
                  {fields.map(([label, value]) => (
                    <DetailField key={label} label={label} value={value} />
                  ))}
                </CRow>
                {getProposalSections(proposalType).map(([title, field]) => (
                  <HtmlSection key={field} title={title} value={proposalRecord?.[field]} />
                ))}
              </>
            ) : null}
          </div>
        ) : null}
      </CCardBody>
    </>
  )
}

export default RecordProposalInlineDetails
