import React, { useCallback, useEffect, useState } from 'react'
import { CAlert, CCol, CRow } from '@coreui/react'
import { useNavigate, useParams } from 'react-router-dom'
import LoadingImage from '../../../components/LoadingImage'
import { DataTableDetailShell, DataTableStatusBadge } from '../../../components/datatable'
import { fetchJson, fetchJsonGet, isAbortError } from '../../dashboard/shared/fetchUtils'
import PipelineEntryEditModal from './PipelineEntryEditModal'
import {
  API_BASE,
  classificationLabel,
  formatDate,
  getPipelineEntryPhotoUrl,
  serviceCategoryLabel,
  typeLabel,
} from './pipelineEntryUtils'

const formatCurrency = (value) => {
  if (value === null || value === undefined || value === '') return '-'
  const amount = Number(value)
  if (!Number.isFinite(amount)) return '-'
  return `RM ${amount.toLocaleString('en-MY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`
}

const getEntryTypeTone = (entryType) => {
  if (entryType === 'closed') return 'success'
  if (entryType === 'negotiation' || entryType === 'qualified') return 'info'
  if (entryType === 'proposal') return 'warning'
  if (entryType === 'meeting_pitching') return 'primary'
  return 'secondary'
}

const DetailField = ({ label, value, children }) => (
  <CCol xs={12} md={6} lg={4}>
    <div className="records-detail-field">
      <div className="small text-muted">{label}</div>
      <div>{children || value || '-'}</div>
    </div>
  </CCol>
)

const PipelineEntryProofPanel = ({ entry }) => {
  const src = getPipelineEntryPhotoUrl(entry)
  if (!src) return null

  return (
    <CRow className="g-3">
      <CCol xs={12} md={6} xl={4}>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="d-block text-decoration-none"
          title={entry?.photoOriginalName || 'Screenshot proof'}
        >
          <LoadingImage
            src={src}
            alt={`Screenshot proof for ${entry?.prospectName || 'pipeline entry'}`}
            className="img-fluid rounded border app-proof-image d-block"
            style={{
              width: '100%',
              maxHeight: '360px',
              objectFit: 'contain',
            }}
            placeholderStyle={{ minHeight: 180 }}
          />
        </a>
        <div className="small text-muted text-truncate mt-2" title={entry?.photoOriginalName}>
          {entry?.photoOriginalName || 'Screenshot proof'}
        </div>
      </CCol>
    </CRow>
  )
}

const normalizeEntry = (entry) => ({
  ...entry,
  recordSource: entry.recordSource || 'manual',
  legalAssessmentId: entry.legalAssessmentId || null,
  entryDateDisplay: formatDate(entry.entryDate),
  entryTypeLabel: typeLabel(entry.entryType),
  prospectNameValue: entry.prospectName || '',
  prospectName: entry.prospectName || '-',
  sourceValue: entry.source || '',
  source: entry.source || '-',
  segmentTypeValue: entry.segmentType || '',
  segmentType: classificationLabel(entry.segmentType),
  serviceCategoryValue: entry.serviceCategory || '',
  serviceCategory: serviceCategoryLabel(entry.serviceCategory),
  estimatedRm:
    entry.estimatedRm === null || entry.estimatedRm === undefined
      ? null
      : Number(entry.estimatedRm),
  ownerStaffCode: entry.ownerStaffCode || '-',
  ownerStaffName: entry.ownerStaffName || '',
  notes: entry.notes || '',
})

