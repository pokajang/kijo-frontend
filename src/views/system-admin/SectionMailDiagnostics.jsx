import React, { useCallback, useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CRow,
} from '@coreui/react'
import { DataTableRecordList, DataTableStatusBadge } from '../../components/datatable'
import { apiJson } from '../../api/apiClient'
import { apiUrl } from '../../api/apiUrl'

const testActions = [
  {
    key: 'default',
    label: 'Send Default Email Test',
    endpoint: 'admin/mail-diagnostics/default',
    from: 'kijo@work.amiosh.com',
  },
  {
    key: 'quote',
    label: 'Send Quote PDF Email Test',
    endpoint: 'admin/mail-diagnostics/quote-pdf',
    from: 'info.admin@amiosh.com',
  },
]

const logColumns = [
  {
    key: 'timestamp',
    label: 'Timestamp',
    width: '170px',
    sortable: true,
    sortType: 'date',
    noWrap: true,
  },
  {
    key: 'testType',
    label: 'Test Type',
    width: '190px',
    sortable: true,
    noWrap: true,
  },
  {
    key: 'recipient',
    label: 'Recipient',
    width: '220px',
    sortable: true,
    cellMaxWidth: '220px',
  },
  {
    key: 'from',
    label: 'From',
    width: '210px',
    sortable: true,
    cellMaxWidth: '210px',
  },
  {
    key: 'status',
    label: 'Status',
    width: '120px',
    sortable: true,
    align: 'center',
    noWrap: true,
  },
  {
    key: 'response',
    label: 'Response',
    width: '360px',
    sortable: true,
    cellMaxWidth: '360px',
    previewCharThreshold: 72,
  },
  {
    key: 'attachment',
    label: 'Attachment',
    width: '180px',
    sortable: true,
    noWrap: true,
  },
]

const requiredLogColumns = new Set(['timestamp', 'testType', 'status', 'response'])

const formatTimestamp = (date = new Date()) => {
  const safeDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date()
  return safeDate.toLocaleString('en-MY', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  })
}

const statusTone = {
  blocked: 'warning',
  failed: 'danger',
  sending: 'info',
  sent: 'success',
}

