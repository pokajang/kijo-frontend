// src/components/PeriodSelector.jsx

import React, { useId } from 'react'
import {
  CRow,
  CCol,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CFormInput,
  CFormLabel,
} from '@coreui/react'
import { formatLocalISODate } from '../../marketing/pipeline/pipelineEntryUtils'

// helper to format Date to YYYY-MM-DD
const formatDate = formatLocalISODate

const periodLabels = {
  previousMonth: 'Previous Month',
  currentMonth: 'Current Month',
  currentYear: 'Current Year',
  '3months': 'Last 3 Months',
  '6months': 'Last 6 Months',
  allTime: 'All Time',
  custom: 'Custom Range',
}

const PeriodSelector = ({
  period,
  startDate,
  endDate,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
  compact = false,
  buttonColor = 'primary',
  buttonVariant = 'outline',
  buttonClassName = '',
  ariaLabel = 'Reporting period',
}) => {
  const idBase = useId()
  const startDateId = `${idBase}-startDate`
  const endDateId = `${idBase}-endDate`
  const today = new Date()
  const maxDate = formatDate(today)

  const toggleProps = {
    size: 'sm',
    color: buttonColor,
    className: buttonClassName,
    'data-api-busy-allow': 'true',
    'aria-label': ariaLabel,
  }

  if (buttonVariant) {
    toggleProps.variant = buttonVariant
  }

  const dropdown = (
    <CDropdown autoClose="outside">
      <CDropdownToggle {...toggleProps}>{periodLabels[period]}</CDropdownToggle>
      <CDropdownMenu className="p-0">
        {Object.entries(periodLabels).map(([key, label]) => (
          <CDropdownItem
            key={key}
            active={period === key}
            className="py-2"
            onClick={() => onPeriodChange(key)}
          >
            {label}
          </CDropdownItem>
        ))}
        {period === 'custom' && (
          <>
            <hr className="my-1" />
            <div className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2">
                <CFormLabel htmlFor={startDateId} className="small text-muted mb-1">
                  Start
                </CFormLabel>
                <CFormInput
                  type="date"
                  id={startDateId}
                  value={startDate}
                  max={maxDate}
                  onChange={(e) => onStartDateChange(e.target.value)}
                />
              </div>
              <div>
                <CFormLabel htmlFor={endDateId} className="small text-muted mb-1">
                  End
                </CFormLabel>
                <CFormInput
                  type="date"
                  id={endDateId}
                  value={endDate}
                  max={maxDate}
                  onChange={(e) => onEndDateChange(e.target.value)}
                />
              </div>
            </div>
          </>
        )}
      </CDropdownMenu>
    </CDropdown>
  )

  if (compact) {
    return <div className="d-flex flex-column align-items-end gap-2">{dropdown}</div>
  }

  return (
    <CRow className="align-items-center gy-2">
      <CCol xs={12} md="auto">
        {dropdown}
      </CCol>
    </CRow>
  )
}

export default PeriodSelector
