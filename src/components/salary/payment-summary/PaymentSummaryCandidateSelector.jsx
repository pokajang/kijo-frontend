import React, { useMemo } from 'react'
import {
  CBadge,
  CButton,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CFormTextarea,
  CSpinner,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { formatMoney } from '../salaryCalculations'
import dialog from '../../dialog/dialogService'

const typeLabel = (type) => (type === 'salary_application' ? 'Salary' : 'Other claim')
const priorityTone = { Urgent: 'danger', Normal: 'secondary', Deferred: 'warning' }
const detailUrl = (record) =>
  record.subjectType === 'salary_application'
    ? `/financial/salary-records/${encodeURIComponent(record.subjectId)}`
    : `/financial/other-claim-records/${encodeURIComponent(record.subjectId)}`

const PaymentSummaryCandidateSelector = ({
  records,
  loading,
  selectedKeys,
  onSelectionChange,
  onPreferenceChange,
}) => {
  const [search, setSearch] = React.useState('')
  const [type, setType] = React.useState('')
  const [priority, setPriority] = React.useState('')
  const [editingRecord, setEditingRecord] = React.useState(null)
  const [preferenceDraft, setPreferenceDraft] = React.useState({
    priority: 'Normal',
    deferUntil: '',
    remarks: '',
  })
  const [preferenceSaving, setPreferenceSaving] = React.useState(false)
  const [preferenceError, setPreferenceError] = React.useState('')
  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return records.filter((record) => {
      if (type && record.subjectType !== type) return false
      if (priority && record.priority !== priority) return false
      if (!needle) return true
      return [record.staffName, record.staffCode, record.label, record.period]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    })
  }, [priority, records, search, type])
  const selectable = visible.filter((record) => record.eligible || selectedKeys.has(record.key))
  const allEligible = records.filter((record) => record.eligible || selectedKeys.has(record.key))
  const allVisibleSelected =
    selectable.length > 0 && selectable.every((record) => selectedKeys.has(record.key))
  const selectedRecords = records.filter((record) => selectedKeys.has(record.key))
  const selectedTotal = selectedRecords.reduce(
    (total, record) => total + Number(record.amount || 0),
    0,
  )

  const toggle = (record) => {
    const next = new Set(selectedKeys)
    if (next.has(record.key)) next.delete(record.key)
    else next.add(record.key)
    onSelectionChange(next)
  }
  const toggleVisible = () => {
    const next = new Set(selectedKeys)
    selectable.forEach((record) =>
      allVisibleSelected ? next.delete(record.key) : next.add(record.key),
    )
    onSelectionChange(next)
  }
  const selectAllEligible = async () => {
    const total = allEligible.reduce((sum, record) => sum + Number(record.amount || 0), 0)
    const confirmed = await dialog.confirm(
      `Select all ${allEligible.length} eligible requests totalling ${formatMoney(total)}?`,
      {
        title: 'Select all eligible requests',
        confirmLabel: 'Select all',
      },
    )
    if (!confirmed) return
    onSelectionChange(new Set(allEligible.map((record) => record.key)))
  }
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const startPreferenceEdit = (record) => {
    setEditingRecord(record)
    setPreferenceDraft({
      priority: record.priority || 'Normal',
      deferUntil: record.deferUntil || '',
      remarks: record.priorityRemarks || '',
    })
    setPreferenceError('')
  }
  const savePreference = async () => {
    if (!editingRecord) return
    if (preferenceDraft.priority === 'Deferred' && !preferenceDraft.deferUntil) {
      setPreferenceError('Choose a future defer-until date.')
      return
    }
    setPreferenceSaving(true)
    setPreferenceError('')
    try {
      await onPreferenceChange(editingRecord, {
        priority: preferenceDraft.priority,
        defer_until: preferenceDraft.priority === 'Deferred' ? preferenceDraft.deferUntil : null,
        remarks: preferenceDraft.remarks,
      })
      setEditingRecord(null)
    } catch (error) {
      setPreferenceError(error?.message || 'Could not save payment scheduling.')
    } finally {
      setPreferenceSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="py-4 text-center">
        <CSpinner size="sm" /> Loading approved payment requests…
      </div>
    )
  }

  return (
    <section aria-labelledby="payment-candidate-heading">
      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mb-2">
        <div>
          <h3 id="payment-candidate-heading" className="h6 mb-1">
            Select approved requests
          </h3>
          <p className="small text-body-secondary mb-0">
            Nothing is included automatically. Unselected requests remain in the Finance queue.
          </p>
        </div>
        <div className="d-flex gap-2">
          <CButton
            size="sm"
            variant="outline"
            color="primary"
            onClick={selectAllEligible}
            disabled={!allEligible.length}
          >
            Select all eligible
          </CButton>
          <CButton
            size="sm"
            variant="outline"
            color="primary"
            onClick={toggleVisible}
            disabled={!selectable.length}
          >
            {allVisibleSelected ? 'Clear visible' : 'Select visible'}
          </CButton>
          <CButton
            size="sm"
            variant="ghost"
            color="secondary"
            onClick={() => onSelectionChange(new Set())}
          >
            Clear all
          </CButton>
        </div>
      </div>

      <div className="row g-2 mb-3">
        <div className="col-md-6">
          <CFormInput
            size="sm"
            aria-label="Search approved payment requests"
            placeholder="Search staff, reference, or period"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="col-6 col-md-3">
          <CFormSelect
            size="sm"
            aria-label="Filter payment type"
            value={type}
            onChange={(event) => setType(event.target.value)}
          >
            <option value="">All types</option>
            <option value="salary_application">Salary</option>
            <option value="other_claim_application">Other claims</option>
          </CFormSelect>
        </div>
        <div className="col-6 col-md-3">
          <CFormSelect
            size="sm"
            aria-label="Filter payment priority"
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
          >
            <option value="">All priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="Normal">Normal</option>
            <option value="Deferred">Deferred</option>
          </CFormSelect>
        </div>
      </div>

      {editingRecord && (
        <div className="payment-summary-preference-editor border rounded-3 p-3 mb-3">
          <div className="d-flex align-items-start justify-content-between gap-3 mb-2">
            <div>
              <strong>Payment scheduling</strong>
              <div className="small text-body-secondary">
                {editingRecord.staffName} · {editingRecord.label}
              </div>
            </div>
            <CButton
              size="sm"
              color="secondary"
              variant="ghost"
              disabled={preferenceSaving}
              onClick={() => setEditingRecord(null)}
            >
              Cancel
            </CButton>
          </div>
          <div className="row g-2">
            <div className="col-sm-4">
              <CFormLabel htmlFor="paymentCandidatePriority">Priority</CFormLabel>
              <CFormSelect
                id="paymentCandidatePriority"
                size="sm"
                value={preferenceDraft.priority}
                onChange={(event) =>
                  setPreferenceDraft((value) => ({ ...value, priority: event.target.value }))
                }
              >
                <option>Urgent</option>
                <option>Normal</option>
                <option>Deferred</option>
              </CFormSelect>
            </div>
            {preferenceDraft.priority === 'Deferred' && (
              <div className="col-sm-4">
                <CFormLabel htmlFor="paymentCandidateDeferUntil">Defer until</CFormLabel>
                <CFormInput
                  id="paymentCandidateDeferUntil"
                  type="date"
                  size="sm"
                  min={tomorrow}
                  value={preferenceDraft.deferUntil}
                  onChange={(event) =>
                    setPreferenceDraft((value) => ({
                      ...value,
                      deferUntil: event.target.value,
                    }))
                  }
                />
              </div>
            )}
            <div className={preferenceDraft.priority === 'Deferred' ? 'col-sm-4' : 'col-sm-8'}>
              <CFormLabel htmlFor="paymentCandidateRemarks">Finance remarks</CFormLabel>
              <CFormTextarea
                id="paymentCandidateRemarks"
                rows={1}
                value={preferenceDraft.remarks}
                onChange={(event) =>
                  setPreferenceDraft((value) => ({ ...value, remarks: event.target.value }))
                }
              />
            </div>
          </div>
          {preferenceError && <div className="small text-danger mt-2">{preferenceError}</div>}
          <div className="d-flex justify-content-end mt-2">
            <CButton size="sm" color="primary" disabled={preferenceSaving} onClick={savePreference}>
              Save scheduling
            </CButton>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center small mb-2">
        <span className="text-body-secondary">
          {selectedRecords.length} of {allEligible.length} eligible requests selected
        </span>
        <strong>{formatMoney(selectedTotal)}</strong>
      </div>

      <div className="table-responsive d-none d-md-block payment-summary-candidates">
        <CTable align="middle" small hover>
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell className="payment-summary-candidates__check">
                Select
              </CTableHeaderCell>
              <CTableHeaderCell>Staff</CTableHeaderCell>
              <CTableHeaderCell>Request</CTableHeaderCell>
              <CTableHeaderCell>Approved</CTableHeaderCell>
              <CTableHeaderCell>Priority</CTableHeaderCell>
              <CTableHeaderCell className="text-end">Amount</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {visible.map((record) => (
              <CTableRow
                key={record.key}
                className={!record.eligible && !selectedKeys.has(record.key) ? 'opacity-75' : ''}
              >
                <CTableDataCell>
                  <CFormCheck
                    aria-label={`Select ${record.label} for ${record.staffName}`}
                    checked={selectedKeys.has(record.key)}
                    disabled={!record.eligible && !selectedKeys.has(record.key)}
                    onChange={() => toggle(record)}
                  />
                </CTableDataCell>
                <CTableDataCell>
                  <div>{record.staffName}</div>
                  <small className="text-body-secondary">{record.staffCode}</small>
                </CTableDataCell>
                <CTableDataCell>
                  <div>{record.label}</div>
                  {record.recommendedPriority && (
                    <div className="small mt-1">
                      Recommended: <strong>{record.recommendedPriority}</strong>
                      {record.recommendationRemarks ? ` — ${record.recommendationRemarks}` : ''}
                      {record.recommendedByName ? ` · ${record.recommendedByName}` : ''}
                    </div>
                  )}
                  <small className="text-body-secondary">
                    {typeLabel(record.subjectType)} · {record.period}
                  </small>
                  {record.exclusionReason && (
                    <div className="small text-danger">{record.exclusionReason}</div>
                  )}
                  <CButton
                    size="sm"
                    variant="ghost"
                    color="primary"
                    className="px-0 mt-1"
                    href={detailUrl(record)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    View details
                  </CButton>
                </CTableDataCell>
                <CTableDataCell>
                  <div>
                    {record.approvedAt
                      ? new Date(record.approvedAt).toLocaleDateString('en-MY')
                      : '—'}
                  </div>
                  <small className="text-body-secondary">{record.waitingDays} days waiting</small>
                </CTableDataCell>
                <CTableDataCell>
                  <CButton
                    size="sm"
                    variant="outline"
                    color={priorityTone[record.priority] || 'secondary'}
                    onClick={() => startPreferenceEdit(record)}
                  >
                    {record.priority}
                  </CButton>
                  {record.deferUntil && (
                    <div className="small text-body-secondary mt-1">Until {record.deferUntil}</div>
                  )}
                </CTableDataCell>
                <CTableDataCell className="text-end">{formatMoney(record.amount)}</CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </div>

      <div className="d-grid gap-2 d-md-none">
        {visible.map((record) => (
          <article className="border rounded-3 p-3" key={record.key}>
            <div className="d-flex align-items-start gap-2">
              <CFormCheck
                className="mt-1"
                aria-label={`Select ${record.label} for ${record.staffName}`}
                checked={selectedKeys.has(record.key)}
                disabled={!record.eligible && !selectedKeys.has(record.key)}
                onChange={() => toggle(record)}
              />
              <div className="flex-grow-1 min-w-0">
                <div className="d-flex justify-content-between gap-2">
                  <strong>{record.staffName}</strong>
                  <strong>{formatMoney(record.amount)}</strong>
                </div>
                <div>{record.label}</div>
                <div className="small text-body-secondary">
                  {typeLabel(record.subjectType)} · {record.period} · {record.waitingDays} days
                  waiting
                </div>
                {record.recommendedPriority && (
                  <div className="small mt-1">
                    Recommended: <strong>{record.recommendedPriority}</strong>
                    {record.recommendationRemarks ? ` — ${record.recommendationRemarks}` : ''}
                    {record.recommendedByName ? ` · ${record.recommendedByName}` : ''}
                  </div>
                )}
                <div className="d-flex align-items-center gap-2 mt-2">
                  <CBadge color={priorityTone[record.priority] || 'secondary'}>
                    {record.priority}
                  </CBadge>
                  <CButton
                    size="sm"
                    variant="outline"
                    color="secondary"
                    onClick={() => startPreferenceEdit(record)}
                  >
                    Edit scheduling
                  </CButton>
                </div>
                {record.deferUntil && (
                  <div className="small text-body-secondary mt-1">
                    Deferred until {record.deferUntil}
                  </div>
                )}
                {record.exclusionReason && (
                  <div className="small text-danger mt-1">{record.exclusionReason}</div>
                )}
                <CButton
                  size="sm"
                  variant="ghost"
                  color="primary"
                  className="px-0 mt-1"
                  href={detailUrl(record)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View details
                </CButton>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!visible.length && (
        <p className="text-body-secondary py-3 mb-0">
          No approved payment requests match these filters.
        </p>
      )}
    </section>
  )
}

export default PaymentSummaryCandidateSelector
