import React, { useMemo, useState } from 'react'
import CIcon from '@coreui/icons-react'
import { cilExternalLink, cilPencil, cilTrash } from '@coreui/icons'
import { CButton } from '@coreui/react'
import { formatAttachmentSize } from '../attachmentUtils'
import { formatMoney, roundMoney } from '../salaryCalculations'
import {
  createSalaryPreviewColumns,
  formatSignedSalaryMoney,
  SalaryPayablePreviewTable,
} from '../SalaryTables'
import { AttachmentPreviewModal } from '../claim-ui/ClaimFormPrimitives'
import {
  claimTravelCategory,
  formatMileageMeta,
  getClaimAttachments,
} from './model/otherClaimModel'

const travelCategoryLabels = {
  mileage: 'Mileage',
  taxi: 'Taxi / e-hailing',
  toll: 'Toll',
  parking: 'Parking',
  other: 'Other travel expense',
  legacy_combined: 'Legacy combined travel expense',
}

const ClaimLabel = ({ item, index, showMileageMeta = false, showTravelCategory = false }) => {
  const attachments = getClaimAttachments(item)
  const meta = [
    item.date,
    item.sourceLabel,
    showTravelCategory ? travelCategoryLabels[claimTravelCategory(item)] : null,
    showMileageMeta ? formatMileageMeta(item) : null,
    item.locationDetail,
    item.expenseType,
  ]
    .filter(Boolean)
    .join(' - ')

  return (
    <>
      <span>
        {index + 1}. {item.description}
      </span>
      {meta && <span className="salary-preview-note salary-preview-note--inline">{meta}</span>}
      {attachments.map((attachment, attachmentIndex) => (
        <span
          className="salary-preview-note salary-preview-note--inline"
          key={attachment.clientId || attachment.id || `${attachment.name}-${attachmentIndex}`}
        >
          {attachment.name || attachment.originalName || 'attachment'}
          {attachment.size ? ` (${formatAttachmentSize(attachment.size)})` : ''}
        </span>
      ))}
    </>
  )
}

