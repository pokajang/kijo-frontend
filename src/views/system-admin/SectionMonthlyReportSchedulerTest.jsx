import React, { useCallback, useEffect, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'
import { DataTableRecordList, DataTableStatusBadge } from '../../components/datatable'
import { apiJson } from '../../api/apiClient'
import { apiUrl } from '../../api/apiUrl'

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
    key: 'reportMonth',
    label: 'YTD Through',
    width: '150px',
    sortable: true,
    noWrap: true,
  },
  {
    key: 'recipient',
    label: 'Recipient',
    width: '240px',
    sortable: true,
    cellMaxWidth: '240px',
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
    key: 'publicLink',
    label: 'Public Link',
    width: '150px',
    noWrap: true,
  },
  {
    key: 'expires',
    label: 'Expires',
    width: '170px',
    sortable: true,
    sortType: 'date',
    noWrap: true,
  },
]

const requiredLogColumns = new Set(['timestamp', 'reportMonth', 'recipient', 'status', 'response'])

const statusTone = {
  failed: 'danger',
  sending: 'info',
  sent: 'success',
}

const todayValue = () => new Date().toISOString().slice(0, 10)

const defaultSchedule = () => ({
  enabled: true,
  intervalValue: 1,
  intervalUnit: 'months',
  startDate: todayValue(),
  sendTime: '08:30',
  nextSendAt: '',
  lastAttemptAt: '',
  lastSentAt: '',
  lastStatus: '',
  lastError: '',
  summary: 'Every 1 month at 08:30',
})

const normalizeSchedule = (schedule) => ({
  ...defaultSchedule(),
  ...(schedule || {}),
  intervalValue: Number(schedule?.intervalValue || 1),
  enabled: schedule?.enabled !== false,
})

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

const dateFromValue = (value) => {
  if (!value) return null
  const normalizedValue =
    typeof value === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(value)
      ? value.replace(' ', 'T')
      : value
  const parsed = new Date(normalizedValue)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const validationMessage = (err) => {
  const errors = err?.data?.errors
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat().find(Boolean)
    if (first) return String(first)
  }
  return err?.message || 'Monthly report test failed.'
}

const makeLogRow = ({ month, email, status, response, publicUrl = '', expiresAt = '' }) => {
  const now = new Date()
  const expiryDate = dateFromValue(expiresAt)

  return {
    id: `monthly-report-${now.getTime()}-${Math.random().toString(16).slice(2)}`,
    timestamp: formatTimestamp(now),
    timestampValue: now.toISOString(),
    reportMonth: month,
    recipient: email,
    status,
    response,
    publicUrl,
    publicLink: publicUrl ? 'Open' : '-',
    expires: expiryDate ? formatTimestamp(expiryDate) : '-',
    expiresValue: expiryDate ? expiryDate.toISOString() : '',
  }
}

const rowFromStoredLog = (log) => {
  const completedDate = dateFromValue(log?.completedAt)
  const expiryDate = dateFromValue(log?.publicTokenExpiresAt)
  const id = log?.id || `${log?.reportMonth || 'report'}-${completedDate?.getTime() || Date.now()}`

  return {
    id: `monthly-report-log-${id}`,
    timestamp: completedDate ? formatTimestamp(completedDate) : '-',
    timestampValue: completedDate ? completedDate.toISOString() : '',
    reportMonth: log?.reportMonth || '-',
    recipient: log?.recipient || '-',
    status: log?.status || 'failed',
    response: log?.response || '-',
    publicUrl: log?.url || '',
    publicLink: log?.url ? 'Open' : '-',
    expires: expiryDate ? formatTimestamp(expiryDate) : '-',
    expiresValue: expiryDate ? expiryDate.toISOString() : '',
  }
}

const rowFromReportResult = ({ existingRow, payload, fallbackMessage }) => {
  const data = payload?.data || {}
  if (data.log) {
    return rowFromStoredLog(data.log)
  }

  const expiryDate = dateFromValue(data.publicTokenExpiresAt)

  return {
    ...existingRow,
    reportMonth: data.reportMonth || existingRow.reportMonth,
    status: data.status || 'sent',
    response: payload?.message || fallbackMessage || 'Monthly report test email sent.',
    publicUrl: data.url || '',
    publicLink: data.url ? 'Open' : '-',
    expires: expiryDate ? formatTimestamp(expiryDate) : '-',
    expiresValue: expiryDate ? expiryDate.toISOString() : '',
  }
}

