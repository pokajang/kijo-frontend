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
import { formatMileageMeta } from './model/otherClaimModel'

const expenseLabels = {
  combined: 'Parking / taxi / toll / others',
  parking: 'Parking',
  toll: 'Toll',
  taxi: 'Taxi',
  other: 'Other travel expense',
}

const ClaimLabel = ({ item, index, showKm }) => {
  const meta = [
    item.date,
    item.sourceLabel,
    showKm ? formatMileageMeta(item) : null,
    item.travelExpenseNote,
  ]
    .filter(Boolean)
    .join(' - ')
  const attachmentName = item.attachment
    ? `${item.attachment.name || item.attachment.originalName || 'attachment'}${
        item.attachment.size ? ` (${formatAttachmentSize(item.attachment.size)})` : ''
      }`
    : ''

  return (
    <>
      <span>
        {index + 1}. {item.description}
      </span>
      {meta && <span className="salary-preview-note salary-preview-note--inline">{meta}</span>}
      {attachmentName && (
        <span className="salary-preview-note salary-preview-note--inline">{attachmentName}</span>
      )}
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
    () => expenseItems.filter((item) => !item.travelGroupId),
    [expenseItems],
  )
  const travelPreviewItems = useMemo(
    () =>
      mileageItems.map((item) => {
        const travelExpense = expenseItems.find(
          (expenseItem) => item.travelGroupId && expenseItem.travelGroupId === item.travelGroupId,
        )
        return {
          ...item,
          amount: roundMoney(Number(item.amount || 0) + Number(travelExpense?.amount || 0)),
          attachment: travelExpense?.attachment || null,
          travelExpenseNote: travelExpense
            ? `${expenseLabels[travelExpense.expenseCategory] || 'Travel expense'} ${formatMoney(travelExpense.amount)}`
            : '',
        }
      }),
    [expenseItems, mileageItems],
  )
  const rows = useMemo(
    () => [
      { id: 'claims-total', item: 'Claims Total', amount: claimsTotal, isSubtotal: true },
      ...[
        ['allowance', 'Allowance', allowanceItems],
        ['expense', 'Expense', standaloneExpenseItems],
        ['mileage', 'Travel & Mileage', travelPreviewItems],
        ['medical', 'Medical', medicalItems],
      ].flatMap(([key, label, items]) => {
        const total = roundMoney(items.reduce((sum, item) => sum + Number(item.amount || 0), 0))
        if (total <= 0) return []
        return [
          { id: key, item: label, amount: total, isClaimGroup: true },
          ...items.map((item, index) => ({
            id: `${key}-${item.id}`,
            item: <ClaimLabel item={item} index={index} showKm={key === 'mileage'} />,
            actionLabel: item.description,
            amount: item.amount,
            isClaimItem: true,
            canEditClaim: true,
            claimType: key,
            claimId: item.id,
            attachment: item.attachment,
          })),
        ]
      }),
    ],
    [allowanceItems, claimsTotal, medicalItems, standaloneExpenseItems, travelPreviewItems],
  )

  const ClaimActions = ({ row, amount }) => (
    <span className="salary-summary-claim-actions">
      <span>{amount}</span>
      <span className="salary-claim-row-controls salary-summary-claim-row-controls">
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
      (row.isSubtotal || row.isClaimGroup) && 'salary-preview-mobile-row--group',
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
