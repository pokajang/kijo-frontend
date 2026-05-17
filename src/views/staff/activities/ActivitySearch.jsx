import React from 'react'
import { CRow, CCol, CFormInput, CFormSelect, CFormLabel } from '@coreui/react'

const ActivitySearch = ({
  searchTerm,
  onSearchChange,
  userFilter,
  onUserFilterChange,
  periodFilter,
  onPeriodFilterChange,
  userOptions = [],
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  monthFilter,
  onMonthFilterChange,
}) => {
  return (
    <CRow className="mb-3 align-items-end">
      <CCol md={3}>
        <CFormLabel>Search Keyword</CFormLabel>
        <CFormInput
          placeholder="Search by user code or activity details..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </CCol>

      <CCol md={2}>
        <CFormLabel>User Code</CFormLabel>
        <CFormSelect
          value={userFilter}
          onChange={(e) => onUserFilterChange(e.target.value)}
          options={userOptions}
        />
      </CCol>

      <CCol md={2}>
        <CFormLabel>Period</CFormLabel>
        <CFormSelect
          value={periodFilter}
          onChange={(e) => onPeriodFilterChange(e.target.value)}
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
          <CCol md={2}>
            <CFormLabel>Start Date</CFormLabel>
            <CFormInput
              type="date"
              value={customStartDate}
              onChange={(e) => onCustomStartDateChange(e.target.value)}
            />
          </CCol>
          <CCol md={2}>
            <CFormLabel>End Date</CFormLabel>
            <CFormInput
              type="date"
              value={customEndDate}
              onChange={(e) => onCustomEndDateChange(e.target.value)}
            />
          </CCol>
        </>
      )}

      {periodFilter === 'by_month' && (
        <CCol md={3}>
          <CFormLabel>Select Month</CFormLabel>
          <CFormInput
            type="month"
            value={monthFilter}
            onChange={(e) => onMonthFilterChange(e.target.value)}
          />
        </CCol>
      )}
    </CRow>
  )
}

export default ActivitySearch
