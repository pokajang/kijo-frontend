import React from 'react'
import { ExternalLink } from 'lucide-react'
import DataTableEmbeddedList from '../../datatable/DataTableEmbeddedList'
import { formatMoney } from '../salaryCalculations'
import { formatAttachmentSize, hasPaymentAmount } from './paymentSummaryViewModel'

const PaymentSummaryEmployeeDetails = ({ employee, resolveAttachmentUrl }) => {
  const otherClaimLines = buildOtherClaimLines(employee.otherClaims)

  return (
    <div className="payment-summary-details">
      {(employee.salary || []).map((salary, index) => (
        <SalaryDetails
          key={`salary-${salary.id || index}`}
          salary={salary}
          resolveAttachmentUrl={resolveAttachmentUrl}
        />
      ))}
      <EvidenceBlock
        title="Other claims"
        lines={otherClaimLines}
        showClaimReference
        resolveAttachmentUrl={resolveAttachmentUrl}
      />
    </div>
  )
}

export const buildOtherClaimLines = (claims = []) =>
  claims.flatMap((claim, claimIndex) =>
    (claim.lineItems || []).map((line, lineIndex) => ({
      ...line,
      claimReference: claim.reference || claim.label || `Claim ${claimIndex + 1}`,
      summaryLineKey:
        line.key ||
        `${claim.id || claim.reference || claimIndex}-${line.id || line.date || 'line'}-${lineIndex}`,
    })),
  )

const SalaryDetails = ({ salary, resolveAttachmentUrl }) => {
  const adjustments = (salary.lineItems || []).reduce(
    (total, line) => total + Number(line.amount || 0),
    0,
  )
  const calculationRows = [
    { key: 'basic', label: 'Basic salary', amount: salary.basicSalary },
    { key: 'adjustments', label: 'Salary adjustments', amount: adjustments },
    {
      key: 'deductions',
      label: 'Employee deductions',
      amount: -Number(salary.employeeDeductions || 0),
    },
    { key: 'net', label: 'Net salary', amount: salary.payableSalary, strong: true },
  ].filter((row) => hasPaymentAmount(row.amount))

  return (
    <section className="payment-summary-details__section">
      <div className="payment-summary-details__heading">
        <h3>Salary</h3>
      </div>
      <CalculationTable rows={calculationRows} />
      <EvidenceBlock
        title="Salary adjustments"
        lines={salary.lineItems}
        resolveAttachmentUrl={resolveAttachmentUrl}
      />
    </section>
  )
}

const CalculationTable = ({ rows }) => (
  <DataTableEmbeddedList
    rows={rows}
    columns={calculationColumns}
    getRowKey={(row) => row.key}
    renderCell={(row, column) =>
      column.key === 'amount' ? (
        <span className={row.strong ? 'fw-semibold' : ''}>{formatMoney(row.amount)}</span>
      ) : (
        <span className={row.strong ? 'fw-semibold' : ''}>{row.label}</span>
      )
    }
    renderMobileItem={(row) => (
      <MobileKeyValue
        key={row.key}
        label={row.label}
        value={formatMoney(row.amount)}
        strong={row.strong}
      />
    )}
    shellClassName="records-table-shell payment-summary-detail-table-shell"
    tableClassName="records-table-compact"
    mobileClassName="payment-summary-mobile-detail-list"
    desktopBreakpoint="lg"
  />
)

const EvidenceBlock = ({ title, lines = [], showClaimReference = false, resolveAttachmentUrl }) => {
  const visibleLines = lines.filter((line) => hasPaymentAmount(line.amount))
  if (visibleLines.length === 0) return null

  const columns = showClaimReference ? claimEvidenceColumns : evidenceColumns

  return (
    <section className="payment-summary-evidence">
      <div className="payment-summary-details__heading">
        <h4>{title}</h4>
      </div>
      <DataTableEmbeddedList
        rows={visibleLines}
        columns={columns}
        getRowKey={(row, index) => row.summaryLineKey || `${row.description}-${index}`}
        renderCell={(row, column) => {
          if (column.key === 'item') {
            return <LineItemDescription line={row} resolveAttachmentUrl={resolveAttachmentUrl} />
          }
          if (column.key === 'claim') return row.claimReference || '—'
          if (column.key === 'amount') return formatMoney(row.amount)
          return row.date || '—'
        }}
        renderMobileItem={(row, index) => (
          <dl
            className="payment-summary-mobile-kv"
            key={row.summaryLineKey || `${row.description}-${index}`}
          >
            <MobileDefinition label="Date" value={row.date || '—'} />
            {showClaimReference && (
              <MobileDefinition label="Claim" value={row.claimReference || '—'} />
            )}
            <MobileDefinition
              label="Item"
              value={<LineItemDescription line={row} resolveAttachmentUrl={resolveAttachmentUrl} />}
            />
            <MobileDefinition label="Amount" value={formatMoney(row.amount)} strong />
          </dl>
        )}
        shellClassName="records-table-shell payment-summary-detail-table-shell"
        tableClassName="records-table-compact"
        mobileClassName="payment-summary-mobile-detail-list"
        desktopBreakpoint="lg"
      />
    </section>
  )
}

const LineItemDescription = ({ line, resolveAttachmentUrl }) => (
  <div className="payment-summary-line-item">
    <span>{line.description}</span>
    {line.type && <small>{line.type}</small>}
    {(line.attachments || []).map((file, index) => {
      const href = resolveAttachmentUrl?.(file)
      const linkLabel =
        line.attachments.length > 1 ? `See attachment ${index + 1}` : 'See attachment'

      return (
        <small
          className="payment-summary-attachment"
          key={`${file.accessKey || file.name}-${index}`}
        >
          <span>
            {file.name} ({formatAttachmentSize(file.size)})
          </span>
          {href && (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${linkLabel}: ${file.name}`}
            >
              <span>{linkLabel}</span>
              <ExternalLink aria-hidden="true" size={13} strokeWidth={2} />
            </a>
          )}
        </small>
      )
    })}
  </div>
)

const MobileKeyValue = ({ label, value, strong = false }) => (
  <dl className="payment-summary-mobile-kv">
    <MobileDefinition label={label} value={value} strong={strong} />
  </dl>
)

const MobileDefinition = ({ label, value, strong = false }) => (
  <div>
    <dt>{label}</dt>
    <dd className={strong ? 'fw-semibold' : ''}>{value}</dd>
  </div>
)

const calculationColumns = [
  { key: 'label', label: 'Item', style: { width: '68%' } },
  { key: 'amount', label: 'Amount', align: 'right', style: { width: '32%' } },
]

const evidenceColumns = [
  { key: 'date', label: 'Date', style: { width: '18%' } },
  { key: 'item', label: 'Item' },
  { key: 'amount', label: 'Amount', align: 'right', style: { width: '22%' } },
]

const claimEvidenceColumns = [
  { key: 'date', label: 'Date', style: { width: '18%' } },
  { key: 'claim', label: 'Claim', style: { width: '20%' } },
  { key: 'item', label: 'Item' },
  { key: 'amount', label: 'Amount', align: 'right', style: { width: '22%' } },
]

export default PaymentSummaryEmployeeDetails