const PipelineEntryDetailPage = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const [entry, setEntry] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [actionError, setActionError] = useState('')
  const [info, setInfo] = useState('')
  const [editEntry, setEditEntry] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  const loadEntry = useCallback(
    async (signal) => {
      setLoading(true)
      setLoadError('')

      try {
        const response = await fetchJsonGet(
          `${API_BASE}stats/monitoring-manual-pipeline-entry/${encodeURIComponent(id || '')}`,
          {},
          { silentError: true },
          signal,
        )

        if (signal.aborted) return

        if (response?.status === 'success') {
          setEntry(response.entry ? normalizeEntry(response.entry) : null)
        } else {
          setEntry(null)
          setLoadError(response?.message || 'Unable to load pipeline entry.')
        }
      } catch (err) {
        if (isAbortError(err)) return
        setEntry(null)
        setLoadError(err?.message || 'Unable to load pipeline entry.')
      } finally {
        if (signal.aborted) return
        setLoading(false)
      }
    },
    [id],
  )

  useEffect(() => {
    const controller = new AbortController()
    loadEntry(controller.signal)
    return () => controller.abort()
  }, [loadEntry, reloadKey])

  const showInfo = (message) => {
    setInfo(message)
    setTimeout(() => setInfo(''), 10000)
  }

  const showError = (message) => {
    setActionError(message)
    setTimeout(() => setActionError(''), 10000)
  }

  const deleteEntry = async () => {
    if (!entry?.id) return
    if (!window.confirm(`Delete ${entry.prospectName}?`)) return

    setActionError('')
    setInfo('')

    try {
      const response = await fetchJson(
        `${API_BASE}stats/monitoring-manual-pipeline-entry/${entry.id}`,
        { method: 'DELETE' },
      )

      if (response?.status === 'success') {
        showInfo('Pipeline entry deleted.')
        navigate('/pipeline/entries')
      } else {
        showError(response?.message || 'Unable to delete pipeline entry.')
      }
    } catch (err) {
      showError(err?.message || 'Unable to delete pipeline entry.')
    }
  }

  const handleEditSaved = () => {
    setEditEntry(null)
    setActionError('')
    showInfo('Pipeline entry updated.')
    setReloadKey((key) => key + 1)
  }

  const actions = entry
    ? entry.recordSource === 'legal_compliance'
      ? [
          {
            key: 'view-assessment',
            label: 'View Assessment',
            onClick: () =>
              navigate(
                `/internal-tools/legal-compliance?assessmentId=${encodeURIComponent(
                  entry.legalAssessmentId,
                )}&mode=review`,
              ),
          },
        ]
      : [
          entry.canUpdate || entry.canDelete
            ? {
                key: 'edit',
                label: 'Edit',
                onClick: () => setEditEntry(entry),
              }
            : null,
          entry.canDelete
            ? {
                key: 'delete',
                label: 'Delete',
                danger: true,
                onClick: deleteEntry,
              }
            : null,
        ].filter(Boolean)
    : []

  return (
    <>
      {info && (
        <CAlert color="success" dismissible onClose={() => setInfo('')} className="mb-3">
          {info}
        </CAlert>
      )}
      {actionError && (
        <CAlert color="danger" dismissible onClose={() => setActionError('')} className="mb-3">
          {actionError}
        </CAlert>
      )}

      <DataTableDetailShell
        title="Pipeline Entry Details"
        backLabel="Back"
        onBack={() => navigate('/pipeline/entries')}
        loading={loading}
        error={loadError}
        record={entry}
        actions={actions}
        beforeActions={entry?.photoUrl ? <PipelineEntryProofPanel entry={entry} /> : null}
        beforeActionsTitle="Screenshot Proof"
        emptyMessage="Pipeline entry not found."
      >
        <CRow className="g-3">
          <DetailField label="Prospect" value={entry?.prospectName} />
          <DetailField label="Type">
            <DataTableStatusBadge tone={getEntryTypeTone(entry?.entryType)}>
              {entry?.entryTypeLabel || '-'}
            </DataTableStatusBadge>
          </DetailField>
          <DetailField label="Date" value={entry?.entryDateDisplay} />
          <DetailField label="Source" value={entry?.source} />
          <DetailField label="Classification" value={entry?.segmentType} />
          <DetailField label="Service" value={entry?.serviceCategory} />
          <DetailField label="Estimated RM" value={formatCurrency(entry?.estimatedRm)} />
          <DetailField label="Owner Code" value={entry?.ownerStaffCode} />
          <DetailField label="Owner Name" value={entry?.ownerStaffName} />
          <DetailField label="Created By" value={entry?.createdByCode} />
          <DetailField label="Created At" value={entry?.createdAt} />
          <DetailField label="Screenshot" value={entry?.photoUrl ? 'Available' : '-'} />
          <CCol xs={12}>
            <div className="records-detail-field">
              <div className="small text-muted">Notes</div>
              <div>{entry?.notes || '-'}</div>
            </div>
          </CCol>
        </CRow>
      </DataTableDetailShell>

      <PipelineEntryEditModal
        visible={Boolean(editEntry)}
        entry={editEntry}
        onClose={() => setEditEntry(null)}
        onSaved={handleEditSaved}
      />
    </>
  )
}

export default PipelineEntryDetailPage
