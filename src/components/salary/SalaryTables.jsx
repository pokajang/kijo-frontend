import React from 'react'
import { DataTableEmbeddedList, DataTableRecordList, DataTableStatusBadge } from '../datatable'
import { formatMoney } from './salaryCalculations'

const mergeClassNames = (...classNames) => classNames.filter(Boolean).join(' ')

export const formatSignedSalaryMoney = (amount) => {
  const value = Number(amount || 0)
  return value < 0 ? `-${formatMoney(Math.abs(value))}` : formatMoney(value)
}

export const getSalaryPreviewRowClass = (row = {}) =>
  row.isSubtotal || row.isGroup || row.isClaimGroup ? 'salary-preview-group-row' : ''

export const createSalaryPreviewColumns = () => [
  {
    key: 'item',
    label: 'Item',
    render: (row) => {
      const content = (
        <>
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
        </>
      )

      if (row.isClaimItem) {
        return <span className="salary-preview-detail--deep">{content}</span>
      }

      if (row.isClaimGroup) {
        return (
          <span className="salary-preview-detail">
            <strong>{content}</strong>
          </span>
        )
      }

      if (row.isDetail) {
        return <span className="salary-preview-detail">{content}</span>
      }

      return <strong>{content}</strong>
    },
  },
  {
    key: 'amount',
    label: 'Amount',
    align: 'right',
    render: (row) =>
      row.isDetail || row.isClaimItem ? (
        formatSignedSalaryMoney(row.amount)
      ) : (
        <strong>{formatSignedSalaryMoney(row.amount)}</strong>
      ),
  },
]

export const createSalaryPayableFooter = (payableSalary) => [
  {
    key: 'estimated-payable',
    className: 'salary-payable-preview-footer-row',
    cells: [
      { key: 'item', content: <strong>Estimated Payable Salary</strong> },
      {
        key: 'amount',
        align: 'right',
        content: <strong>{formatMoney(payableSalary)}</strong>,
      },
    ],
  },
]

const renderSalaryPreviewLabel = (row = {}) => (
  <>
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
  </>
)

const getSalaryPreviewMobileRowClass = (row = {}, extraClassName = '') =>
  mergeClassNames(
    'salary-preview-mobile-row',
    (row.isSubtotal || row.isGroup || row.isClaimGroup) && 'salary-preview-mobile-row--group',
    row.isDetail && 'salary-preview-mobile-row--detail',
    row.isClaimItem && 'salary-preview-mobile-row--deep',
    extraClassName,
  )

const renderSalaryPreviewMobileItem = (row) => (
  <div className={getSalaryPreviewMobileRowClass(row)}>
    <span className="salary-preview-mobile-label">{renderSalaryPreviewLabel(row)}</span>
    <span className="salary-preview-mobile-amount">
      {row.isDetail || row.isClaimItem ? (
        formatSignedSalaryMoney(row.amount)
      ) : (
        <strong>{formatSignedSalaryMoney(row.amount)}</strong>
      )}
    </span>
  </div>
)

const renderSalaryPreviewMobileFooterItem = (row, rowIndex, cells = []) => (
  <div className="salary-preview-mobile-row salary-preview-mobile-row--footer">
    <span className="salary-preview-mobile-label">
      {cells[0]?.content || 'Estimated Payable Salary'}
    </span>
    <span className="salary-preview-mobile-amount">
      {cells[1]?.content || formatMoney(row.amount)}
    </span>
  </div>
)

export const SalaryEmbeddedTable = ({
  rowProps,
  previewRows = false,
  shellClassName,
  mobileClassName,
  desktopBreakpoint = 'md',
  ...props
}) => {
  const shouldResolveRowProps = Boolean(rowProps) || previewRows

  const resolveRowProps = (row, rowIndex) => {
    const baseProps =
      typeof rowProps === 'function' ? rowProps(row, rowIndex) || {} : rowProps || {}
    const previewClassName = getSalaryPreviewRowClass(row)

    return {
      ...baseProps,
      className: mergeClassNames(baseProps.className, previewClassName),
    }
  }

  return (
    <DataTableEmbeddedList
      {...props}
      rowProps={shouldResolveRowProps ? resolveRowProps : undefined}
      shellClassName={mergeClassNames('salary-table-shell', shellClassName)}
      mobileClassName={mergeClassNames('salary-table-mobile-list', mobileClassName)}
      desktopBreakpoint={desktopBreakpoint}
    />
  )
}

export const SalaryRecordTable = ({
  className,
  actionColumnWidth = '56px',
  desktopBreakpoint = 'md',
  showDesktopSummary = false,
  desktopUtilityPlacement = 'portal',
  mobileUtilityPlacement = 'portal',
  showMobileUtilityRow = false,
  ...props
}) => (
  <DataTableRecordList
    {...props}
    className={mergeClassNames('salary-records-table', className)}
    actionColumnWidth={actionColumnWidth}
    desktopBreakpoint={desktopBreakpoint}
    showDesktopSummary={showDesktopSummary}
    desktopUtilityPlacement={desktopUtilityPlacement}
    mobileUtilityPlacement={mobileUtilityPlacement}
    showMobileUtilityRow={showMobileUtilityRow}
  />
)

export const SalaryPayablePreviewTable = ({
  rows,
  payableSalary,
  columns = createSalaryPreviewColumns(),
  footerRows = createSalaryPayableFooter(payableSalary),
  renderMobileItem = renderSalaryPreviewMobileItem,
  renderMobileFooterItem = renderSalaryPreviewMobileFooterItem,
  ...props
}) => (
  <SalaryEmbeddedTable
    rows={rows}
    columns={columns}
    footerRows={footerRows}
    getRowKey={(row) => row.id}
    previewRows
    renderMobileItem={renderMobileItem}
    renderMobileFooterItem={renderMobileFooterItem}
    {...props}
  />
)
