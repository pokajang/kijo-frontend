import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CButton, CCol, CRow } from '@coreui/react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailShell, DataTableEmbeddedList } from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import {
  createBmCopy,
  deleteTemplate,
  getTemplate,
  isAbortError,
  listTemplates,
} from '../shared/templateApi'
import {
  TRAINING_LIST_PATH,
  attachBmCopyLinks,
  buildBmCopyConfirmation,
  buildExistingBmCopyConfirmation,
  buildTrainingDisplayTitle,
  getTemplateId,
  getTrainingEditUrl,
  getTrainingPdfUrl,
  getTrainingWordUrl,
  isSuccess,
  normalizeTrainingTemplateRow,
  sanitizeDisplayHtml,
  unwrapRows,
} from './trainingTemplateUtils'
import { getProposalListPath } from '../proposals/proposalTabs'
import { getDetailReturnTo } from '../../../utils/navigation/returnTo'
import { downloadWordDocument } from '../../../utils/documents/downloadWordDocument'

const DetailField = ({ label, value, children }) => (
  <CCol xs={12} md={6} lg={4}>
    <div className="records-detail-field records-detail-field--inline">
      <div className="small text-muted records-detail-label">{label}</div>
      <div className="records-detail-value">{children || value || '-'}</div>
    </div>
  </CCol>
)

