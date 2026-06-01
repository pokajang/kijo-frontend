import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CBadge,
  CButton,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
  CSpinner,
} from '@coreui/react'
import { DataTableLoadingState } from '../datatable'
import { getMyEntitlements, useApplyLeaveHandlers } from './actionHandlers'

const colorByType = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
}

const normalizeLeaveType = (value) =>
  String(value || '')
    .trim()
    .toLowerCase()
const isUnpaidLeave = (value) => ['unpaid', 'unpaid leave'].includes(normalizeLeaveType(value))
const hasPositiveBalance = (entitlement) => Number(entitlement.remaining) > 0

const ApplyLeave = ({ onViewRecords }) => {
  const [entitlements, setEntitlements] = useState([])
  const [loadingEntitlements, setLoadingEntitlements] = useState(true)
  const [notice, setNotice] = useState({
    visible: false,
    message: '',
    color: 'info',
    scope: 'general',
  })
  const currentYear = new Date().getFullYear()

  const showNotice = useCallback((type, message, options = {}) => {
    const normalizedType = colorByType[type] ? type : 'info'
    setNotice({
      visible: true,
      message,
      color: colorByType[normalizedType],
      scope: options.scope || 'general',
    })
  }, [])

  const hideNotice = () => {
    setNotice((prev) => ({ ...prev, visible: false }))
  }

  const loadEntitlements = useCallback(
    async ({ showLoading = true } = {}) => {
      if (showLoading) setLoadingEntitlements(true)
      try {
        const items = await getMyEntitlements()
        setEntitlements(items)
      } catch (err) {
        console.error(err)
        showNotice('error', 'Could not load your leave balances.', { scope: 'load' })
      } finally {
        if (showLoading) setLoadingEntitlements(false)
      }
    },
    [showNotice],
  )

  const {
    leaveFormData,
    duration,
    isSubmitting,
    handleChange,
    setTypeOfLeave,
    handleStartDateChange,
    handleEndDateChange,
    handleSubmit,
  } = useApplyLeaveHandlers({
    onNotify: showNotice,
    onSubmitted: () => loadEntitlements({ showLoading: false }),
  })

  useEffect(() => {
    loadEntitlements()
  }, [loadEntitlements])

  const currentYearEntitlements = useMemo(() => {
    const byType = new Map()

    entitlements
      .filter((entitlement) => Number(entitlement.year) === currentYear)
      .forEach((entitlement) => {
        const key = normalizeLeaveType(entitlement.leave_type)
        if (key && !byType.has(key)) byType.set(key, entitlement)
      })

    return Array.from(byType.values())
  }, [currentYear, entitlements])

  const leaveOptions = useMemo(
    () => [
      ...currentYearEntitlements
        .filter(
          (entitlement) =>
            !isUnpaidLeave(entitlement.leave_type) && hasPositiveBalance(entitlement),
        )
        .map((entitlement) => ({
          key: `${entitlement.id ?? entitlement.leave_type}-${entitlement.year}`,
          value: entitlement.leave_type,
          label: `${entitlement.leave_type} - Balance: ${entitlement.remaining} day${
            Number(entitlement.remaining) === 1 ? '' : 's'
          }`,
        })),
      { key: `unpaid-${currentYear}`, value: 'Unpaid', label: 'Unpaid Leave' },
    ],
    [currentYear, currentYearEntitlements],
  )

  const hasCurrentYearEntitlements = currentYearEntitlements.length > 0
  const canApplyLeave = leaveOptions.length > 0

  useEffect(() => {
    if (loadingEntitlements || !canApplyLeave) return

    const validValues = new Set(leaveOptions.map((option) => option.value))
    if (!validValues.has(leaveFormData.typeOfLeave)) {
      setTypeOfLeave(leaveOptions[0]?.value ?? 'Unpaid')
    }
  }, [canApplyLeave, leaveFormData.typeOfLeave, leaveOptions, loadingEntitlements, setTypeOfLeave])

  const showSubmissionPanel = isSubmitting || (notice.visible && notice.scope === 'submission')

  return (
    <>
      {loadingEntitlements ? (
        <DataTableLoadingState message="Loading leave balances..." />
      ) : (
        <>
          <div className="leave-balance-section mb-3">
            <CFormLabel className="mb-2">Leave Balance</CFormLabel>
            {hasCurrentYearEntitlements ? (
              <div className="leave-balance-grid">
                {currentYearEntitlements.map((entitlement) => (
                  <div
                    key={`${entitlement.id ?? entitlement.leave_type}-${entitlement.year}`}
                    className="leave-balance-card"
                  >
                    <div className="leave-balance-card-title">{entitlement.leave_type}</div>
                    <div className="leave-balance-card-value">
                      {entitlement.remaining}
                      <span> days</span>
                    </div>
                    {entitlement.year && (
                      <CBadge color="secondary" className="leave-balance-card-badge">
                        {entitlement.year}
                      </CBadge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="leave-balance-empty text-muted">
                No leave allocated for {currentYear}.
              </div>
            )}
          </div>

          {!canApplyLeave ? (
            notice.visible &&
            notice.scope !== 'submission' && (
              <CAlert color={notice.color} className="py-2" dismissible onClose={hideNotice}>
                {notice.message}
              </CAlert>
            )
          ) : showSubmissionPanel ? (
            <>
              <CAlert color={isSubmitting ? 'info' : notice.color} className="mb-3 py-3">
                {isSubmitting ? 'Submitting leave application...' : notice.message}
              </CAlert>

              {isSubmitting ? (
                <div className="d-flex align-items-center">
                  <CSpinner size="sm" className="me-2" />
                  Processing request...
                </div>
              ) : (
                <div className="leave-submit-actions">
                  <CButton color="primary" size="sm" onClick={hideNotice}>
                    {notice.color === 'danger' ? 'Back to Form' : 'Apply Another Leave'}
                  </CButton>
                  {notice.color !== 'danger' && onViewRecords && (
                    <CButton color="secondary" variant="outline" size="sm" onClick={onViewRecords}>
                      View Records
                    </CButton>
                  )}
                </div>
              )}
            </>
          ) : (
            <CForm onSubmit={handleSubmit}>
              <CRow>
                <CCol xs={12} className="mb-3">
                  <CFormLabel htmlFor="typeOfLeave" className="mb-1">
                    Type of Leave
                  </CFormLabel>
                  <CFormSelect
                    id="typeOfLeave"
                    name="typeOfLeave"
                    value={leaveFormData.typeOfLeave}
                    onChange={handleChange}
                  >
                    <option value="">Select type</option>
                    {leaveOptions.map((opt) => (
                      <option key={opt.key} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>

                <CCol xs={12} className="mb-3">
                  <CFormLabel htmlFor="reason" className="mb-1">
                    Reason
                  </CFormLabel>
                  <CFormInput
                    id="reason"
                    name="reason"
                    value={leaveFormData.reason}
                    onChange={handleChange}
                    placeholder="eg. Resting"
                  />
                </CCol>
              </CRow>

              <CRow>
                <CCol xs={6} md={3} className="mb-3">
                  <CFormLabel htmlFor="startDate" className="mb-1">
                    Start Date
                  </CFormLabel>
                  <CFormInput
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={leaveFormData.startDate.toLocaleDateString('en-CA', {
                      timeZone: 'Asia/Kuala_Lumpur',
                    })}
                    onChange={handleStartDateChange}
                  />
                </CCol>

                <CCol xs={6} md={3} className="mb-3">
                  <CFormLabel htmlFor="startTime" className="mb-1">
                    Start Time
                  </CFormLabel>
                  <CFormSelect
                    id="startTime"
                    name="startTime"
                    value={leaveFormData.startTime}
                    onChange={handleChange}
                  >
                    <option value="08:30">8:30 AM</option>
                    <option value="14:00">2:00 PM</option>
                  </CFormSelect>
                </CCol>

                <CCol xs={6} md={3} className="mb-3">
                  <CFormLabel htmlFor="endDate" className="mb-1">
                    End Date
                  </CFormLabel>
                  <CFormInput
                    type="date"
                    id="endDate"
                    name="endDate"
                    value={leaveFormData.endDate.toLocaleDateString('en-CA', {
                      timeZone: 'Asia/Kuala_Lumpur',
                    })}
                    onChange={handleEndDateChange}
                  />
                </CCol>

                <CCol xs={6} md={3} className="mb-3">
                  <CFormLabel htmlFor="endTime" className="mb-1">
                    End Time
                  </CFormLabel>
                  <CFormSelect
                    id="endTime"
                    name="endTime"
                    value={leaveFormData.endTime}
                    onChange={handleChange}
                  >
                    <option value="13:00">1:00 PM</option>
                    <option value="17:30">5:30 PM</option>
                  </CFormSelect>
                </CCol>
              </CRow>

              {duration > 0 && (
                <CRow>
                  <CCol>
                    <CAlert color="primary">
                      Applying leave for <strong>{duration} days</strong>.
                    </CAlert>
                  </CCol>
                </CRow>
              )}

              {notice.visible && notice.scope !== 'submission' && (
                <CRow>
                  <CCol>
                    <CAlert color={notice.color} className="py-2" dismissible onClose={hideNotice}>
                      {notice.message}
                    </CAlert>
                  </CCol>
                </CRow>
              )}

              <CButton type="submit" color="primary" size="sm" disabled={isSubmitting}>
                Submit
              </CButton>
            </CForm>
          )}
        </>
      )}
    </>
  )
}

export default ApplyLeave