const OtherClaimSummary = ({
  allowanceItems,
  expenseItems,
  mileageItems,
  medicalItems,
  claimsTotal,
  onEdit,
  onRemove,
}) => {
  const [previewAttachment, setPreviewAttachment] = useState(null)
  const standaloneExpenseItems = useMemo(
    () => expenseItems.filter((item) => !claimTravelCategory(item)),
    [expenseItems],
  )
  const travelExpenseItems = useMemo(
    () =>
      expenseItems
        .filter((item) => Boolean(claimTravelCategory(item)))
        .map((item) => {
          const linkedMileage = mileageItems.find(
            (mileageItem) => item.travelGroupId && mileageItem.travelGroupId === item.travelGroupId,
          )
          return {
            ...item,
            startLocation: item.startLocation || linkedMileage?.startLocation || '',
            endLocation: item.endLocation || linkedMileage?.endLocation || '',
          }
        }),
    [expenseItems, mileageItems],
  )
  const visibleMileageItems = useMemo(
    () =>
      mileageItems.filter((item) => {
        const hasLinkedExpense = expenseItems.some(
          (expenseItem) => item.travelGroupId && expenseItem.travelGroupId === item.travelGroupId,
        )
        return Number(item.km || 0) > 0 || !hasLinkedExpense
      }),
    [expenseItems, mileageItems],
  )
  const travelItems = useMemo(
    () => [
      ...visibleMileageItems.map((item) => ({ ...item, claimType: 'mileage' })),
      ...travelExpenseItems.map((item) => ({ ...item, claimType: 'expense' })),
    ],
    [travelExpenseItems, visibleMileageItems],
  )
  const rows = useMemo(
    () =>
      [
        ['allowance', 'Allowance', allowanceItems],
        ['expense', 'Expense', standaloneExpenseItems],
        ['travel', 'Travel', travelItems],
        ['medical', 'Medical', medicalItems],
      ].flatMap(([key, label, items]) => {
        const total = roundMoney(items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
        if (total <= 0) return []
        return [
          { id: key, item: label, amount: total, isClaimGroup: true },
          ...items.map((item, index) => ({
            id: `${key}-${item.id}`,
            item: (
              <ClaimLabel
                item={item}
                index={index}
                showMileageMeta={key === 'travel' && item.claimType === 'mileage'}
                showTravelCategory={key === 'travel'}
              />
            ),
            actionLabel: item.description,
            amount: item.amount,
            isClaimItem: true,
            canEditClaim: true,
            claimType: item.claimType || key,
            claimId: item.id,
            attachments: getClaimAttachments(item),
          })),
        ]
      }),
    [allowanceItems, medicalItems, standaloneExpenseItems, travelItems],
  )

  const ClaimActions = ({ row, amount }) => (
    <span className="salary-summary-claim-actions">
      <span>{amount}</span>
      <span className="salary-claim-row-controls salary-summary-claim-row-controls">
        {(row.attachments || []).map((attachment, index) => (
          <CButton
            color="secondary"
            variant="ghost"
            size="sm"
            className="salary-claim-icon-button"
            type="button"
            title={`Open attachment ${index + 1}`}
            aria-label={`Open ${attachment.name || attachment.originalName || 'attachment'}`}
            key={attachment.clientId || attachment.id || `${attachment.name}-${index}`}
            onClick={() => setPreviewAttachment(attachment)}
          >
            <CIcon icon={cilExternalLink} size="sm" />
          </CButton>
        ))}
        <CButton
          color="secondary"
          variant="ghost"
          size="sm"
          className="salary-claim-icon-button"
          type="button"
          title="Edit"
          aria-label={`Edit ${row.actionLabel || 'claim'}`}
          onClick={() => onEdit(row.claimType, row.claimId)}
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
          onClick={() => onRemove(row.claimType, row.claimId)}
        >
          <CIcon icon={cilTrash} size="sm" />
        </CButton>
      </span>
    </span>
  )

  const [itemColumn, amountColumn] = createSalaryPreviewColumns()
  const columns = [
    itemColumn,
    {
      ...amountColumn,
      render: (row) => {
        const amount = row.isClaimItem ? (
          formatSignedSalaryMoney(row.amount)
        ) : (
          <strong>{formatSignedSalaryMoney(row.amount)}</strong>
        )
        return row.canEditClaim ? <ClaimActions row={row} amount={amount} /> : amount
      },
    },
  ]

  const renderMobileItem = (row) => {
    const className = [
      'salary-preview-mobile-row',
      row.isClaimGroup && 'salary-preview-mobile-row--group',
      row.isClaimItem && 'salary-preview-mobile-row--deep',
    ]
      .filter(Boolean)
      .join(' ')
    const amount = row.isClaimItem ? (
      formatSignedSalaryMoney(row.amount)
    ) : (
      <strong>{formatSignedSalaryMoney(row.amount)}</strong>
    )

    return (
      <div className={className}>
        <span className="salary-preview-mobile-label">{row.item}</span>
        <span className="salary-preview-mobile-amount salary-summary-mobile-amount">
          {row.canEditClaim ? <ClaimActions row={row} amount={amount} /> : amount}
        </span>
      </div>
    )
  }

  return (
    <>
      <SalaryPayablePreviewTable
        rows={rows}
        columns={columns}
        payableSalary={claimsTotal}
        renderMobileItem={renderMobileItem}
        footerRows={[
          {
            key: 'total-claim',
            className: 'salary-payable-preview-footer-row',
            cells: [
              { key: 'item', content: <strong>Total Claim</strong> },
              {
                key: 'amount',
                align: 'right',
                content: <strong>{formatMoney(claimsTotal)}</strong>,
              },
            ],
          },
        ]}
      />
      <AttachmentPreviewModal
        attachment={previewAttachment}
        onClose={() => setPreviewAttachment(null)}
      />
    </>
  )
}

export default OtherClaimSummary