const makeLogRow = ({ action, email, status, response, from, attachment }) => {
  const now = new Date()
  return {
    id: `${action.key}-${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    timestamp: formatTimestamp(now),
    timestampValue: now.toISOString(),
    testType: action.label.replace(/^Send\s+/i, ''),
    recipient: email,
    from: from || action.from,
    status,
    response,
    attachment: attachment || '-',
  }
}

const completedDateFromPayload = (payload) => {
  const raw = payload?.data?.completed_at
  if (!raw) return new Date()
  const parsed = new Date(raw)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

const testTypeByLogType = {
  default: 'Default Email Test',
  quote_pdf: 'Quote PDF Email Test',
}

const rowFromDiagnosticLog = (log, fallback = {}) => {
  const action = fallback.action || testActions.find((item) => item.key === 'default')
  const completedAt = completedDateFromPayload({ data: log })
  return {
    id:
      log?.id ||
      fallback.id ||
      `mail-diagnostic-${completedAt.getTime()}-${Math.random().toString(16).slice(2)}`,
    timestamp: formatTimestamp(completedAt),
    timestampValue: completedAt.toISOString(),
    testType:
      testTypeByLogType[log?.type] || fallback.testType || action.label.replace(/^Send\s+/i, ''),
    recipient: log?.to || fallback.recipient || fallback.email || '',
    from: log?.from || fallback.from || action.from,
    status: log?.status || fallback.status || 'failed',
    response: log?.response || fallback.response || 'Email test completed.',
    attachment: log?.attachment || fallback.attachment || '-',
  }
}

const SectionMailDiagnostics = () => {
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sendingType, setSendingType] = useState('')
  const [logRows, setLogRows] = useState([])
  const [loadError, setLoadError] = useState('')

  const loadDiagnosticLogs = useCallback(async () => {
    setLoadError('')
    try {
      const payload = await apiJson(apiUrl('admin/mail-diagnostics'), {
        credentials: 'include',
        silentError: true,
      })
      const logs = Array.isArray(payload?.data?.logs) ? payload.data.logs : []
      setLogRows(logs.map((log) => rowFromDiagnosticLog(log)))
    } catch (err) {
      setLoadError(err.message || 'Failed to load email diagnostic records.')
    }
  }, [])

  useEffect(() => {
    loadDiagnosticLogs()
  }, [loadDiagnosticLogs])

  const handleSend = useCallback(
    async (action) => {
      const email = recipientEmail.trim()
      if (!email) return

      const pendingRow = makeLogRow({
        action,
        email,
        status: 'sending',
        response: 'Sending diagnostic email...',
      })

      setSendingType(action.key)
      setLogRows((current) => [pendingRow, ...current])

      try {
        const payload = await apiJson(apiUrl(action.endpoint), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ recipient_email: email }),
        })

        setLogRows((current) =>
          current.map((row) =>
            row.id === pendingRow.id
              ? (() => {
                  if (payload.data?.log) {
                    return rowFromDiagnosticLog(payload.data.log, {
                      ...row,
                      action,
                      email,
                    })
                  }
                  const completedAt = completedDateFromPayload(payload)
                  return {
                    ...row,
                    timestamp: formatTimestamp(completedAt),
                    timestampValue: completedAt.toISOString(),
                    from: payload.data?.from || action.from,
                    recipient: payload.data?.to || email,
                    status: payload.data?.status || 'sent',
                    response: payload.message || 'Email sent.',
                    attachment: payload.data?.attachment || '-',
                  }
                })()
              : row,
          ),
        )
      } catch (err) {
        const message = err.message || 'Email test failed.'
        const errorData = err?.data?.data || {}
        const isBlocked =
          errorData.status === 'blocked' ||
          err?.response?.status === 503 ||
          message.toLowerCase().includes('configured as') ||
          message.toLowerCase().includes('not configured')

        setLogRows((current) =>
          current.map((row) =>
            row.id === pendingRow.id
              ? (() => {
                  if (errorData.log) {
                    return rowFromDiagnosticLog(errorData.log, {
                      ...row,
                      action,
                      email,
                      response: message,
                    })
                  }
                  const completedAt = completedDateFromPayload(err.data)
                  return {
                    ...row,
                    timestamp: formatTimestamp(completedAt),
                    timestampValue: completedAt.toISOString(),
                    from: errorData.from || row.from,
                    recipient: errorData.to || row.recipient,
                    status: errorData.status || (isBlocked ? 'blocked' : 'failed'),
                    response: message,
                    attachment: errorData.attachment || row.attachment,
                  }
                })()
              : row,
          ),
        )
      } finally {
        setSendingType('')
      }
    },
    [recipientEmail],
  )

  return (
    <CCard className="mb-4 records-page-card">
      <CCardHeader className="records-page-card-header">
        <strong>Email Diagnostics</strong>
      </CCardHeader>
      <CCardBody className="records-page-card-body">
        <CRow className="g-3 align-items-end">
          <CCol xs={12} lg={5}>
            <CFormLabel htmlFor="mail-diagnostic-recipient">Recipient Email</CFormLabel>
            <CFormInput
              id="mail-diagnostic-recipient"
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </CCol>
          <CCol xs={12} lg={7}>
            <div className="d-flex flex-wrap gap-2 justify-content-lg-end">
              {testActions.map((action) => (
                <CButton
                  key={action.key}
                  color="primary"
                  size="sm"
                  type="button"
                  disabled={Boolean(sendingType) || !recipientEmail.trim()}
                  onClick={() => handleSend(action)}
                >
                  {sendingType === action.key ? 'Sending...' : action.label}
                </CButton>
              ))}
            </div>
          </CCol>
        </CRow>

        <div className="mt-4">
          {loadError && (
            <CAlert color="warning" className="mb-3">
              {loadError}
            </CAlert>
          )}
          <DataTableRecordList
            rows={logRows}
            dataColumns={logColumns}
            requiredColumns={requiredLogColumns}
            scrollStorageKey="system-admin.mail-diagnostics.scroll"
            idPrefix="system-admin-mail-diagnostics"
            emptyMessage="No email test records yet."
            initialSortField="timestamp"
            initialSortDir="desc"
            initialPageSize={10}
            showColumnMenu={false}
            showExport={false}
            showDesktopSummary={false}
            desktopUtilityPlacement="hidden"
            showMobileUtilityRow={false}
            showMobileTopFooter={false}
            showScrollTip={false}
            desktopBreakpoint="lg"
            getRowKey={(row) => row.id}
            getSortValue={(row, field) => {
              if (field === 'timestamp') return row.timestampValue
              return row[field]
            }}
            renderCell={(row, column) => {
              if (column.key === 'status') {
                return (
                  <DataTableStatusBadge tone={statusTone[row.status] || 'secondary'} shape="pill">
                    {row.status}
                  </DataTableStatusBadge>
                )
              }
              return row[column.key] || '-'
            }}
            getMobileTitle={(row) => row.testType}
            getMobileSubtitle={(row) => row.response}
            getMobileMeta={(row) => [row.timestamp, row.recipient].filter(Boolean).join(' | ')}
            getMobileStatus={(row) => row.status}
            getMobileStatusTone={(row) => statusTone[row.status] || 'secondary'}
            mobileFieldKeys={{
              title: 'testType',
              subtitle: 'response',
              meta: ['timestamp', 'recipient'],
              status: 'status',
            }}
          />
        </div>
      </CCardBody>
    </CCard>
  )
}

export default SectionMailDiagnostics
