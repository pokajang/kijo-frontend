import React from 'react'
import {
  CButton,
  CCol,
  CFormCheck,
  CFormLabel,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import {
  DataTableActionMenu,
  DataTableEmbeddedList,
  DataTableStatusBadge,
} from '../../../components/datatable'
import { sanitizeDisplayHtml } from '../../templates/shared/templateUtils'

export const sanitizeMeetingRichHtml = (value) => sanitizeDisplayHtml(value) || '<p>-</p>'

export default function MeetingMinuteViewMode({
  form,
  recordMeta,
  guestAttendeeLines,
  canManageVerification,
  verifyButtonAction,
  verifyButtonLabel,
  disableVerifyButton,
  concurButtonAction,
  concurButtonLabel,
  disableConcurButton,
  onMeetingVerificationAction,
  normalizeActionStatus,
  getActionStatusColor,
  actionStatusUpdatingKey,
  resolvePicLabel,
  formatDateTime,
  onUpdateActionStatus,
  canUpdateActionStatus,
  onEditActionItems,
  showHistory,
  onToggleHistory,
  formatChangedFieldLabels,
}) {
  const [expandedActionItemKey, setExpandedActionItemKey] = React.useState(null)

  const getActionStatusTone = (status) => {
    const color = getActionStatusColor(status)
    if (color === 'success') return 'success'
    if (color === 'danger') return 'danger'
    if (color === 'warning') return 'warning'
    return 'info'
  }

  const renderActionItemMenu = (item, idx, status, isUpdating, actionKey) => {
    const canUpdate = typeof canUpdateActionStatus === 'function' && canUpdateActionStatus(item)
    return (
      <DataTableActionMenu
        record={item}
        actionKey={actionKey}
        ariaLabel="Action item actions"
        actions={[
          {
            key: 'toggle-status',
            label: status === 'Done' ? 'Mark Pending' : 'Mark Done',
            disabled: isUpdating || !canUpdate,
            tooltip: !canUpdate ? 'You are not eligible to update this action item.' : undefined,
            onClick: () => onUpdateActionStatus(item, idx, status === 'Done' ? 'Pending' : 'Done'),
          },
          {
            key: 'edit',
            label: 'Edit Action Items',
            onClick: onEditActionItems,
          },
        ]}
      />
    )
  }

  const getActionItemKey = (item, idx) => (item?.itemId ? String(item.itemId) : `idx-${idx}`)

  const actionItemColumns = [
    {
      key: 'index',
      label: '#',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (_item, idx) => idx + 1,
    },
    {
      key: 'action',
      label: 'Action',
      render: (item) => item.actionText || '-',
    },
    {
      key: 'pic',
      label: 'PIC',
      render: (item) => resolvePicLabel(item),
    },
    {
      key: 'dueDate',
      label: 'Due Date',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (item) => item.dueDate || '-',
    },
    {
      key: 'status',
      label: 'Status',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (item) => {
        const status = normalizeActionStatus(item?.status || 'Pending')
        return (
          <DataTableStatusBadge tone={getActionStatusTone(status)}>{status}</DataTableStatusBadge>
        )
      },
    },
    {
      key: 'updated',
      label: 'Updated',
      headerClassName: 'text-center',
      cellClassName: 'text-center',
      render: (item) => (
        <>
          <div>{item.updatedCode || item.createdCode || '-'}</div>
          <small className="text-muted">{formatDateTime(item.updatedAt || item.createdAt)}</small>
        </>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      headerClassName: 'text-end',
      cellClassName: 'text-end',
      render: (item, idx) => {
        const status = normalizeActionStatus(item?.status || 'Pending')
        const itemKey = getActionItemKey(item, idx)
        const isUpdating = actionStatusUpdatingKey === itemKey
        return renderActionItemMenu(item, idx, status, isUpdating, `meeting-action-item-${itemKey}`)
      },
    },
  ]

  const renderMobileActionItem = (item, idx) => {
    const status = normalizeActionStatus(item?.status || 'Pending')
    const itemKey = getActionItemKey(item, idx)
    const isUpdating = actionStatusUpdatingKey === itemKey
    const isExpanded = expandedActionItemKey === itemKey

    return (
      <div className="records-mobile-item meeting-detail-action-item">
        <div className="records-mobile-item-head">
          <button
            type="button"
            className="records-mobile-item-main btn btn-link p-0 text-start text-decoration-none"
            aria-expanded={isExpanded}
            onClick={() => toggleExpandedActionItem(itemKey)}
          >
            <div className="d-flex align-items-center gap-2 flex-wrap">
              <span className="records-mobile-row-index text-muted">#{idx + 1}</span>
              <span className="records-mobile-quote-id">{item.actionText || '-'}</span>
            </div>
            {isExpanded && (
              <div className="meeting-detail-action-inline mt-2">
                <div className="records-mobile-kv">
                  <span className="records-mobile-k">Status</span>
                  <span className="records-mobile-v">
                    <DataTableStatusBadge tone={getActionStatusTone(status)}>
                      {status}
                    </DataTableStatusBadge>
                  </span>
                </div>
                <div className="records-mobile-kv">
                  <span className="records-mobile-k">PIC</span>
                  <span className="records-mobile-v">{resolvePicLabel(item)}</span>
                </div>
                <div className="records-mobile-kv">
                  <span className="records-mobile-k">Due Date</span>
                  <span className="records-mobile-v">{item.dueDate || '-'}</span>
                </div>
                <div className="records-mobile-kv">
                  <span className="records-mobile-k">Updated</span>
                  <span className="records-mobile-v">
                    {item.updatedCode || item.createdCode || '-'}
                    <br />
                    <small className="text-muted">
                      {formatDateTime(item.updatedAt || item.createdAt)}
                    </small>
                  </span>
                </div>
              </div>
            )}
          </button>
          <div className="records-mobile-head-actions d-flex align-items-start gap-2 ms-2">
            {renderActionItemMenu(
              item,
              idx,
              status,
              isUpdating,
              `meeting-action-item-${itemKey}-mobile`,
            )}
          </div>
        </div>
      </div>
    )
  }

  const toggleExpandedActionItem = (itemKey) => {
    setExpandedActionItemKey((current) => (current === itemKey ? null : itemKey))
  }

  return (
    <>
      <CRow className="g-3 mb-3">
        <CCol md={6}>
          <div className="meeting-detail-field">
            <small className="text-muted">Meeting Title</small>
            <div className="fw-semibold">{form.meetingTitle || '-'}</div>
          </div>
        </CCol>
        <CCol md={3}>
          <div className="meeting-detail-field">
            <small className="text-muted">Meeting Type</small>
            <div className="fw-semibold">{form.meetingType || '-'}</div>
          </div>
        </CCol>
        <CCol md={3}>
          <div className="meeting-detail-field">
            <small className="text-muted">Meeting Date & Time</small>
            <div className="fw-semibold">{formatDateTime(form.meetingDateTime)}</div>
          </div>
        </CCol>
      </CRow>

      <CRow className="g-3 mb-3">
        <CCol md={6}>
          <div className="meeting-detail-field">
            <small className="text-muted">Venue</small>
            <div className="fw-semibold">{form.venue || '-'}</div>
          </div>
        </CCol>
        <CCol md={3}>
          <div className="meeting-detail-field">
            <small className="text-muted">Updated By</small>
            <div>
              <div className="fw-semibold">
                {recordMeta.updatedName || '-'} ({recordMeta.updatedCode || '-'})
              </div>
              <small className="text-muted">{formatDateTime(recordMeta.updatedAt)}</small>
            </div>
          </div>
        </CCol>
        <CCol md={3}>
          <div className="meeting-detail-field">
            <small className="text-muted">Created By</small>
            <div>
              <div className="fw-semibold">
                {recordMeta.createdName || '-'} ({recordMeta.createdCode || '-'})
              </div>
              <small className="text-muted">{formatDateTime(recordMeta.createdAt)}</small>
            </div>
          </div>
        </CCol>
      </CRow>

      <CRow className="g-3 mb-3">
        <CCol md={4}>
          <div className="meeting-detail-field">
            <small className="text-muted">Approval Status</small>
            <div className="fw-semibold">{recordMeta.verificationStatus || 'Pending'}</div>
          </div>
        </CCol>
        <CCol md={4}>
          <div className="meeting-detail-field meeting-detail-field--action">
            <small className="text-muted">Verified By</small>
            <div>
              {recordMeta.verifiedName ? (
                <>
                  <div className="fw-semibold">{`${recordMeta.verifiedName} (${recordMeta.verifiedCode || '-'})`}</div>
                  <small className="text-muted">{formatDateTime(recordMeta.verifiedAt)}</small>
                </>
              ) : (
                <div className="fw-semibold">Not verified</div>
              )}
            </div>
            {canManageVerification && (
              <div className="meeting-detail-field-action">
                <CButton
                  color="primary"
                  variant="outline"
                  size="sm"
                  onClick={() => onMeetingVerificationAction(verifyButtonAction)}
                  disabled={disableVerifyButton}
                >
                  {verifyButtonLabel}
                </CButton>
              </div>
            )}
          </div>
        </CCol>
        <CCol md={4}>
          <div className="meeting-detail-field meeting-detail-field--action">
            <small className="text-muted">Concurred By</small>
            <div>
              {recordMeta.concurredName ? (
                <>
                  <div className="fw-semibold">{`${recordMeta.concurredName} (${recordMeta.concurredCode || '-'})`}</div>
                  <small className="text-muted">{formatDateTime(recordMeta.concurredAt)}</small>
                </>
              ) : (
                <div className="fw-semibold">Not concurred</div>
              )}
            </div>
            {canManageVerification && (
              <div className="meeting-detail-field-action">
                <CButton
                  color="primary"
                  variant="outline"
                  size="sm"
                  onClick={() => onMeetingVerificationAction(concurButtonAction)}
                  disabled={disableConcurButton}
                >
                  {concurButtonLabel}
                </CButton>
              </div>
            )}
          </div>
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol xs={12}>
          <CFormLabel className="mb-1">Staff Attendees</CFormLabel>
          {recordMeta.attendees.length > 0 ? (
            <ol className="mb-0 ps-3">
              {recordMeta.attendees.map((a, idx) => (
                <li
                  key={`view-staff-attendee-${idx}`}
                >{`${a.staff_name || '-'}${a.staff_code ? ` (${a.staff_code})` : ''}`}</li>
              ))}
            </ol>
          ) : (
            <div>-</div>
          )}
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol xs={12}>
          <CFormLabel className="mb-1">Guest Attendees</CFormLabel>
          {guestAttendeeLines.length > 0 ? (
            <ol className="mb-0 ps-3">
              {guestAttendeeLines.map((line, idx) => (
                <li key={`view-guest-attendee-${idx}`}>{line}</li>
              ))}
            </ol>
          ) : (
            <div>-</div>
          )}
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol xs={12}>
          <CFormLabel className="mb-1">Agenda</CFormLabel>
          <div dangerouslySetInnerHTML={{ __html: sanitizeMeetingRichHtml(form.agenda) }} />
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol xs={12}>
          <CFormLabel className="mb-1">Minutes</CFormLabel>
          <div dangerouslySetInnerHTML={{ __html: sanitizeMeetingRichHtml(form.minutesText) }} />
        </CCol>
      </CRow>

      <CRow className="mb-3">
        <CCol xs={12}>
          <CFormLabel className="mb-1">Action Items</CFormLabel>
          <DataTableEmbeddedList
            rows={form.actionItems || []}
            columns={actionItemColumns}
            getRowKey={getActionItemKey}
            renderMobileItem={renderMobileActionItem}
            emptyMessage="No action items."
            mobileClassName="meeting-detail-action-list"
          />
        </CCol>
      </CRow>

      <CRow className="mb-2">
        <CCol xs={12}>
          <CFormCheck
            id="showChangeHistory"
            label="Show Change History"
            checked={showHistory}
            onChange={(e) => onToggleHistory(e.target.checked)}
          />
        </CCol>
      </CRow>

      {showHistory && (
        <CRow className="mb-3">
          <CCol xs={12}>
            <CFormLabel className="mb-1">Change History</CFormLabel>
            {(recordMeta.history || []).length === 0 ? (
              <div className="text-muted">No edit history.</div>
            ) : (
              <div className="table-responsive">
                {/* datatable-exempt: existing embedded/layout table */}
                <CTable hover className="data-table-compact embedded-data-table">
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell className="text-nowrap" style={{ width: '1%' }}>
                        #
                      </CTableHeaderCell>
                      <CTableHeaderCell className="text-nowrap" style={{ width: '1%' }}>
                        Date & Time
                      </CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '40%' }}>Action</CTableHeaderCell>
                      <CTableHeaderCell style={{ width: '30%' }}>Changed Fields</CTableHeaderCell>
                      <CTableHeaderCell className="text-nowrap" style={{ width: '1%' }}>
                        By
                      </CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {(recordMeta.history || []).map((log, idx) => {
                      const changedFieldLabels = formatChangedFieldLabels(log.changed_fields)
                      return (
                        <CTableRow key={`meeting-history-${log.id || idx}`}>
                          <CTableDataCell className="text-nowrap">{idx + 1}</CTableDataCell>
                          <CTableDataCell className="text-nowrap">
                            {formatDateTime(log.created_at)}
                          </CTableDataCell>
                          <CTableDataCell style={{ width: '40%' }}>
                            <div className="fw-semibold">{log.action_type || '-'}</div>
                            {log.action_summary ? (
                              <small className="text-muted">{log.action_summary}</small>
                            ) : null}
                          </CTableDataCell>
                          <CTableDataCell style={{ width: '30%' }}>
                            {changedFieldLabels.length > 0 ? changedFieldLabels.join(', ') : '-'}
                          </CTableDataCell>
                          <CTableDataCell className="text-nowrap">
                            {log.actor_code || '-'}
                          </CTableDataCell>
                        </CTableRow>
                      )
                    })}
                  </CTableBody>
                </CTable>
              </div>
            )}
          </CCol>
        </CRow>
      )}
    </>
  )
}
