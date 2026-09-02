import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CButton, CCol, CRow } from '@coreui/react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { DataTableDetailShell, DataTableEmbeddedList } from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import AttachmentsModal from '../list-special/AttachmentsModal'
import {
  createBmCopy,
  deleteTemplate,
  getTemplate,
  isAbortError,
  listTemplates,
} from './templateApi'
import {
  attachBmCopyLinks,
  buildBmCopyConfirmation,
  buildExistingBmCopyConfirmation,
  getTemplateId,
  getTemplatePdfUrl,
  getTemplateWordUrl,
  isSuccess,
  normalizeTemplateRow,
  sanitizeDisplayHtml,
  templateConfigs,
  unwrapRows,
} from './templateProposalUtils'
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

const cleanRemarks = (value) =>
  (value || '-')
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, '')
    .replace(/<br\s*\/?>/g, ' ')
    .replace(/<\/?[^>]+>/g, '')
    .replace(/\n/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim() || '-'

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
    render: (row) => cleanRemarks(row.remarks),
  },
]

const TemplateProposalDetailPage = ({ type }) => {
  const config = templateConfigs[type]
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [record, setRecord] = useState(null)
  const returnTo = getDetailReturnTo(location, getProposalListPath(type, record?.proposalLanguage))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [showAllHistory, setShowAllHistory] = useState(false)
  const [showAttachModal, setShowAttachModal] = useState(false)

  const loadRecord = useCallback(
    async (signal) => {
      setLoading(true)
      setLoadError('')

      try {
        const response = await getTemplate(type, id, { signal })

        if (signal.aborted) return

        let nextRecord =
          unwrapRows(response).map((row) => normalizeTemplateRow(row, type))[0] || null
        if (nextRecord?.proposalLanguage !== 'ms-MY') {
          const bmResponse = await listTemplates(type, { language: 'ms-MY', signal })
          if (signal.aborted) return
          const linkedRows = attachBmCopyLinks([nextRecord], unwrapRows(bmResponse))
          nextRecord = linkedRows.map((row) => normalizeTemplateRow(row, type))[0] || nextRecord
        }
        setRecord(nextRecord)
        if (!nextRecord) {
          setLoadError(`${config.titleFallback} template not found.`)
        }
      } catch (err) {
        if (isAbortError(err)) return
        setRecord(null)
        if (err?.notFound || err?.status === 404) return
        setLoadError(
          err?.message || `Unable to load ${config.titleFallback.toLowerCase()} template.`,
        )
      } finally {
        if (!signal.aborted) {
          setLoading(false)
        }
      }
    },
    [config.titleFallback, id, type],
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
      const response = await deleteTemplate(type, templateId)

      if (!isSuccess(response)) {
        setActionError(
          response?.message || `Unable to delete ${config.titleFallback.toLowerCase()} template.`,
        )
        return
      }

      navigate(returnTo, { replace: true })
    } catch (err) {
      setActionError(
        err?.message || `Unable to delete ${config.titleFallback.toLowerCase()} template.`,
      )
    }
  }

  const createBmProposal = async () => {
    const templateId = getTemplateId(record)
    if (!templateId) return

    if (record?.hasBmCopy && record?.bmTemplateId) {
      const confirmation = buildExistingBmCopyConfirmation(
        record,
        config.titleFallback.toLowerCase(),
      )
      if (await dialog.confirm(confirmation.message, confirmation.options)) {
        navigate(config.editUrl(record.bmTemplateId), {
          state: { returnTo: `${location.pathname}${location.search}` },
        })
      }
      return
    }

    const confirmation = buildBmCopyConfirmation(record, config.titleFallback.toLowerCase())
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

    setActionError('')

    const result = await dialog.confirm(confirmation.message, {
      ...options,
      loadingMessage: 'Translating proposal into Bahasa Melayu...',
      successMessage: 'Proposal translated... redirecting to edit proposal page.',
      onConfirm: async () => {
        const response = await createBmCopy(type, templateId)
        if (!isSuccess(response)) {
          throw new Error(response?.message || `Unable to create BM ${config.titleFallback}.`)
        }
        return response
      },
    })

    const bmTemplateId =
      type === 'special' ? getBmTemplateIdFromResponse(result) : getTemplateId(result)
    if (bmTemplateId) {
      navigate(config.editUrl(bmTemplateId), {
        state: { returnTo: `${location.pathname}${location.search}` },
      })
    }
  }

  const actions = record
    ? [
        {
          key: 'export',
          label: config.exportLabel,
          onClick: () => window.open(getTemplatePdfUrl(type, record.templateId), '_blank'),
        },
        ...(type !== 'special' || record.proposalMode === 'write'
          ? [
              {
                key: 'word',
                label: type === 'ih' ? 'Generate Word Brochure' : 'Generate Word Proposal',
                onClick: () =>
                  downloadWordDocument(
                    getTemplateWordUrl(type, record.templateId),
                    `${type}-proposal-${record.templateId}.docx`,
                  ),
              },
            ]
          : []),
        ...(record.proposalLanguage !== 'ms-MY'
          ? [
              {
                key: 'bm-copy',
                label: record.hasBmCopy ? 'Open BM Proposal' : 'Create BM Proposal',
                onClick: createBmProposal,
              },
            ]
          : []),
        ...(type === 'special' && record.attachmentsCount > 0
          ? [
              {
                key: 'attachments',
                label: `View Attachments (${record.attachmentsCount})`,
                onClick: () => setShowAttachModal(true),
              },
            ]
          : []),
        {
          key: 'edit',
          label: 'Edit',
          onClick: () =>
            navigate(config.editUrl(record.templateId), {
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

  const historyRows = useMemo(
    () => (Array.isArray(record?.history) ? record.history : []),
    [record?.history],
  )
  const visibleHistoryRows = showAllHistory ? historyRows : historyRows.slice(0, 2)
  const hiddenHistoryCount = Math.max(0, historyRows.length - 2)

  return (
    <>
      {actionError && (
        <CAlert color="danger" dismissible onClose={() => setActionError('')} className="mb-3">
          {actionError}
        </CAlert>
      )}

      <DataTableDetailShell
        title={config.detailTitle}
        backLabel="Back"
        onBack={() => navigate(returnTo)}
        loading={loading}
        error={loadError}
        record={record}
        actions={actions}
        emptyMessage={`${config.titleFallback} template not found.`}
      >
        <CRow className="g-3">
          <DetailField label="Title" value={record?.title} />
          <DetailField label="Code" value={record?.serviceCode} />
          {type === 'special' && <DetailField label="Category" value={record?.categoryName} />}
          <DetailField label="Date Created" value={record?.dateCreated} />
          <DetailField label="Created By" value={record?.createdBy} />
          {type === 'special' && (
            <DetailField label="Attachments" value={String(record?.attachmentsCount || 0)} />
          )}
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
                  className="template-history-toggle-badge"
                  onClick={() => setShowAllHistory((current) => !current)}
                >
                  {showAllHistory ? 'Hide' : 'Show more'}
                </CButton>
              )}
            </div>
            <DataTableEmbeddedList
              rows={visibleHistoryRows}
              columns={historyColumns}
              tableClassName="template-detail-embedded-table"
              mobileClassName="template-detail-mobile-list"
              getRowKey={(row, index) => row.id || index}
              renderMobileItem={(row, index) => (
                <div className="records-mobile-card" role="listitem">
                  <div className="records-mobile-main-row">
                    <span className="records-mobile-index">#{index + 1}</span>
                    <span className="records-mobile-title">{row.created_at || '-'}</span>
                  </div>
                  <div className="records-mobile-meta">{row.created_by_code || 'N/A'}</div>
                  <div className="records-mobile-subtitle">{cleanRemarks(row.remarks)}</div>
                </div>
              )}
            />
          </section>
        )}

        {config.sections.map(([sectionTitle, field]) =>
          record?.[field] ? (
            <HtmlSection key={field} title={sectionTitle} value={record[field]} />
          ) : null,
        )}
      </DataTableDetailShell>

      {type === 'special' && (
        <AttachmentsModal
          visible={showAttachModal}
          attachments={record?.attachments || []}
          onClose={() => setShowAttachModal(false)}
        />
      )}
    </>
  )
}

export default TemplateProposalDetailPage
