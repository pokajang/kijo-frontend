import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PaymentTable from './PaymentTable'

vi.mock('../../../components/datatable', () => ({
  DataTableRecordControls: ({ children }) => <div>{children}</div>,
  DataTableRecordList: ({ rows = [], dataColumns = [], renderCell, getActions }) => (
    <div>
      {rows.map((row) => (
        <div key={row.id}>
          {dataColumns.map((column) => (
            <div key={column.key}>{renderCell ? renderCell(row, column) : row[column.key]}</div>
          ))}
          {(getActions(row) || []).map((action) => (
            <button
              key={action.key}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  ),
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
  DataTableTextCell: ({ value }) => <span>{value}</span>,
}))

vi.mock('../../../components/filters', () => ({
  PeriodRangeSelector: () => null,
  getPeriodRangeLabel: () => 'Year to date',
  getPeriodRangePreset: () => ({ key: 'ytd' }),
  getPeriodRangeScopeLabel: () => 'Year to date',
  isDateInPeriodRange: () => true,
  isDefaultPeriodRange: () => true,
}))

vi.mock('../../../components/stats', () => ({
  StatsStrip: () => null,
}))

afterEach(() => {
  cleanup()
})

const basePayment = {
  id: 1,
  vendor_name: 'Vendor A',
  status: 'Approved',
  amount: 100,
  created_at: '2026-05-29 09:00:00',
  date_approved: '2026-05-29 10:00:00',
  payment_context: 'Office',
  payment_type: 'Deposit',
  method: 'Online Transfer',
}

describe('PaymentTable', () => {
  it('uses backend permission metadata for mark paid action visibility', () => {
    const onMarkPaid = vi.fn()

    render(
      <PaymentTable
        payments={[{ ...basePayment, can_mark_paid: true }]}
        staffRoles={['Staff']}
        onView={vi.fn()}
        onCheck={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onReturn={vi.fn()}
        onMarkPaid={onMarkPaid}
        onDelete={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /^mark paid$/i }))

    expect(onMarkPaid).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
  })

  it('hides mark paid when backend permission metadata denies it', () => {
    render(
      <PaymentTable
        payments={[{ ...basePayment, can_mark_paid: false }]}
        staffRoles={['Finance']}
        onView={vi.fn()}
        onCheck={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onReturn={vi.fn()}
        onMarkPaid={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.queryByRole('button', { name: 'Mark Paid' })).not.toBeInTheDocument()
  })

  it('uses backend permission metadata for review actions', () => {
    const onCheck = vi.fn()
    const onReturn = vi.fn()
    const onReject = vi.fn()

    render(
      <PaymentTable
        payments={[
          {
            ...basePayment,
            status: 'Pending',
            can_check: true,
            can_return: true,
            can_reject: false,
            can_delete: false,
          },
        ]}
        staffRoles={['Staff']}
        onView={vi.fn()}
        onCheck={onCheck}
        onApprove={vi.fn()}
        onReject={onReject}
        onReturn={onReturn}
        onMarkPaid={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    const checkButton = screen.getByRole('button', { name: /^check$/i })
    const returnButton = screen.getByRole('button', { name: /^return$/i })
    fireEvent.click(checkButton)
    fireEvent.click(returnButton)

    expect(onCheck).toHaveBeenCalledWith(1)
    expect(onReturn).toHaveBeenCalledWith(1)
    expect(checkButton).toHaveClass('btn-outline-info')
    expect(returnButton).toHaveClass('btn-outline-secondary')
    expect(screen.queryByRole('button', { name: /^reject$/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Delete Payment' })).toBeDisabled()
  })

  it('uses backend permission metadata for approval actions', () => {
    const onApprove = vi.fn()

    render(
      <PaymentTable
        payments={[
          {
            ...basePayment,
            status: 'Checked',
            can_approve: true,
            workflow_progress: [
              {
                stageType: 'review',
                label: 'Review',
                status: 'Reviewed',
                actorName: 'Review User',
                actorCode: 'REV',
                remarks: 'Looks right',
                completedAt: '2026-05-29 11:00:00',
              },
            ],
          },
        ]}
        staffRoles={['Staff']}
        onView={vi.fn()}
        onCheck={vi.fn()}
        onApprove={onApprove}
        onReject={vi.fn()}
        onReturn={vi.fn()}
        onMarkPaid={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    const approveButton = screen.getByRole('button', { name: /^approve$/i })
    fireEvent.click(approveButton)

    expect(onApprove).toHaveBeenCalledWith(1)
    expect(approveButton).toHaveClass('btn-outline-success')
    expect(screen.getByText(/Review: Reviewed by Review User \(REV\)/)).toBeInTheDocument()
    expect(screen.getByText(/Remarks: Looks right/)).toBeInTheDocument()
  })

  it('keeps workflow actions out of the kebab action list', () => {
    render(
      <PaymentTable
        payments={[{ ...basePayment, status: 'Checked', can_approve: true, can_reject: true }]}
        staffRoles={['Staff']}
        onView={vi.fn()}
        onCheck={vi.fn()}
        onApprove={vi.fn()}
        onReject={vi.fn()}
        onReturn={vi.fn()}
        onMarkPaid={vi.fn()}
        onDelete={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^reject$/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Approve Payment' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Reject Payment' })).not.toBeInTheDocument()
  })
})
