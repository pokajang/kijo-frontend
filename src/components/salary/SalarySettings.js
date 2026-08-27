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
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
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

const cloneSalaryProfile = (profile) => ({
  ...profile,
  recurringAllowances: (profile?.recurringAllowances || []).map((allowance) => ({ ...allowance })),
  previousYearSnapshot: profile?.previousYearSnapshot
    ? { ...profile.previousYearSnapshot }
    : profile?.previousYearSnapshot,
})

const SalarySettings = ({ medicalEntitlementSetup = false, onMedicalEntitlementSaved }) => {
  const [profile, setProfile] = useState(getSalaryProfile)
  const [savedProfile, setSavedProfile] = useState(() => cloneSalaryProfile(getSalaryProfile()))
  const [viewMode, setViewMode] = useState(medicalEntitlementSetup ? 'edit' : 'preview')
  const [allowanceDraft, setAllowanceDraft] = useState(createAllowanceRow)
  const [allowanceDraftErrors, setAllowanceDraftErrors] = useState({})
  const [editingAllowanceId, setEditingAllowanceId] = useState(null)
  const [showAllowanceDraft, setShowAllowanceDraft] = useState(false)
  const [notice, setNotice] = useState(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState(null)
  const [showDiscardDialog, setShowDiscardDialog] = useState(false)
  const medicalEntitlementInputRef = useRef(null)
  const basicSalaryInputRef = useRef(null)
  const effectiveMonthInputRef = useRef(null)
  const recurringAllowanceDescriptionInputRef = useRef(null)

  useEffect(() => {
    let isMounted = true

    fetchSalaryProfile()
      .then((loadedProfile) => {
        if (!isMounted) return
        setProfile(loadedProfile)
        setSavedProfile(cloneSalaryProfile(loadedProfile))
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

  useEffect(() => {
    if (medicalEntitlementSetup) setViewMode('edit')
  }, [medicalEntitlementSetup])

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
    setFieldErrors((currentErrors) => {
      if (!currentErrors[name]) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors[name]
      return nextErrors
    })
    setSuccessMessage(null)
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
    setAllowanceDraftErrors((currentErrors) => {
      if (!currentErrors[name]) return currentErrors
      const nextErrors = { ...currentErrors }
      delete nextErrors[name]
      return nextErrors
    })
    setAllowanceDraft((prev) => ({ ...prev, [name]: value }))
  }

  const resetAllowanceDraft = () => {
    setAllowanceDraft(createAllowanceRow())
    setAllowanceDraftErrors({})
    setEditingAllowanceId(null)
    setShowAllowanceDraft(false)
  }

  const startAllowanceDraft = () => {
    setAllowanceDraft(createAllowanceRow())
    setAllowanceDraftErrors({})
    setEditingAllowanceId(null)
    setShowAllowanceDraft(true)
    setNotice(null)
  }

  const saveAllowanceDraft = () => {
    const nextErrors = {}
    if (!allowanceDraft.description.trim()) {
      nextErrors.description = 'Enter an allowance description.'
    }
    if (Number(allowanceDraft.amount) <= 0) {
      nextErrors.amount = 'Enter an amount greater than RM0.00.'
    }

    if (Object.keys(nextErrors).length) {
      setAllowanceDraftErrors(nextErrors)
      if (nextErrors.description) recurringAllowanceDescriptionInputRef.current?.focus()
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
    setAllowanceDraftErrors({})
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

  const isDirty = Boolean(savedProfile) && JSON.stringify(profile) !== JSON.stringify(savedProfile)
  const hasUnsavedChanges = isDirty || showAllowanceDraft

  const startEditing = () => {
    setViewMode('edit')
    setNotice(null)
    setSuccessMessage(null)
    setFieldErrors({})
  }

  const discardChanges = () => {
    if (savedProfile) setProfile(cloneSalaryProfile(savedProfile))
    resetAllowanceDraft()
    setFieldErrors({})
    setNotice(null)
    setShowDiscardDialog(false)
    setViewMode('preview')
  }

  const handleCancelEdit = () => {
    if (hasUnsavedChanges) {
      setShowDiscardDialog(true)
      return
    }

    discardChanges()
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSavingProfile) return

    if (showAllowanceDraft) {
      setNotice({
        color: 'warning',
        message:
          'Save or cancel the recurring allowance currently being edited before saving settings.',
      })
      recurringAllowanceDescriptionInputRef.current?.focus()
      return
    }

    const nextFieldErrors = {}
    let firstInvalidInput = null

    if (!medicalEntitlementSetup && !profile.effectiveMonth) {
      nextFieldErrors.effectiveMonth = 'Select the month these settings take effect.'
      firstInvalidInput = effectiveMonthInputRef.current
    }

    if (!medicalEntitlementSetup && Number(profile.basicSalary) <= 0) {
      nextFieldErrors.basicSalary = 'Enter a fixed monthly salary greater than RM0.00.'
      if (!firstInvalidInput) firstInvalidInput = basicSalaryInputRef.current
    }

    if (medicalEntitlementSetup && Number(profile.yearlyMedicalClaim) <= 0) {
      nextFieldErrors.yearlyMedicalClaim =
        'Enter an annual medical entitlement greater than RM0.00.'
      if (!firstInvalidInput) firstInvalidInput = medicalEntitlementInputRef.current
    }

    if (Object.keys(nextFieldErrors).length) {
      setFieldErrors(nextFieldErrors)
      setNotice(null)
      firstInvalidInput?.focus()
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
      const nextSavedProfile = await saveSalaryProfile(profile)
      setProfile(nextSavedProfile)
      setSavedProfile(cloneSalaryProfile(nextSavedProfile))
      setFieldErrors({})
      setNotice(null)

      if (medicalEntitlementSetup) {
        showToast('Medical entitlement saved. Returning to your medical claim.')
        onMedicalEntitlementSaved?.(nextSavedProfile)
        return
      }

      setSuccessMessage('Salary settings saved. Payable Salary now reflects the updated values.')
      setViewMode('preview')
      showToast('Salary settings saved.')
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
      <CCard className="salary-settings-card">
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
  const renderFieldError = (field) =>
    fieldErrors[field] ? <div className="invalid-feedback d-block">{fieldErrors[field]}</div> : null
  const renderAllowanceDraftError = (field) =>
    allowanceDraftErrors[field] ? (
      <div className="invalid-feedback d-block">{allowanceDraftErrors[field]}</div>
    ) : null

  const medicalEntitlementEditor = (
    <CForm onSubmit={handleSubmit} className="salary-settings-form salary-settings-card-stack">
      <CCard className="salary-settings-card">
        <CCardHeader className="salary-section-header">
          <h2 className="salary-form-panel-heading mb-0">Annual Medical Entitlement</h2>
        </CCardHeader>
        <CCardBody className="salary-section-body">
          <p className="text-muted small mb-3">
            Set the annual limit for this medical claim, then continue with the preserved draft.
          </p>
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
            invalid={Boolean(fieldErrors.yearlyMedicalClaim)}
            aria-describedby="yearlyMedicalClaimHelp"
            value={profile.yearlyMedicalClaim}
            onChange={handleProfileChange}
          />
          {renderFieldError('yearlyMedicalClaim')}
          <div id="yearlyMedicalClaimHelp" className="form-text">
            HR can verify this entitlement when reviewing submitted claims.
          </div>
        </CCardBody>
        <CCardBody className="salary-settings-actions-body">
          {notice && (
            <CAlert
              color={notice.color}
              className="py-2 mb-3"
              dismissible
              onClose={() => setNotice(null)}
            >
              {notice.message}
            </CAlert>
          )}
          <div className="salary-submit-actions">
            <CButton color="primary" size="sm" type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? 'Saving' : 'Save and Return to Medical Claim'}
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    </CForm>
  )

  const preview = (
    <div className="salary-settings-card-stack">
      {notice && (
        <CAlert color={notice.color} className="mb-0" dismissible onClose={() => setNotice(null)}>
          {notice.message}
        </CAlert>
      )}
      {successMessage && (
        <CAlert
          color="success"
          className="mb-0"
          dismissible
          onClose={() => setSuccessMessage(null)}
        >
          {successMessage}
        </CAlert>
      )}
      <CCard className="salary-settings-card salary-settings-preview-card">
        <CCardHeader className="salary-section-header">
          <div>
            <h2 className="salary-form-panel-heading mb-0">Payable Salary</h2>
            <div className="text-muted small">
              {profile.effectiveMonth
                ? `Effective from ${formatMonthLabel(profile.effectiveMonth)}`
                : 'Set an effective month to calculate your salary'}
            </div>
          </div>
          <CButton color="primary" variant="outline" size="sm" type="button" onClick={startEditing}>
            Edit settings
          </CButton>
        </CCardHeader>
        <CCardBody className="salary-section-body">
          <SalaryPayablePreviewTable
            rows={payablePreviewRows}
            payableSalary={summary.payableSalary}
          />
          <details className="salary-settings-calculation-settings">
            <summary>Calculation settings</summary>
            <div
              className="salary-settings-summary-grid"
              aria-label="Current salary settings summary"
            >
              <div className="salary-settings-summary-item">
                <span>Effective from</span>
                <strong>{formatMonthLabel(profile.effectiveMonth) || 'Not set'}</strong>
              </div>
              <div className="salary-settings-summary-item">
                <span>Medical entitlement</span>
                <strong>{formatMoney(profile.yearlyMedicalClaim || 0)}</strong>
              </div>
              <div className="salary-settings-summary-item">
                <span>Mileage rate</span>
                <strong>{formatMoney(profile.defaultMileageRate || 0)} / KM</strong>
              </div>
            </div>
          </details>
        </CCardBody>
      </CCard>
    </div>
  )

  const editor = (
    <CForm onSubmit={handleSubmit} className="salary-settings-form salary-settings-card-stack">
      <CCard className="salary-settings-card">
        <CCardHeader className="salary-section-header">
          <div>
            <h2 className="salary-form-panel-heading mb-0">Edit salary settings</h2>
            <div className="text-muted small">
              Changes are used for future salary applications and claims.
            </div>
          </div>
        </CCardHeader>
        <CCardBody className="salary-section-body">
          <section className="salary-settings-section" aria-labelledby="salaryBasisHeading">
            <h3 className="salary-settings-section-heading" id="salaryBasisHeading">
              Salary basis
            </h3>
            <CRow className="g-3 salary-settings-profile-row">
              <CCol xs={12} md={6} className="salary-settings-profile-col">
                <CFormLabel htmlFor="basicSalary" className="mb-1">
                  Basic Salary (RM)
                </CFormLabel>
                <CFormInput
                  id="basicSalary"
                  ref={basicSalaryInputRef}
                  name="basicSalary"
                  type="number"
                  min="0"
                  step="0.01"
                  value={profile.basicSalary}
                  onChange={handleProfileChange}
                  invalid={Boolean(fieldErrors.basicSalary)}
                />
                {renderFieldError('basicSalary')}
              </CCol>
              <CCol xs={12} md={6} className="salary-settings-profile-col">
                <CFormLabel htmlFor="effectiveMonth" className="mb-1">
                  Effective From
                </CFormLabel>
                <CFormInput
                  id="effectiveMonth"
                  ref={effectiveMonthInputRef}
                  name="effectiveMonth"
                  type="month"
                  value={profile.effectiveMonth}
                  onChange={handleProfileChange}
                  invalid={Boolean(fieldErrors.effectiveMonth)}
                />
                {renderFieldError('effectiveMonth')}
              </CCol>
            </CRow>
          </section>

          <section className="salary-settings-section" aria-labelledby="claimEntitlementsHeading">
            <h3 className="salary-settings-section-heading" id="claimEntitlementsHeading">
              Claim entitlements
            </h3>
            <CRow className="g-3 salary-settings-profile-row">
              <CCol xs={12} md={4} className="salary-settings-profile-col">
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
                  value={profile.yearlyMedicalClaim}
                  onChange={handleProfileChange}
                />
              </CCol>
              <CCol xs={12} md={4} className="salary-settings-profile-col">
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
              <CCol xs={12} md={4} className="salary-settings-profile-col">
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
            </CRow>
          </section>

          <section className="salary-settings-section" aria-labelledby="recurringAllowancesHeading">
            <div className="salary-settings-section-heading-row">
              <h3 className="salary-settings-section-heading mb-0" id="recurringAllowancesHeading">
                Recurring monthly additions
              </h3>
              {!showAllowanceDraft && (
                <CButton
                  color="primary"
                  variant="outline"
                  size="sm"
                  type="button"
                  onClick={startAllowanceDraft}
                >
                  Add recurring allowance
                </CButton>
              )}
            </div>
            {showAllowanceDraft && (
              <>
                <CRow className="g-3 salary-claim-field-row mt-0">
                  <CCol xs={12} md className="salary-claim-grow-col">
                    <CFormLabel htmlFor="recurringAllowanceDescription" className="mb-1">
                      Description
                    </CFormLabel>
                    <CFormInput
                      id="recurringAllowanceDescription"
                      ref={recurringAllowanceDescriptionInputRef}
                      name="description"
                      value={allowanceDraft.description}
                      onChange={handleAllowanceDraftChange}
                      placeholder="Phone allowance"
                      invalid={Boolean(allowanceDraftErrors.description)}
                    />
                    {renderAllowanceDraftError('description')}
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
                      invalid={Boolean(allowanceDraftErrors.amount)}
                    />
                    {renderAllowanceDraftError('amount')}
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
                    Save allowance
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
          </section>

          <details className="salary-settings-advanced">
            <summary>Previous year salary snapshot</summary>
            <p className="text-muted small mb-3">
              Used for the prior-year reference in Salary Claim PDFs when no approved December
              salary record exists.
            </p>
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
          </details>
        </CCardBody>
        <CCardBody className="salary-settings-actions-body">
          {notice && (
            <CAlert
              color={notice.color}
              className="py-2 mb-3"
              dismissible
              onClose={() => setNotice(null)}
            >
              {notice.message}
            </CAlert>
          )}
          <div className="salary-submit-actions">
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              type="button"
              onClick={handleCancelEdit}
            >
              Cancel
            </CButton>
            <CButton color="primary" size="sm" type="submit" disabled={isSavingProfile}>
              {isSavingProfile ? 'Saving' : 'Save salary settings'}
            </CButton>
          </div>
        </CCardBody>
      </CCard>
    </CForm>
  )

  return (
    <>
      {medicalEntitlementSetup
        ? medicalEntitlementEditor
        : viewMode === 'preview'
          ? preview
          : editor}
      <CModal
        visible={showDiscardDialog}
        onClose={() => setShowDiscardDialog(false)}
        alignment="center"
      >
        <CModalHeader closeButton>
          <CModalTitle>Discard unsaved changes?</CModalTitle>
        </CModalHeader>
        <CModalBody>Your edited salary settings have not been saved.</CModalBody>
        <CModalFooter>
          <CButton color="secondary" variant="outline" onClick={() => setShowDiscardDialog(false)}>
            Keep editing
          </CButton>
          <CButton color="danger" onClick={discardChanges}>
            Discard changes
          </CButton>
        </CModalFooter>
      </CModal>
    </>
  )
}

export default SalarySettings
