import React, { useEffect, useState, useMemo } from 'react'
import {
  CModal,
  CModalHeader,
  CModalBody,
  CModalFooter,
  CFormInput,
  CFormSelect,
  CRow,
  CCol,
  CFormLabel,
  CButton,
  CSpinner,
  CAlert,
} from '@coreui/react'

const ExportReportModal = ({ visible, onClose, activityList }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [userFilter, setUserFilter] = useState('all')
  const [periodFilter, setPeriodFilter] = useState('1y')
  const [customStartDate, setCustomStartDate] = useState('')
  const [customEndDate, setCustomEndDate] = useState('')
  const [monthFilter, setMonthFilter] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Build user list
  const userOptions = useMemo(() => {
    const userCodes = [...new Set(activityList.map((a) => a.user_code))].filter(Boolean)
    return [
      { label: 'All Users', value: 'all' },
      ...userCodes.map((code) => ({
        label: code,
        value: code.toLowerCase(),
      })),
    ]
  }, [activityList])

  // Default date range for custom
  useEffect(() => {
    if (periodFilter === 'custom' && (!customStartDate || !customEndDate)) {
      const today = new Date()
      const lastWeek = new Date()
      lastWeek.setDate(today.getDate() - 7)
      const toISO = (d) => d.toISOString().split('T')[0]
      setCustomStartDate(toISO(lastWeek))
      setCustomEndDate(toISO(today))
    }
  }, [periodFilter, customStartDate, customEndDate])

  // Default month for by_month
  useEffect(() => {
    if (periodFilter === 'by_month' && !monthFilter) {
      const today = new Date()
      setMonthFilter(today.toISOString().slice(0, 7)) // "YYYY-MM"
    }
  }, [periodFilter, monthFilter])

  const handleGenerate = async () => {
    setLoading(true)
    setError('')

    const payload = {
      searchTerm,
      userFilter,
      periodFilter,
      customStartDate,
      customEndDate,
      monthFilter,
      sortColumn: 'date',
      sortDirection: 'desc',
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}staff/activities/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) throw new Error('Failed to generate PDF')

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank') // open in new tab
      onClose()
    } catch (err) {
      console.error(err)
      setError('Failed to export report. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} alignment="center" backdrop="static">
      <CModalHeader>
        <strong>Export Filtered Activity Report</strong>
      </CModalHeader>

      <CModalBody>
        {error && <CAlert color="danger">{error}</CAlert>}

        <CRow className="mb-3 align-items-end gap-2">
          <CCol md={12}>
            <CFormLabel>Search Keyword</CFormLabel>
            <CFormInput
              placeholder="Search by user code or activity details..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </CCol>

          <CCol md={12}>
            <CFormLabel>User Code</CFormLabel>
            <CFormSelect
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              options={userOptions}
            />
          </CCol>

          <CCol md={12}>
            <CFormLabel>Period</CFormLabel>
            <CFormSelect
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              options={[
                { label: 'Last 1 Week', value: '1w' },
                { label: 'Last 1 Month', value: '1m' },
                { label: 'Last 1 Year', value: '1y' },
                { label: 'Custom Period', value: 'custom' },
                { label: 'By Month', value: 'by_month' },
              ]}
            />
          </CCol>

          {periodFilter === 'custom' && (
            <>
              <CCol md={12}>
                <CFormLabel>Start Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                />
              </CCol>

              <CCol md={12}>
                <CFormLabel>End Date</CFormLabel>
                <CFormInput
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                />
              </CCol>
            </>
          )}

          {periodFilter === 'by_month' && (
            <CCol md={12}>
              <CFormLabel>Select Month</CFormLabel>
              <CFormInput
                type="month"
                value={monthFilter}
                onChange={(e) => setMonthFilter(e.target.value)}
              />
            </CCol>
          )}
        </CRow>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onClose} disabled={loading}>
          Cancel
        </CButton>
        <CButton color="primary" onClick={handleGenerate} disabled={loading}>
          {loading ? (
            <>
              <CSpinner size="sm" className="me-2" />
              Generating...
            </>
          ) : (
            'Export PDF'
          )}
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ExportReportModal
