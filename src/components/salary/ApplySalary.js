import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilExternalLink, cilPencil, cilTrash } from '@coreui/icons'
import {
  CAlert,
  CButton,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CListGroup,
  CListGroupItem,
  CRow,
  CSpinner,
} from '@coreui/react'
import { DataTableLoadingState, DataTableStatusBadge } from '../datatable'
import { useApplySalaryHandlers } from './actionHandlers'
import { formatAttachmentSize } from './attachmentUtils'
import {
  AttachmentInput,
  AttachmentPreviewModal,
  ClaimDraftActions,
  FormPanelHeading,
} from './claim-ui/ClaimFormPrimitives'
export {
  AttachmentInput,
  AttachmentPreviewModal,
  ClaimDraftActions,
  FormPanelHeading,
} from './claim-ui/ClaimFormPrimitives'
import { formatMoney, roundMoney } from './salaryCalculations'
import {
  createSalaryPreviewColumns,
  formatSignedSalaryMoney,
  SalaryPayablePreviewTable,
} from './SalaryTables'

const colorByType = {
  success: 'success',
  warning: 'warning',
  error: 'danger',
  info: 'info',
}

const formatKm = (value) => {
  const number = Number(value || 0)
  if (!Number.isFinite(number)) return '0'
  return Number.isInteger(number) ? String(number) : String(roundMoney(number))
}

const formatMileageMeta = (item = {}) => {
  const oneWayKm = Number(item.km || 0)
  if (!oneWayKm) return null

  return `${formatKm(oneWayKm)} KM one-way / ${formatKm(oneWayKm * 2)} KM return`
}

export const ClaimList = ({
  title,
  items,
  type,
  onEdit,
  onRemove,
  onPreviewAttachment,
  showKm = false,
}) => {
  if (!items.length) return null

  return (
    <CListGroup className="salary-claim-list" aria-label={`${title} items`}>
      {items.map((item) => (
        <CListGroupItem className="salary-claim-list-row" key={item.id}>
          <div className="salary-claim-list-content">
            <span className="salary-claim-list-title">{item.description}</span>
            <span className="salary-claim-list-meta">
              {[item.date, item.sourceLabel, showKm ? formatMileageMeta(item) : null]
                .filter(Boolean)
                .join(' - ')}
            </span>
            {item.attachment && (
              <span className="salary-claim-list-meta">
                {item.attachment.name} ({formatAttachmentSize(item.attachment.size)})
              </span>
            )}
          </div>
          <div className="salary-claim-list-actions">
            <strong>{formatMoney(item.amount)}</strong>
            {(item.attachment?.dataUrl ||
              item.attachment?.url ||
              item.attachment?.downloadUrl ||
              onEdit ||
              onRemove) && (
              <div className="salary-claim-row-controls" aria-label={`${item.description} actions`}>
                {(item.attachment?.dataUrl ||
                  item.attachment?.url ||
                  item.attachment?.downloadUrl) && (
                  <CButton
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    className="salary-claim-icon-button"
                    type="button"
                    title="Open attachment"
                    aria-label={`Open ${item.attachment.name}`}
                    onClick={() => onPreviewAttachment?.(item.attachment)}
                  >
                    <CIcon icon={cilExternalLink} size="sm" />
                  </CButton>
                )}
                {onEdit && (
                  <CButton
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    className="salary-claim-icon-button"
                    type="button"
                    title="Edit"
                    aria-label={`Edit ${item.description}`}
                    onClick={() => onEdit(type, item.id)}
                  >
                    <CIcon icon={cilPencil} size="sm" />
                  </CButton>
                )}
                {onRemove && (
                  <CButton
                    color="danger"
                    variant="ghost"
                    size="sm"
                    className="salary-claim-icon-button salary-claim-icon-button--danger"
                    type="button"
                    title="Remove"
                    aria-label={`Remove ${item.description}`}
                    onClick={() => onRemove(type, item.id)}
                  >
                    <CIcon icon={cilTrash} size="sm" />
                  </CButton>
                )}
              </div>
            )}
          </div>
        </CListGroupItem>
      ))}
    </CListGroup>
  )
}