const HtmlSection = ({ title, value }) => (
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

const groupAgendaByDay = (agenda = []) =>
  agenda.reduce((acc, item) => {
    const day = Number(item?.day) || 1
    acc[day] = acc[day] || []
    acc[day].push(item)
    return acc
  }, {})

const formatTime = (value) => String(value || '').slice(0, 5) || '-'

const historyColumns = [
  {
    key: 'created_at',
    label: 'Date',
    headerClassName: 'text-center',
    cellClassName: 'text-center',
    headerStyle: { width: '180px' },
    render: (row) => row.created_at || '-',
  },
  {
    key: 'created_by_code',
    label: 'By',
    headerStyle: { width: '140px' },
    render: (row) => row.created_by_code || 'N/A',
  },
  {
    key: 'remarks',
    label: 'Remarks',
    render: (row) =>
      (row.remarks || '-')
        .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
        .replace(/<br\s*\/?>/g, ' ')
        .replace(/<\/?[^>]+>/g, '')
        .replace(/\n/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ')
        .trim() || '-',
  },
]

const agendaColumns = [
  {
    key: 'time',
    label: 'Time',
    headerClassName: 'text-center',
    cellClassName: 'text-center',
    headerStyle: { width: '180px' },
    render: (row) => `${formatTime(row.start_time)} - ${formatTime(row.end_time)}`,
  },
  {
    key: 'topic',
    label: 'Topic',
    render: (row) => (
      <span
        dangerouslySetInnerHTML={{
          __html: sanitizeDisplayHtml(row.topic) || '-',
        }}
      />
    ),
  },
]

const TrainingProposalDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [record, setRecord] = useState(null)
  const returnTo = getDetailReturnTo(
    location,
    getProposalListPath('training', record?.proposalLanguage),
  )
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [showAllHistory, setShowAllHistory] = useState(false)

  const loadRecord = useCallback(
    async (signal) => {
      setLoading(true)
      setLoadError('')

      try {
        const response = await getTemplate('training', id, { signal })

        if (signal.aborted) return

        let nextRecord = unwrapRows(response).map(normalizeTrainingTemplateRow)[0] || null
        if (nextRecord?.proposalLanguage !== 'ms-MY') {
          const bmResponse = await listTemplates('training', { language: 'ms-MY', signal })
          if (signal.aborted) return
          const linkedRows = attachBmCopyLinks([nextRecord], unwrapRows(bmResponse))
          nextRecord = linkedRows.map(normalizeTrainingTemplateRow)[0] || nextRecord
        }
        setRecord(nextRecord)
        if (!nextRecord) {
          setLoadError('Training proposal template not found.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setRecord(null)
        setLoadError(err?.message || 'Unable to load training proposal template.')
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    },
    [id],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadRecord(controller.signal)
    return () => controller.abort()
  }, [loadRecord])

  const deleteRecord = async () => {
    const templateId = getTemplateId(record)
    if (!templateId) return
    if (
      !(await dialog.confirm('Are you sure you want to delete this proposal?', {
        confirmText: 'Delete',
        confirmColor: 'danger',
      }))
    )
      return

    setActionError('')

    try {
      const response = await deleteTemplate('training', templateId)

      if (!isSuccess(response)) {
        setActionError(response?.message || 'Unable to delete training proposal template.')
        return
      }

      navigate(returnTo, { replace: true })
    } catch (err) {
      setActionError(err?.message || 'Unable to delete training proposal template.')
    }
  }

  const createBmProposal = async () => {
    const templateId = getTemplateId(record)
    if (!templateId) return

    if (record?.hasBmCopy && record?.bmTemplateId) {
      const confirmation = buildExistingBmCopyConfirmation(record, 'this training proposal')
      if (await dialog.confirm(confirmation.message, confirmation.options)) {
        navigate(getTrainingEditUrl(record.bmTemplateId), {
          state: { returnTo: `${location.pathname}${location.search}` },
        })
      }
      return
    }

    const confirmation = buildBmCopyConfirmation(record, 'this training proposal')
    setActionError('')

    const result = await dialog.confirm(confirmation.message, {
      ...confirmation.options,
      loadingMessage: 'Translating proposal into Bahasa Melayu...',
      successMessage: 'Proposal translated... redirecting to edit proposal page.',
      onConfirm: async () => {
        const response = await createBmCopy('training', templateId)
        if (!isSuccess(response)) {
          throw new Error(response?.message || 'Unable to create BM training proposal copy.')
        }
        return response
      },
    })

    const bmTemplateId = getTemplateId(result)
    if (bmTemplateId) {
      navigate(getTrainingEditUrl(bmTemplateId), {
        state: { returnTo: `${location.pathname}${location.search}` },
      })
    }
  }

  const actions = record
    ? [
        {
          key: 'export',
          label: 'Export Brochure',
          onClick: () => window.open(getTrainingPdfUrl(record.templateId), '_blank'),
        },
        {
          key: 'word',
          label: 'Generate Word Brochure',
          onClick: () =>
            downloadWordDocument(
              getTrainingWordUrl(record.templateId),
              `training-proposal-${record.templateId}.docx`,
            ),
        },
        ...(record.proposalLanguage !== 'ms-MY'
          ? [
              {
                key: 'bm-copy',
                label: record.hasBmCopy ? 'Open BM Proposal' : 'Create BM Proposal',
                onClick: createBmProposal,
              },
            ]
          : []),
        {
          key: 'edit',
          label: 'Edit',
          onClick: () =>
            navigate(getTrainingEditUrl(record.templateId), {
              state: { returnTo: `${location.pathname}${location.search}` },
            }),
        },
        {
          key: 'delete',
          label: 'Delete',
          danger: true,
          onClick: deleteRecord,
        },
      ]
    : []

  const agendaByDay = useMemo(() => groupAgendaByDay(record?.agenda || []), [record?.agenda])
  const historyRows = useMemo(
    () => (Array.isArray(record?.history) ? record.history : []),
    [record?.history],
  )
  const visibleHistoryRows = showAllHistory ? historyRows : historyRows.slice(0, 2)
  const hiddenHistoryCount = Math.max(0, historyRows.length - 2)
  const dayKeys = useMemo(
    () =>
      Object.keys(agendaByDay)
        .map((key) => Number(key))
        .sort((a, b) => a - b),
    [agendaByDay],
  )

  return (
    <>
      {actionError && (
        <CAlert color="danger" dismissible onClose={() => setActionError('')} className="mb-3">
          {actionError}
        </CAlert>
      )}

      <DataTableDetailShell
        title="Training Proposal Details"
        backLabel="Back"
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={loadError}
        record={record}
        actions={actions}
        emptyMessage="Training proposal template not found."
      >
        <CRow className="g-3">
          <DetailField label="Title" value={record?.title} />
          <DetailField label="Code" value={record?.trainingCode} />
          <DetailField label="Duration" value={record?.durationLabel} />
          <DetailField label="HRD Program Number" value={record?.hrdNo} />
          <DetailField label="Date Created" value={record?.dateCreated} />
          <DetailField label="Last Edited By" value={record?.editedBy} />
          <CCol xs={12}>
            <div className="records-detail-field records-detail-field--inline">
              <div className="small text-muted records-detail-label">Template Summary</div>
              <div className="records-detail-value">{buildTrainingDisplayTitle(record)}</div>
            </div>
          </CCol>
        </CRow>

        {historyRows.length > 0 && (
          <section className="records-detail-section mt-4">
            <div className="d-flex align-items-center gap-2 flex-wrap mb-2">
              <h6 className="mb-0">Metadata / History</h6>
              {hiddenHistoryCount > 0 && (
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  className="training-history-toggle-badge"
                  onClick={() => setShowAllHistory((current) => !current)}
                >
                  {showAllHistory ? 'Hide' : 'Show more'}
                </CButton>
              )}
            </div>
            <DataTableEmbeddedList
              rows={visibleHistoryRows}
              columns={historyColumns}
              tableClassName="training-history-table"
              mobileClassName="training-history-mobile-list"
              getRowKey={(row, index) => row.id || index}
              renderMobileItem={(row, index) => (
                <div className="records-mobile-card" role="listitem">
                  <div className="records-mobile-main-row">
                    <span className="records-mobile-index">#{index + 1}</span>
                    <span className="records-mobile-title">{row.created_at || '-'}</span>
                  </div>
                  <div className="records-mobile-meta">{row.created_by_code || 'N/A'}</div>
                  <div className="records-mobile-subtitle">
                    {(row.remarks || '-')
                      .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
                      .replace(/<br\s*\/?>/g, ' ')
                      .replace(/<\/?[^>]+>/g, '')
                      .replace(/\n/g, ' ')
                      .replace(/&nbsp;/g, ' ')
                      .replace(/\s+/g, ' ')
                      .trim() || '-'}
                  </div>
                </div>
              )}
            />
          </section>
        )}

        <HtmlSection title="Introduction" value={record?.introduction} />
        <HtmlSection title="Objectives" value={record?.objectives} />
        {record?.modules && <HtmlSection title="Modules" value={record.modules} />}

        {(record?.methodTheoryDesc || record?.methodPracticalDesc) && (
          <section className="records-detail-section mt-4">
            <h6 className="mb-2">Training Methodology</h6>
            <CRow className="g-3">
              <DetailField label="Theory Method" value={record?.methodTheoryDesc} />
              <DetailField label="Practical Method" value={record?.methodPracticalDesc} />
            </CRow>
          </section>
        )}

        {(record?.trainingRequirements || record?.additionalRequirements) && (
          <section className="records-detail-section mt-4">
            <h6 className="mb-2">Training Requirements</h6>
            <CRow className="g-3">
              <DetailField label="Requirements" value={record?.trainingRequirements} />
              <DetailField label="Additional Requirements" value={record?.additionalRequirements} />
            </CRow>
          </section>
        )}

        {record?.trainingMaterials && (
          <HtmlSection title="Training Materials" value={record.trainingMaterials} />
        )}
        {record?.lectureMedium && (
          <HtmlSection title="Lecture Medium" value={record.lectureMedium} />
        )}

        {dayKeys.length > 0 && (
          <section className="records-detail-section mt-4">
            <h6 className="mb-2">Tentative Program</h6>
            {dayKeys.map((day) => (
              <div key={day} className="mb-3">
                {dayKeys.length > 1 && <div className="fw-semibold mb-2">Day {day}</div>}
                <DataTableEmbeddedList
                  rows={agendaByDay[day]}
                  columns={agendaColumns}
                  tableClassName="training-history-table"
                  mobileClassName="training-history-mobile-list"
                  getRowKey={(row, index) => row.id || `${day}-${index}`}
                  renderMobileItem={(row) => (
                    <div
                      className="records-mobile-card training-agenda-mobile-card"
                      role="listitem"
                    >
                      <div className="training-detail-mobile-row">
                        <span className="training-detail-mobile-label">Time</span>
                        <span className="training-detail-mobile-value">
                          {formatTime(row.start_time)} - {formatTime(row.end_time)}
                        </span>
                      </div>
                      <div className="training-detail-mobile-row training-detail-mobile-row--top">
                        <span className="training-detail-mobile-label">Topic</span>
                        <span
                          className="training-detail-mobile-value"
                          dangerouslySetInnerHTML={{
                            __html: sanitizeDisplayHtml(row.topic) || '-',
                          }}
                        />
                      </div>
                    </div>
                  )}
                />
              </div>
            ))}
          </section>
        )}
      </DataTableDetailShell>
    </>
  )
}

export default TrainingProposalDetailPage
