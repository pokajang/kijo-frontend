import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CRow,
} from '@coreui/react'
import { DataTableActionMenu, DataTableLoadingState } from '../datatable'
import { showToast } from '../toast/toastService'
import { calculateSalarySummary, formatMoney } from './salaryCalculations'
import {
  fetchSalaryProfile,
  getSalaryProfile,
  normalizePreviousYearSnapshot,
  saveSalaryProfile,
} from './salaryProfileStorage'
import { SalaryEmbeddedTable, SalaryPayablePreviewTable } from './SalaryTables'

const createAllowanceRow = () => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  description: '',
  amount: '',
  startMonth: '',
})

const formatMonthLabel = (month) => {
  if (!month) return null

  const [year, monthNumber] = month.split('-').map(Number)
  if (!year || !monthNumber) return month

  return new Date(year, monthNumber - 1, 1).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

const buildAllowanceMeta = (allowance) => {
  const meta = []
  const startMonth = formatMonthLabel(allowance.startMonth)

  if (startMonth) meta.push(`Starts ${startMonth}`)

  return meta.join(' - ') || 'Recurring monthly'
}

const previousYearFromMonth = (month) => {
  const year = Number(String(month || '').slice(0, 4))

  return Number.isFinite(year) && year > 0 ? String(year - 1) : ''
}

const SalarySettings = ({ medicalEntitlementSetup = false, onMedicalEntitlementSaved }) => {
  const [profile, setProfile] = useState(getSalaryProfile)
  const [allowanceDraft, setAllowanceDraft] = useState(createAllowanceRow)
  const [editingAllowanceId, setEditingAllowanceId] = useState(null)
  const [showAllowanceDraft, setShowAllowanceDraft] = useState(false)
  const [notice, setNotice] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const medicalEntitlementInputRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    fetchSalaryProfile()
      .then((loadedProfile) => {
        if (!isMounted) return
        setProfile(loadedProfile)
      })
      .catch((err) => {
        if (!isMounted) return
        setNotice({
          color: 'danger',
          message: err?.message || 'Could not load salary settings.',
        })
      })
      .finally(() => {
        if (isMounted) setIsLoadingProfile(false)
      })

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    if (!medicalEntitlementSetup || isLoadingProfile) return undefined

    const focusTimer = window.setTimeout(() => {
      medicalEntitlementInputRef.current?.scrollIntoView?.({
        block: 'center',
      })
      medicalEntitlementInputRef.current?.focus()
    }, 0)

    return () => window.clearTimeout(focusTimer)
  }, [isLoadingProfile, medicalEntitlementSetup])

  const activeAllowanceItems = useMemo(
    () =>
      profile.recurringAllowances
        .filter((allowance) => allowance.description.trim() && Number(allowance.amount) > 0)
        .map((allowance) => ({
          id: allowance.id,
          description: allowance.description,
          amount: Number(allowance.amount),
        })),
    [profile.recurringAllowances],
  )

  const summary = useMemo(
    () =>
      calculateSalarySummary({
        basicSalary: profile.basicSalary,
        allowanceItems: activeAllowanceItems,
      }),
    [activeAllowanceItems, profile.basicSalary],
  )
  const deductions = summary.deductions
  const payablePreviewRows = useMemo(
    () => [
      {
        id: 'basic-salary',
        item: 'Basic Salary',
        amount: summary.basicSalary,
      },
      {
        id: 'recurring-allowance',
        item: 'Recurring Allowances',
        amount: summary.totalAllowance,
      },
      ...activeAllowanceItems.map((allowance, index) => ({
        id: `recurring-allowance-${allowance.id || index}`,
        item: `${index + 1}. ${allowance.description || 'Recurring allowance'}`,
        amount: allowance.amount,
        isDetail: true,
      })),
      {
        id: 'gross-monthly-salary',
        item: 'Gross Monthly Salary',
        amount: summary.basicSalary + summary.totalAllowance,
        isSubtotal: true,
      },
      {
        id: 'employee-deductions',
        item: 'Employee Deductions',
        amount: -deductions.employeeTotal,
        isGroup: true,
      },
      {
        id: 'employee-epf',
        item: 'EPF',
        amount: -deductions.employeeEpf,
        isDetail: true,
      },
      {
        id: 'employee-socso',
        item: 'SOCSO',
        amount: -deductions.employeeSocso,
        isDetail: true,
      },
      {
        id: 'employee-eis',
        item: 'EIS',
        amount: -deductions.employeeEis,
        isDetail: true,
      },
    ],
    [
      deductions.employeeTotal,
      deductions.employeeEis,
      deductions.employeeEpf,
      deductions.employeeSocso,
      activeAllowanceItems,
      summary.basicSalary,
      summary.totalAllowance,
    ],
  )

  const handleProfileChange = (event) => {
    const { name, value } = event.target
    setProfile((prev) => {
      const nextProfile = { ...prev, [name]: value }
      if (name === 'effectiveMonth') {
        const nextYear = previousYearFromMonth(value)
        if (nextYear && nextYear !== String(prev.previousYearSnapshot?.year || '')) {
          nextProfile.previousYearSnapshot = normalizePreviousYearSnapshot({}, value)
        }
      }

      return nextProfile
    })
  }

  const handlePreviousYearSnapshotChange = (event) => {
    const { name, value } = event.target
    setProfile((prev) => ({
      ...prev,
      previousYearSnapshot: {
        ...normalizePreviousYearSnapshot(prev.previousYearSnapshot, prev.effectiveMonth),
        [name]: value,
      },
    }))
  }

  const handleAllowanceDraftChange = (event) => {
    const { name, value } = event.target
    setAllowanceDraft((prev) => ({ ...prev, [name]: value }))
  }

  const resetAllowanceDraft = () => {
    setAllowanceDraft(createAllowanceRow())
    setEditingAllowanceId(null)
    setShowAllowanceDraft(false)
  }

  const startAllowanceDraft = () => {
    setAllowanceDraft(createAllowanceRow())
    setEditingAllowanceId(null)
    setShowAllowanceDraft(true)
    setNotice(null)
  }

  const saveAllowanceDraft = () => {
    if (!allowanceDraft.description.trim() || Number(allowanceDraft.amount) <= 0) {
      setNotice({
        color: 'warning',
        message: 'Enter recurring allowance description and a valid amount.',
      })
      return
    }

    setProfile((prev) => ({
      ...prev,
      recurringAllowances: editingAllowanceId
        ? prev.recurringAllowances.map((allowance) =>
            allowance.id === editingAllowanceId
              ? {
                  ...allowanceDraft,
                  id: editingAllowanceId,
                  description: allowanceDraft.description.trim(),
                  endMonth: '',
                  active: true,
                }
              : allowance,
          )
        : [
            ...prev.recurringAllowances,
            {
              ...allowanceDraft,
              id: createAllowanceRow().id,
              description: allowanceDraft.description.trim(),
              endMonth: '',
              active: true,
            },
          ],
    }))
    resetAllowanceDraft()
    setNotice(null)
  }

  const removeAllowance = (id) => {
    setProfile((prev) => ({
      ...prev,
      recurringAllowances: prev.recurringAllowances.filter((allowance) => allowance.id !== id),
    }))

    if (editingAllowanceId === id) {
      resetAllowanceDraft()
    }
  }

  const editAllowance = (allowance) => {
    setAllowanceDraft({ ...allowance })
    setEditingAllowanceId(allowance.id)
    setShowAllowanceDraft(true)
    setNotice(null)
  }

  const renderRecurringAllowanceActions = (allowance) => (
    <DataTableActionMenu
      record={allowance}
      ariaLabel={`${allowance.description || 'Recurring allowance'} actions`}
      actions={[
        {
          key: 'edit',
          label: 'Edit',
          onClick: editAllowance,
        },
        {
          key: 'remove',
          label: 'Remove',
          danger: true,
          onClick: (selectedAllowance) => removeAllowance(selectedAllowance.id),
        },
      ]}
    />
  )

  const renderRecurringAllowanceMobileItem = (allowance) => (
    <div className="salary-recurring-mobile-row">
      <div className="salary-recurring-mobile-main">
        <strong className="salary-recurring-mobile-title">{allowance.description || '-'}</strong>
        <span className="salary-recurring-mobile-meta">{buildAllowanceMeta(allowance)}</span>
      </div>
      <strong className="salary-recurring-mobile-amount">{formatMoney(allowance.amount)}</strong>
      <div className="salary-recurring-mobile-actions">
        {renderRecurringAllowanceActions(allowance)}
      </div>
    </div>
  )

  const recurringAllowanceColumns = [
    {
      key: 'description',
      label: 'Description',
      render: (allowance) => <strong>{allowance.description || '-'}</strong>,
    },
    {
      key: 'meta',
      label: 'Reference',
      render: (allowance) => buildAllowanceMeta(allowance),
    },
    {
      key: 'amount',
      label: 'Amount',
      align: 'right',
      render: (allowance) => <strong>{formatMoney(allowance.amount)}</strong>,
    },
    {
      key: 'actions',
      label: '',
      align: 'center',
      shrinkToFit: true,
      width: '56px',
      cellClassName: 'salary-record-action-cell',
      headerClassName: 'salary-record-action-cell',
      render: renderRecurringAllowanceActions,
    },
  ]

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSavingProfile) return

    if (!profile.effectiveMonth) {
      setNotice({ color: 'warning', message: 'Select an effective month.' })
      return
    }

    if (!medicalEntitlementSetup && Number(profile.basicSalary) <= 0) {
      setNotice({ color: 'warning', message: 'Enter a valid fixed monthly salary.' })
      return
    }

    if (medicalEntitlementSetup && Number(profile.yearlyMedicalClaim) <= 0) {
      setNotice({
        color: 'warning',
        message: 'Enter an annual medical entitlement greater than RM0.00 before continuing.',
      })
      medicalEntitlementInputRef.current?.focus()
      return
    }

    const invalidAllowance = profile.recurringAllowances.some(
      (allowance) =>
        Boolean(allowance.description.trim()) !== Boolean(Number(allowance.amount) > 0),
    )

    if (invalidAllowance) {
      setNotice({
        color: 'warning',
        message: 'Complete both description and amount for each recurring allowance.',
      })
      return
    }

    try {
      setIsSavingProfile(true)
      const savedProfile = await saveSalaryProfile(profile)
      setProfile(savedProfile)
      if (medicalEntitlementSetup) {
        showToast('Medical entitlement saved. Returning to your medical claim.')
        onMedicalEntitlementSaved?.(savedProfile)
      } else {
        showToast(
          'Salary settings saved. Apply Salary uses these values for new monthly applications.',
        )
      }
    } catch (err) {
      setNotice({
        color: 'danger',
        message: err?.message || 'Could not save salary settings.',
      })
    } finally {
      setIsSavingProfile(false)
    }
  }

  if (isLoadingProfile) {
    return (
      <CCard className="salary-workspace">
        <CCardBody className="salary-section-body">
          <DataTableLoadingState message="Loading salary settings..." />
        </CCardBody>
      </CCard>
    )
  }

  const previousYearSnapshot = normalizePreviousYearSnapshot(
    profile.previousYearSnapshot,
    profile.effectiveMonth,
  )
  const previousYearSnapshotReadOnly = previousYearSnapshot.editable === false
  const previousYearSnapshotStatus =
    previousYearSnapshot.source === 'auto'
      ? `Using approved Dec ${previousYearSnapshot.year} salary record.`
      : previousYearSnapshot.source === 'manual'
        ? 'Manual snapshot from Salary Settings.'
        : `No approved Dec ${previousYearSnapshot.year} salary record found. Configure this snapshot for Salary Claim PDF reference.`
  const previousYearSnapshotTotal = formatMoney(
    Number(previousYearSnapshot.basicSalary || 0) +
      Number(previousYearSnapshot.allowanceTotal || 0) +
      Number(previousYearSnapshot.incrementAmount || 0),
  ).replace('RM ', '')

  return (
    <CForm onSubmit={handleSubmit} className="salary-settings-form salary-settings-card-stack">
      {medicalEntitlementSetup && (
        <CAlert color="info" className="mb-0">
          <strong>Complete your medical entitlement setup.</strong>
          <div className="small mt-1">
            Update Annual Medical Entitlement below, then save to return to your preserved medical
            claim draft.
          </div>
        </CAlert>
      )}
      <CCard className="salary-workspace">
        <CCardHeader className="salary-section-header">
          <h3 className="salary-form-panel-heading" id="salaryProfileHeading">
            Fixed Monthly Salary
          </h3>
        </CCardHeader>
        <CCardBody className="salary-section-body">
          <CRow className="g-3 salary-settings-profile-row">
            <CCol xs={12} md className="salary-settings-profile-col">
              <CFormLabel htmlFor="basicSalary" className="mb-1">
                Basic Salary
              </CFormLabel>
              <CFormInput
                id="basicSalary"
                name="basicSalary"
                type="number"
                min="0"
                step="0.01"
                value={profile.basicSalary}
                onChange={handleProfileChange}
              />
            </CCol>
            <CCol xs={12} md className="salary-settings-profile-col">
              <CFormLabel htmlFor="effectiveMonth" className="mb-1">
                Effective From
              </CFormLabel>
              <CFormInput
                id="effectiveMonth"
                name="effectiveMonth"
                type="month"
                value={profile.effectiveMonth}
                onChange={handleProfileChange}
              />
            </CCol>
            <CCol xs={12} md className="salary-settings-profile-col">
              <CFormLabel htmlFor="vehicle" className="mb-1">
                Vehicle
              </CFormLabel>
              <CFormInput
                id="vehicle"
                name="vehicle"
                value={profile.vehicle}
                onChange={handleProfileChange}
                placeholder="Vehicle plate or model"
              />
            </CCol>
            <CCol xs={12} md className="salary-settings-profile-col">
              <CFormLabel htmlFor="defaultMileageRate" className="mb-1">
                Mileage Rate / KM
              </CFormLabel>
              <CFormInput
                id="defaultMileageRate"
                name="defaultMileageRate"
                type="number"
                min="0"
                step="0.01"
                value={profile.defaultMileageRate}
                onChange={handleProfileChange}
              />
            </CCol>
            <CCol xs={12} md className="salary-settings-profile-col">
              <CFormLabel htmlFor="yearlyMedicalClaim" className="mb-1">
                Annual Medical Entitlement (RM)
              </CFormLabel>
              <CFormInput
                id="yearlyMedicalClaim"
                ref={medicalEntitlementInputRef}
                name="yearlyMedicalClaim"
                type="number"
                min="0"
                step="0.01"
                aria-describedby="yearlyMedicalClaimHelp"
                value={profile.yearlyMedicalClaim}
                onChange={handleProfileChange}
              />
              <div id="yearlyMedicalClaimHelp" className="form-text">
                Enter your annual medical claim limit. HR can verify the entitlement when reviewing
                submitted claims.
              </div>
            </CCol>
          </CRow>
        </CCardBody>

        <CCardHeader className="salary-section-header">
          <h3 className="salary-form-panel-heading" id="recurringAllowancesHeading">
            Recurring Monthly Additions
          </h3>
          {!showAllowanceDraft && (
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              type="button"
              onClick={startAllowanceDraft}
            >
              Add Recurring Allowance
            </CButton>
          )}
        </CCardHeader>

        <CCardBody className="salary-section-body">
          {showAllowanceDraft && (
            <>
              <CRow className="g-3 salary-claim-field-row">
                <CCol xs={12} md className="salary-claim-grow-col">
                  <CFormLabel htmlFor="recurringAllowanceDescription" className="mb-1">
                    Description
                  </CFormLabel>
                  <CFormInput
                    id="recurringAllowanceDescription"
                    name="description"
                    value={allowanceDraft.description}
                    onChange={handleAllowanceDraftChange}
                    placeholder="Phone allowance"
                  />
                </CCol>
                <CCol xs={12} md="auto" className="salary-claim-amount-col">
                  <CFormLabel htmlFor="recurringAllowanceAmount" className="mb-1">
                    Amount
                  </CFormLabel>
                  <CFormInput
                    id="recurringAllowanceAmount"
                    name="amount"
                    type="number"
                    min="0"
                    step="0.01"
                    value={allowanceDraft.amount}
                    onChange={handleAllowanceDraftChange}
                  />
                </CCol>
                <CCol xs={12} md="auto" className="salary-settings-month-col">
                  <CFormLabel htmlFor="recurringAllowanceStart" className="mb-1">
                    Start
                  </CFormLabel>
                  <CFormInput
                    id="recurringAllowanceStart"
                    name="startMonth"
                    type="month"
                    value={allowanceDraft.startMonth}
                    onChange={handleAllowanceDraftChange}
                  />
                </CCol>
              </CRow>
              <div className="salary-claim-draft-actions">
                <CButton
                  color="primary"
                  size="sm"
                  type="button"
                  className="salary-claim-draft-button"
                  onClick={saveAllowanceDraft}
                >
                  Save
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  type="button"
                  className="salary-claim-draft-button"
                  onClick={resetAllowanceDraft}
                >
                  Cancel
                </CButton>
              </div>
            </>
          )}

          {(profile.recurringAllowances.length || !showAllowanceDraft) && (
            <SalaryEmbeddedTable
              rows={profile.recurringAllowances}
              columns={recurringAllowanceColumns}
              getRowKey={(allowance) => allowance.id}
              emptyMessage="No recurring additions configured."
              mobileMode="stacked"
              renderMobileItem={renderRecurringAllowanceMobileItem}
            />
          )}
        </CCardBody>

        <CCardHeader className="salary-section-header">
          <div>
            <h3 className="salary-form-panel-heading" id="previousYearSnapshotHeading">
              Previous Year Salary Snapshot
            </h3>
            <div className="text-muted small">
              Used for the prior-year reference column in Salary Claim PDFs when no approved
              December salary record exists.
            </div>
          </div>
        </CCardHeader>

        <CCardBody className="salary-section-body">
          <div className="salary-settings-snapshot-meta">
            <span className="fw-semibold">{previousYearSnapshot.year}</span>
            <span className="text-muted">{previousYearSnapshotStatus}</span>
          </div>
          <CRow className="g-3 salary-settings-profile-row">
            <CCol xs={12} md className="salary-settings-profile-col">
              <CFormLabel htmlFor="previousYearBasicSalary" className="mb-1">
                Basic
              </CFormLabel>
              <CFormInput
                id="previousYearBasicSalary"
                name="basicSalary"
                type="number"
                min="0"
                step="0.01"
                value={previousYearSnapshot.basicSalary}
                onChange={handlePreviousYearSnapshotChange}
                readOnly={previousYearSnapshotReadOnly}
              />
            </CCol>
            <CCol xs={12} md className="salary-settings-profile-col">
              <CFormLabel htmlFor="previousYearAllowanceTotal" className="mb-1">
                Allowance
              </CFormLabel>
              <CFormInput
                id="previousYearAllowanceTotal"
                name="allowanceTotal"
                type="number"
                min="0"
                step="0.01"
                value={previousYearSnapshot.allowanceTotal}
                onChange={handlePreviousYearSnapshotChange}
                readOnly={previousYearSnapshotReadOnly}
              />
            </CCol>
            <CCol xs={12} md className="salary-settings-profile-col">
              <CFormLabel htmlFor="previousYearIncrementAmount" className="mb-1">
                Increment
              </CFormLabel>
              <CFormInput
                id="previousYearIncrementAmount"
                name="incrementAmount"
                type="number"
                min="0"
                step="0.01"
                value={previousYearSnapshot.incrementAmount}
                onChange={handlePreviousYearSnapshotChange}
                readOnly={previousYearSnapshotReadOnly}
              />
            </CCol>
            <CCol xs={12} md className="salary-settings-profile-col">
              <CFormLabel htmlFor="previousYearSnapshotTotal" className="mb-1">
                Total
              </CFormLabel>
              <CFormInput
                id="previousYearSnapshotTotal"
                value={previousYearSnapshotTotal}
                readOnly
              />
            </CCol>
          </CRow>
        </CCardBody>

        <CCardBody className="salary-settings-actions-body">
          {notice && (
            <CAlert
              color={notice.color}
              className="py-2"
              dismissible
              onClose={() => setNotice(null)}
            >
              <div className="salary-settings-notice">
                <span>{notice.message}</span>
              </div>
            </CAlert>
          )}

          <div className="salary-submit-actions">
            <CButton
              color="primary"
              size="sm"
              type="submit"
              disabled={isLoadingProfile || isSavingProfile}
            >
              {isSavingProfile
                ? 'Saving'
                : medicalEntitlementSetup
                  ? 'Save and Return to Medical Claim'
                  : 'Save Salary'}
            </CButton>
          </div>
        </CCardBody>
      </CCard>

      <CCard className="salary-workspace">
        <CCardHeader className="salary-section-header">
          <h3 className="salary-form-panel-heading" id="salarySettingsPreviewHeading">
            Monthly Payable Salary Preview
          </h3>
        </CCardHeader>
        <CCardBody className="salary-section-body">
          <SalaryPayablePreviewTable
            rows={payablePreviewRows}
            payableSalary={summary.payableSalary}
          />
        </CCardBody>
      </CCard>
    </CForm>
  )
}

export default SalarySettings