export const formatSalaryPeriod = (salaryMonth) => {
  if (!salaryMonth) return 'Current period'

  const [year, month] = salaryMonth.split('-').map(Number)
  if (!year || !month) return salaryMonth

  return new Date(year, month - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  })
}

const toSalaryMonthValue = (date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

const buildSalaryMonthOptions = (baseDate = new Date()) =>
  [0, 1, 2].map((offset) => {
    const date = new Date(baseDate.getFullYear(), baseDate.getMonth() - offset, 1)
    const value = toSalaryMonthValue(date)

    return {
      value,
      label: formatSalaryPeriod(value),
    }
  })

const buildClaimBreakdownGroup = ({ key, label, total, items, note }) => {
  const hasClaimValue = Number(total || 0) > 0 || items.some((item) => Number(item.amount || 0) > 0)

  if (!hasClaimValue) return []

  return [
    {
      id: key,
      item: label,
      amount: total,
      isGroup: true,
      note,
    },
    ...items.map((item, index) => {
      const attachmentName = item.attachment
        ? `${item.attachment.name || item.attachment.originalName || 'attachment'}${
            item.attachment.size ? ` (${formatAttachmentSize(item.attachment.size)})` : ''
          }`
        : ''

      return {
        id: `${key}-${item.id || index}`,
        item: (
          <>
            <span>
              {index + 1}. {item.description || label}
            </span>
            {attachmentName && (
              <span className="salary-preview-note salary-preview-note--inline">
                {attachmentName}
              </span>
            )}
          </>
        ),
        amount: item.amount,
        claimId: item.id,
        claimType: key,
        canEditClaim: item.source !== 'profile',
        attachment: item.attachment || null,
        actionLabel: item.description || label,
        badge:
          key === 'allowance'
            ? {
                label: item.source === 'profile' ? 'Recurring' : 'Non-recurring',
                tone: item.source === 'profile' ? 'info' : 'secondary',
              }
            : null,
        isDetail: true,
      }
    }),
  ]
}

const sortAllowanceItemsForSummary = (items = []) => [
  ...items.filter((item) => item.source === 'profile'),
  ...items.filter((item) => item.source !== 'profile'),
]

const firstEditableClaimType = (record) => {
  const firstClaimType = record?.claims?.find((claim) => ['Allowance'].includes(claim?.type))?.type

  return firstClaimType ? firstClaimType.toLowerCase() : null
}

const ApplySalary = ({
  onViewRecords,
  onViewRecord,
  editRecord,
  amendmentReason = '',
  showAdjustments: controlledShowAdjustments,
  onShowAdjustmentsChange,
  showAddAdjustmentAction = false,
}) => {
  const initialEditClaimType = firstEditableClaimType(editRecord)
  const [internalShowAdjustments, setInternalShowAdjustments] = useState(
    Boolean(initialEditClaimType),
  )
  const [showClaimDraft, setShowClaimDraft] = useState(Boolean(initialEditClaimType))
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const [notice, setNotice] = useState({
    visible: false,
    message: '',
    color: 'info',
    scope: 'general',
  })
  const submissionErrorRef = useRef(null)

  const showNotice = useCallback((type, message, options = {}) => {
    const normalizedType = colorByType[type] ? type : 'info'
    setNotice({
      visible: true,
      message,
      color: colorByType[normalizedType],
      scope: options.scope || 'general',
    })
  }, [])

  const hideNotice = useCallback(() => {
    setNotice((prev) => ({ ...prev, visible: false }))
  }, [])

  const showAdjustments = controlledShowAdjustments ?? internalShowAdjustments
  const setShowAdjustments = useCallback(
    (value) => {
      const nextValue = typeof value === 'function' ? value(showAdjustments) : value

      if (controlledShowAdjustments === undefined) {
        setInternalShowAdjustments(nextValue)
      }
      onShowAdjustmentsChange?.(nextValue)
    },
    [controlledShowAdjustments, onShowAdjustmentsChange, showAdjustments],
  )

  useEffect(() => {
    if (showAdjustments && !initialEditClaimType) {
      setShowClaimDraft(true)
    }
  }, [initialEditClaimType, showAdjustments])

  const {
    formData,
    allowanceItems,
    attachmentInputVersion,
    attachmentProcessing,
    summary,
    draftSaveState,
    draftSaveError,
    retryDraftSync,
    isSubmitting,
    isSwitchingSalaryMonth,
    selectedMonthRecord,
    isSelectedMonthLocked,
    requiresExistingRecordEdit,
    handleChange,
    handleAttachmentChange,
    handleSalaryMonthSelect,
    resumeSelectedMonthDraft,
    editSelectedMonthRecord,
    addAllowance,
    removeClaimItem,
    startEditClaimItem,
    resetForm,
    resetClaimDrafts,
    handleSubmit,
    isLoadingProfile,
  } = useApplySalaryHandlers({
    onNotify: showNotice,
    initialRecord: editRecord,
    amendmentReason,
  })

  useEffect(() => {
    if (notice.visible && notice.scope === 'submission-error') {
      submissionErrorRef.current?.focus()
    }
  }, [notice])

  const showSubmissionPanel =
    isSubmitting || (notice.visible && notice.scope === 'submission-success')
  const draftStatusText =
    {
      dirty: 'Draft pending save',
      saving: 'Saving draft...',
      saved: 'Draft saved',
      restored: 'Draft restored',
      error: 'Saved on this device, but not synced to server',
    }[draftSaveState] || ''
  const salaryMonthOptions = useMemo(() => buildSalaryMonthOptions(), [])
  const selectedSalaryPeriod = formatSalaryPeriod(
    formData.salaryMonth || salaryMonthOptions[0]?.value,
  )
  const handleSelectSalaryMonth = useCallback(
    (salaryMonth) => {
      hideNotice()
      setShowAdjustments(false)
      setShowClaimDraft(false)
      handleSalaryMonthSelect(salaryMonth)
    },
    [handleSalaryMonthSelect, hideNotice, setShowAdjustments],
  )
  const handleViewSelectedRecord = useCallback(() => {
    if (selectedMonthRecord) {
      onViewRecord?.(selectedMonthRecord)
      return
    }
    onViewRecords?.()
  }, [onViewRecord, onViewRecords, selectedMonthRecord])
  const selectedMonthNotice = useMemo(() => {
    if (!selectedMonthRecord) return null
    const status = selectedMonthRecord.status
    if (status === 'Draft') {
      return {
        color: 'info',
        message: 'Draft found for this month.',
        actions: [
          {
            label: 'Resume Draft',
            onClick: resumeSelectedMonthDraft,
          },
        ],
      }
    }
    if (isSelectedMonthLocked) {
      return {
        color: 'warning',
        message: 'This salary month is locked after review.',
        actions: [
          {
            label: 'View Record',
            onClick: handleViewSelectedRecord,
          },
        ],
      }
    }
    if (requiresExistingRecordEdit) {
      return {
        color: 'info',
        message: 'Salary application already exists for this month.',
        actions: [
          {
            label: 'Edit Existing',
            onClick: editSelectedMonthRecord,
          },
          {
            label: 'View Record',
            onClick: handleViewSelectedRecord,
          },
        ],
      }
    }
    return null
  }, [
    editSelectedMonthRecord,
    handleViewSelectedRecord,
    isSelectedMonthLocked,
    requiresExistingRecordEdit,
    resumeSelectedMonthDraft,
    selectedMonthRecord,
  ])
  const deductions = summary.deductions
  const manualAllowanceItems = allowanceItems.filter((item) => item.source !== 'profile')
  const claimBreakdownRows = useMemo(
    () => [
      ...buildClaimBreakdownGroup({
        key: 'allowance',
        label: 'Salary Adjustment',
        total: summary.totalAllowance,
        items: sortAllowanceItemsForSummary(allowanceItems),
      }),
    ],
    [allowanceItems, summary.totalAllowance],
  )
  const payablePreviewRows = useMemo(
    () => [
      {
        id: 'basic-salary',
        item: 'Basic Salary',
        amount: summary.basicSalary,
      },
      {
        id: 'claims-total',
        item: 'Claims Total',
        amount: summary.claimsTotal,
      },
      ...claimBreakdownRows.map((row) => ({
        ...row,
        id: `summary-${row.id}`,
        isClaimGroup: row.isGroup,
        isClaimItem: row.isDetail,
        isGroup: false,
        isDetail: true,
        canEditClaim: row.canEditClaim && !isSelectedMonthLocked && !requiresExistingRecordEdit,
      })),
      {
        id: 'gross-salary',
        item: 'Gross Salary',
        amount: summary.basicSalary + summary.claimsTotal,
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
      claimBreakdownRows,
      isSelectedMonthLocked,
      requiresExistingRecordEdit,
      summary.basicSalary,
      summary.claimsTotal,
    ],
  )

  const handleApplyAnother = () => {
    resetForm()
    hideNotice()
    setShowAdjustments(false)
    setShowClaimDraft(false)
  }

  const handleCancelClaimDraft = () => {
    resetClaimDrafts()
    hideNotice()
    setShowClaimDraft(false)
  }

  const handleSaveClaimDraft = (saveClaim) => {
    if (!saveClaim()) return
    hideNotice()
    setShowClaimDraft(false)
  }

  const handleEditClaimItem = useCallback(
    (type, id) => {
      if (!startEditClaimItem(type, id)) return

      hideNotice()
      setShowAdjustments(true)
      setShowClaimDraft(true)
    },
    [hideNotice, setShowAdjustments, startEditClaimItem],
  )

  const payablePreviewColumns = useMemo(() => {
    const [itemColumn, amountColumn] = createSalaryPreviewColumns()

    return [
      itemColumn,
      {
        ...amountColumn,
        render: (row) => {
          const amount =
            row.isDetail || row.isClaimItem ? (
              formatSignedSalaryMoney(row.amount)
            ) : (
              <strong>{formatSignedSalaryMoney(row.amount)}</strong>
            )

          if (!row.canEditClaim) return amount

          return (
            <span className="salary-summary-claim-actions">
              <span>{amount}</span>
              <span className="salary-claim-row-controls salary-summary-claim-row-controls">
                {(row.attachment?.dataUrl ||
                  row.attachment?.url ||
                  row.attachment?.downloadUrl) && (
                  <CButton
                    color="secondary"
                    variant="ghost"
                    size="sm"
                    className="salary-claim-icon-button"
                    type="button"
                    title="Open attachment"
                    aria-label={`Open ${row.attachment.name || row.attachment.originalName || 'attachment'}`}
                    onClick={() => setPreviewAttachment(row.attachment)}
                  >
                    <CIcon icon={cilExternalLink} size="sm" />
                  </CButton>
                )}
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  className="salary-claim-icon-button"
                  type="button"
                  title="Edit"
                  aria-label={`Edit ${row.actionLabel || 'claim'}`}
                  onClick={() => handleEditClaimItem(row.claimType, row.claimId)}
                >
                  <CIcon icon={cilPencil} size="sm" />
                </CButton>
                <CButton
                  color="danger"
                  variant="ghost"
                  size="sm"
                  className="salary-claim-icon-button salary-claim-icon-button--danger"
                  type="button"
                  title="Remove"
                  aria-label={`Remove ${row.actionLabel || 'claim'}`}
                  onClick={() => removeClaimItem(row.claimType, row.claimId)}
                >
                  <CIcon icon={cilTrash} size="sm" />
                </CButton>
              </span>
            </span>
          )
        },
      },
    ]
  }, [handleEditClaimItem, removeClaimItem])

  const renderPayablePreviewMobileItem = (row) => {
    const rowClassName = [
      'salary-preview-mobile-row',
      (row.isSubtotal || row.isGroup || row.isClaimGroup) && 'salary-preview-mobile-row--group',
      row.isDetail && 'salary-preview-mobile-row--detail',
      row.isClaimItem && 'salary-preview-mobile-row--deep',
    ]
      .filter(Boolean)
      .join(' ')
    const amount =
      row.isDetail || row.isClaimItem ? (
        formatSignedSalaryMoney(row.amount)
      ) : (
        <strong>{formatSignedSalaryMoney(row.amount)}</strong>
      )

    return (
      <div className={rowClassName}>
        <span className="salary-preview-mobile-label">
          {row.item}
          {row.badge && (
            <DataTableStatusBadge
              tone={row.badge.tone || 'secondary'}
              size="sm"
              className="salary-preview-badge"
            >
              {row.badge.label}
            </DataTableStatusBadge>
          )}
          {row.note && <span className="salary-preview-note">{row.note}</span>}
        </span>
        <span className="salary-preview-mobile-amount salary-summary-mobile-amount">
          <span>{amount}</span>
          {row.canEditClaim && (
            <span className="salary-summary-claim-row-controls">
              {(row.attachment?.dataUrl || row.attachment?.url || row.attachment?.downloadUrl) && (
                <CButton
                  color="secondary"
                  variant="ghost"
                  size="sm"
                  className="salary-claim-icon-button"
                  type="button"
                  title="Open attachment"
                  aria-label={`Open ${row.attachment.name || row.attachment.originalName || 'attachment'}`}
                  onClick={() => setPreviewAttachment(row.attachment)}
                >
                  <CIcon icon={cilExternalLink} size="sm" />
                </CButton>
              )}
              <CButton
                color="secondary"
                variant="ghost"
                size="sm"
                className="salary-claim-icon-button"
                type="button"
                title="Edit"
                aria-label={`Edit ${row.actionLabel || 'claim'}`}
                onClick={() => handleEditClaimItem(row.claimType, row.claimId)}
              >
                <CIcon icon={cilPencil} size="sm" />
              </CButton>
              <CButton
                color="danger"
                variant="ghost"
                size="sm"
                className="salary-claim-icon-button salary-claim-icon-button--danger"
                type="button"
                title="Remove"
                aria-label={`Remove ${row.actionLabel || 'claim'}`}
                onClick={() => removeClaimItem(row.claimType, row.claimId)}
              >
                <CIcon icon={cilTrash} size="sm" />
              </CButton>
            </span>
          )}
        </span>
      </div>
    )
  }

  const renderPanelAddAction = () =>
    showClaimDraft ? null : (
      <CButton
        color="primary"
        variant="outline"
        size="sm"
        type="button"
        onClick={() => {
          resetClaimDrafts()
          hideNotice()
          setShowClaimDraft(true)
        }}
      >
        Add
      </CButton>
    )

  if (showSubmissionPanel) {
    return (
      <CCardBody className="salary-section-body">
        <CAlert color={isSubmitting ? 'info' : notice.color} className="mb-3 py-3">
          {isSubmitting ? 'Preparing salary application...' : notice.message}
        </CAlert>

        {isSubmitting ? (
          <div className="d-flex align-items-center">
            <CSpinner size="sm" className="me-2" />
            Processing request...
          </div>
        ) : (
          <div className="salary-submit-actions">
            <CButton color="primary" size="sm" onClick={handleApplyAnother}>
              Apply Another
            </CButton>
            {onViewRecords && (
              <CButton color="secondary" variant="outline" size="sm" onClick={onViewRecords}>
                View Records
              </CButton>
            )}
          </div>
        )}
      </CCardBody>
    )
  }

  if (isLoadingProfile) {
    return (
      <CCardBody className="salary-section-body">
        <DataTableLoadingState message="Loading salary settings..." />
      </CCardBody>
    )
  }

  const salaryAdjustmentEditor =
    showAdjustments && !isSelectedMonthLocked && !requiresExistingRecordEdit ? (
      <CCardBody className="salary-section-body salary-adjustments-body">
        <section className="salary-form-panel mb-3" aria-labelledby="allowanceHeading">
          <section className="salary-adjustment-input-panel">
            <FormPanelHeading
              id="allowanceHeading"
              title="Salary Adjustment"
              action={renderPanelAddAction()}
            />
            {showClaimDraft && (
              <>
                <CRow className="g-3 salary-claim-field-row">
                  <CCol xs={12} md="auto" className="salary-claim-date-col">
                    <CFormLabel htmlFor="allowanceDate" className="mb-1">
                      Date
                    </CFormLabel>
                    <CFormInput
                      id="allowanceDate"
                      type="date"
                      name="allowanceDate"
                      value={formData.allowanceDate}
                      onChange={handleChange}
                    />
                  </CCol>
                  <CCol xs={12} md className="salary-claim-grow-col">
                    <CFormLabel htmlFor="allowanceDescription" className="mb-1">
                      Description
                    </CFormLabel>
                    <CFormInput
                      id="allowanceDescription"
                      name="allowanceDescription"
                      value={formData.allowanceDescription}
                      onChange={handleChange}
                      placeholder="Phone allowance or payroll adjustment"
                    />
                  </CCol>
                  <CCol xs={12} md="auto" className="salary-claim-amount-col">
                    <CFormLabel htmlFor="allowanceAmount" className="mb-1">
                      Amount
                    </CFormLabel>
                    <CFormInput
                      id="allowanceAmount"
                      type="number"
                      min="0"
                      step="0.01"
                      name="allowanceAmount"
                      value={formData.allowanceAmount}
                      onChange={handleChange}
                    />
                  </CCol>
                  <CCol xs={12} md className="salary-claim-attachment-col">
                    <AttachmentInput
                      id="allowanceAttachment"
                      label="Supporting document (optional)"
                      attachment={formData.allowanceAttachment}
                      inputKey={`allowance-${attachmentInputVersion}`}
                      isPreparing={attachmentProcessing.allowance}
                      onChange={(file) => handleAttachmentChange('allowance', file)}
                      onRemove={() => handleAttachmentChange('allowance', null)}
                    />
                  </CCol>
                </CRow>
                <ClaimDraftActions
                  onSave={() => handleSaveClaimDraft(addAllowance)}
                  onCancel={handleCancelClaimDraft}
                  isPreparing={attachmentProcessing.allowance}
                />
              </>
            )}
            <ClaimList
              title="Salary Adjustment"
              items={manualAllowanceItems}
              type="allowance"
              onEdit={handleEditClaimItem}
              onRemove={removeClaimItem}
              onPreviewAttachment={setPreviewAttachment}
            />
          </section>
        </section>
      </CCardBody>
    ) : null

  return (
    <CForm onSubmit={handleSubmit}>
      <CCardHeader className="salary-section-header">
        <div className="salary-section-heading-group">
          <h3 className="salary-form-panel-heading" id="salarySummaryHeading">
            Apply Salary
          </h3>
          <span className="salary-period-context">
            Salary Period <strong>{selectedSalaryPeriod}</strong>
          </span>
        </div>
      </CCardHeader>
      {editRecord?.status === 'Returned' && (
        <CCardBody className="salary-section-body pb-0">
          <CAlert color="warning" className="mb-0" role="status">
            <strong>Changes requested</strong>
            <div>
              {editRecord.returnRemarks ||
                'Review this salary request and make the requested corrections.'}
            </div>
            <div className="small mt-1">Submitting will restart the workflow at checking.</div>
          </CAlert>
        </CCardBody>
      )}
      {selectedMonthNotice && (
        <CCardBody className="salary-month-guard-body">
          <CAlert color={selectedMonthNotice.color} className="salary-month-guard-alert mb-0">
            <div className="salary-month-guard-content">
              <span>{selectedMonthNotice.message}</span>
              <div className="salary-month-guard-actions">
                {selectedMonthNotice.actions.map((action) => (
                  <CButton
                    key={action.label}
                    color={selectedMonthNotice.color}
                    variant="outline"
                    size="sm"
                    type="button"
                    disabled={isSwitchingSalaryMonth}
                    onClick={action.onClick}
                  >
                    {action.label}
                  </CButton>
                ))}
              </div>
            </div>
          </CAlert>
        </CCardBody>
      )}
      <CCardBody className="salary-section-body" aria-labelledby="salarySummaryHeading">
        <div className="salary-month-picker salary-month-picker--body" aria-label="Salary period">
          <span className="salary-month-picker-label">Salary Period</span>
          <div className="salary-month-picker-buttons" role="group">
            {salaryMonthOptions.map((option) => (
              <CButton
                key={option.value}
                color="primary"
                variant={formData.salaryMonth === option.value ? undefined : 'outline'}
                size="sm"
                type="button"
                className="salary-month-picker-button"
                aria-pressed={formData.salaryMonth === option.value}
                disabled={isSwitchingSalaryMonth}
                onClick={() => handleSelectSalaryMonth(option.value)}
              >
                {option.label}
              </CButton>
            ))}
          </div>
        </div>
        {showAddAdjustmentAction && !showAdjustments && (
          <div className="salary-apply-context-action">
            <CButton
              color="primary"
              variant="outline"
              size="sm"
              type="button"
              disabled={
                isSwitchingSalaryMonth || isSelectedMonthLocked || requiresExistingRecordEdit
              }
              onClick={() => {
                resetClaimDrafts()
                hideNotice()
                setShowClaimDraft(true)
                setShowAdjustments(true)
              }}
            >
              Add Adjustment
            </CButton>
          </div>
        )}
        <SalaryPayablePreviewTable
          rows={payablePreviewRows}
          payableSalary={summary.payableSalary}
          columns={payablePreviewColumns}
          renderMobileItem={renderPayablePreviewMobileItem}
        />
      </CCardBody>

      {salaryAdjustmentEditor}

      <CCardBody className="salary-settings-actions-body">
        {notice.visible && notice.scope !== 'submission-success' && (
          <CAlert
            ref={notice.scope === 'submission-error' ? submissionErrorRef : undefined}
            color={notice.color}
            className="py-2"
            dismissible
            onClose={hideNotice}
            role={notice.scope === 'submission-error' ? 'alert' : undefined}
            tabIndex={notice.scope === 'submission-error' ? -1 : undefined}
          >
            {notice.message}
          </CAlert>
        )}
        {draftSaveState === 'error' &&
          draftSaveError &&
          !(notice.visible && notice.scope === 'submission-error') && (
            <CAlert color="warning" className="py-2" role="alert">
              <div>
                Your entries remain saved on this device. Server sync failed: {draftSaveError}
              </div>
              <CButton
                color="warning"
                variant="outline"
                size="sm"
                type="button"
                className="mt-2"
                onClick={retryDraftSync}
              >
                Retry sync
              </CButton>
            </CAlert>
          )}

        <div className="salary-submit-actions">
          {draftStatusText && (
            <span className="salary-draft-save-state" role="status">
              {draftStatusText}
            </span>
          )}
          <CButton
            type="submit"
            color="primary"
            size="sm"
            disabled={
              isSubmitting ||
              isSwitchingSalaryMonth ||
              isSelectedMonthLocked ||
              requiresExistingRecordEdit
            }
          >
            Submit
          </CButton>
        </div>
      </CCardBody>
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </CForm>
  )
}

export default ApplySalary