const SectionMonthlyReportSchedulerTest = () => {
  const [schedule, setSchedule] = useState(defaultSchedule)
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [recipientEmail, setRecipientEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [logRows, setLogRows] = useState([])
  const [loadError, setLoadError] = useState('')
  const [scheduleMessage, setScheduleMessage] = useState('')

  const loadLogs = useCallback(async () => {
    setLoadError('')
    try {
      const payload = await apiJson(apiUrl('admin/monthly-dashboard-report-test/status'), {
        credentials: 'include',
        silentError: true,
      })
      const logs = Array.isArray(payload?.data?.logs) ? payload.data.logs : []
      setSchedule(normalizeSchedule(payload?.data?.schedule))
      setLogRows((current) => (current.length === 0 ? logs.map(rowFromStoredLog) : current))
    } catch (err) {
      setLoadError(err?.message || 'Failed to load monthly report test records.')
    }
  }, [])

  useEffect(() => {
    loadLogs()
  }, [loadLogs])

  const handleScheduleChange = useCallback((field, value) => {
    setSchedule((current) => ({
      ...current,
      [field]: value,
    }))
  }, [])

  const handleSaveSchedule = useCallback(async () => {
    setSavingSchedule(true)
    setLoadError('')
    setScheduleMessage('')

    try {
      const payload = await apiJson(apiUrl('admin/monthly-dashboard-report-test/schedule'), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          enabled: schedule.enabled,
          intervalValue: Number(schedule.intervalValue),
          intervalUnit: schedule.intervalUnit,
          startDate: schedule.startDate,
          sendTime: schedule.sendTime,
        }),
      })
      setSchedule(normalizeSchedule(payload?.data?.schedule))
      setScheduleMessage(payload?.message || 'Dashboard report email schedule saved.')
    } catch (err) {
      setLoadError(validationMessage(err))
    } finally {
      setSavingSchedule(false)
    }
  }, [schedule])

  const handleSend = useCallback(async () => {
    const email = recipientEmail.trim()
    if (!email) return

    const pendingRow = makeLogRow({
      month: 'Auto',
      email,
      status: 'sending',
      response: 'Generating report and sending email...',
    })

    setSending(true)
    setLoadError('')
    setLogRows((current) => [pendingRow, ...current])

    try {
      const payload = await apiJson(apiUrl('admin/monthly-dashboard-report-test/trigger'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          recipients: email,
          force: true,
        }),
      })

      setLogRows((current) =>
        current.map((row) =>
          row.id === pendingRow.id
            ? rowFromReportResult({
                existingRow: row,
                payload,
                fallbackMessage: 'Monthly report test email sent.',
              })
            : row,
        ),
      )
    } catch (err) {
      const message = validationMessage(err)
      const storedLog = err?.data?.data?.log
      setLoadError(message)
      setLogRows((current) =>
        current.map((row) =>
          row.id === pendingRow.id
            ? storedLog
              ? rowFromStoredLog(storedLog)
              : {
                  ...row,
                  status: 'failed',
                  response: message,
                  publicUrl: '',
                  publicLink: '-',
                  expires: '-',
                  expiresValue: '',
                }
            : row,
        ),
      )
    } finally {
      setSending(false)
    }
  }, [recipientEmail])

  return (
    <CCard className="mb-4 records-page-card">
      <CCardHeader className="records-page-card-header">
        <strong>Dashboard Report Email</strong>
      </CCardHeader>
      <CCardBody className="records-page-card-body">
        <CRow className="g-3 align-items-end">
          <CCol xs={12} md={2}>
            <CFormLabel htmlFor="monthly-report-schedule-enabled">Enabled</CFormLabel>
            <CFormCheck
              id="monthly-report-schedule-enabled"
              aria-label="Enabled"
              checked={schedule.enabled}
              onChange={(event) => handleScheduleChange('enabled', event.target.checked)}
            />
          </CCol>
          <CCol xs={12} sm={6} md={2}>
            <CFormLabel htmlFor="monthly-report-schedule-interval">Every</CFormLabel>
            <CFormInput
              id="monthly-report-schedule-interval"
              type="number"
              min="1"
              max="365"
              value={schedule.intervalValue}
              onChange={(event) => handleScheduleChange('intervalValue', event.target.value)}
            />
          </CCol>
          <CCol xs={12} sm={6} md={2}>
            <CFormLabel htmlFor="monthly-report-schedule-unit">Unit</CFormLabel>
            <CFormSelect
              id="monthly-report-schedule-unit"
              value={schedule.intervalUnit}
              onChange={(event) => handleScheduleChange('intervalUnit', event.target.value)}
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </CFormSelect>
          </CCol>
          <CCol xs={12} sm={6} md={2}>
            <CFormLabel htmlFor="monthly-report-schedule-start-date">Start Date</CFormLabel>
            <CFormInput
              id="monthly-report-schedule-start-date"
              type="date"
              value={schedule.startDate}
              onChange={(event) => handleScheduleChange('startDate', event.target.value)}
            />
          </CCol>
          <CCol xs={12} sm={6} md={2}>
            <CFormLabel htmlFor="monthly-report-schedule-send-time">Send Time</CFormLabel>
            <CFormInput
              id="monthly-report-schedule-send-time"
              type="time"
              value={schedule.sendTime}
              onChange={(event) => handleScheduleChange('sendTime', event.target.value)}
            />
          </CCol>
          <CCol xs={12} md={2}>
            <div className="d-flex justify-content-md-end">
              <CButton
                color="primary"
                size="sm"
                type="button"
                disabled={
                  savingSchedule ||
                  !schedule.intervalValue ||
                  !schedule.intervalUnit ||
                  !schedule.startDate ||
                  !schedule.sendTime
                }
                onClick={handleSaveSchedule}
              >
                {savingSchedule ? 'Saving...' : 'Save Schedule'}
              </CButton>
            </div>
          </CCol>
        </CRow>

        <div className="mt-3 small text-body-secondary">
          Next send:{' '}
          {schedule.nextSendAt ? formatTimestamp(dateFromValue(schedule.nextSendAt)) : '-'}
          {schedule.lastStatus ? ` | Last status: ${schedule.lastStatus}` : ''}
        </div>

        {scheduleMessage && (
          <CAlert color="success" className="mt-3 mb-0">
            {scheduleMessage}
          </CAlert>
        )}

        <hr className="my-4" />

        <CRow className="g-3 align-items-end">
          <CCol xs={12} md={7} lg={5}>
            <CFormLabel htmlFor="monthly-report-test-recipient">Recipient Email</CFormLabel>
            <CFormInput
              id="monthly-report-test-recipient"
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              placeholder="name@example.com"
            />
          </CCol>
          <CCol xs={12} md={5} lg={7}>
            <div className="d-flex justify-content-md-end">
              <CButton
                color="primary"
                size="sm"
                type="button"
                disabled={sending || !recipientEmail.trim()}
                onClick={handleSend}
              >
                {sending ? 'Sending...' : 'Generate and Send Report'}
              </CButton>
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
            idPrefix="system-admin-monthly-report-test"
            emptyMessage="No monthly report test records yet."
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
              if (field === 'expires') return row.expiresValue
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
              if (column.key === 'publicLink') {
                return row.publicUrl ? (
                  <a href={row.publicUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : (
                  '-'
                )
              }
              return row[column.key] || '-'
            }}
            getMobileTitle={(row) => row.reportMonth}
            getMobileSubtitle={(row) => row.response}
            getMobileMeta={(row) => [row.timestamp, row.recipient].filter(Boolean).join(' | ')}
            getMobileStatus={(row) => row.status}
            getMobileStatusTone={(row) => statusTone[row.status] || 'secondary'}
            mobileFieldKeys={{
              title: 'reportMonth',
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

export default SectionMonthlyReportSchedulerTest
