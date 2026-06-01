import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CommercialTrailsCard from './CommercialTrailsCard'
import { useProjectCommercialDocs } from '../commercialDocsWarning'
import { deleteProjectCommercialRecord } from '../projectApi'
import dialog from '../../../../components/dialog/dialogService'

const navigateMock = vi.hoisted(() => vi.fn())

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigateMock,
}))

vi.mock('../../../../components/datatable', () => ({
  DataTableActionMenu: ({ record, actions = [], ariaLabel }) => (
    <div>
      <button
        type="button"
        aria-label={ariaLabel}
        data-testid={`action-toggle-${record.key}`}
        className="data-table-action-toggle"
      />
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          disabled={action.disabled}
          title={action.tooltip || ''}
          onClick={() => {
            if (!action.disabled) action.onClick(record)
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  ),
  DataTableLoadingState: ({ message }) => <span>{message}</span>,
  DataTableStatusBadge: ({ children }) => <span>{children}</span>,
}))

vi.mock('../commercialDocsWarning', () => ({
  useProjectCommercialDocs: vi.fn(),
}))

vi.mock('../projectApi', () => ({
  deleteProjectCommercialRecord: vi.fn(),
}))

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

const setCommercialGroups = (items) => {
  useProjectCommercialDocs.mockReturnValue({
    groups: [{ key: 'records', label: 'Commercial Records', items }],
    loading: false,
    error: '',
  })
}

const renderCard = (props = {}) =>
  render(
    <CommercialTrailsCard
      projectId={12}
      onCommercialRecordsChanged={vi.fn()}
      onProgressUpdate={vi.fn()}
      onVendorAssignmentsChanged={vi.fn()}
      {...props}
    />,
  )

const invoiceRow = {
  key: 'invoice-1',
  documentType: 'invoice',
  recordId: 1,
  reference: 'INV-001',
  label: 'INV-001',
  secondary: 'Pending | RM 3000.00',
  href: '/commercial/invoice/1',
  canOpen: true,
  canEdit: true,
  canDelete: true,
  deleteKind: 'invoice',
  status: 'Pending',
}

describe('CommercialTrailsCard actions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    navigateMock.mockClear()
    deleteProjectCommercialRecord.mockResolvedValue({
      status: 'success',
      message: 'Deleted.',
    })
    dialog.confirm.mockResolvedValue(true)
  })

  afterEach(() => {
    cleanup()
  })

  it('renders an actions column and standalone row action toggle', () => {
    setCommercialGroups([invoiceRow])

    renderCard()

    expect(screen.getByText('(1)')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()
    expect(screen.getByLabelText('Commercial record actions')).toBeInTheDocument()
    expect(screen.getByLabelText('Commercial record actions')).not.toHaveClass(
      'dropdown-toggle-split',
    )
  })

  it('opens and edits records with project return context', () => {
    setCommercialGroups([invoiceRow])

    renderCard()

    fireEvent.click(screen.getByRole('button', { name: 'Open' }))
    expect(navigateMock).toHaveBeenCalledWith('/commercial/invoice/1?from=project&projectId=12', {
      state: { from: 'project-manage', fromProjectId: '12' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }))
    expect(navigateMock).toHaveBeenCalledWith('/commercial/invoice/1?from=project&projectId=12', {
      state: { from: 'project-manage', fromProjectId: '12' },
    })
  })

  it('opens reference links with project return context', () => {
    setCommercialGroups([invoiceRow])

    renderCard()

    const link = screen.getByRole('link', { name: 'INV-001' })
    expect(link).toHaveAttribute('href', '/commercial/invoice/1?from=project&projectId=12')

    fireEvent.click(link)
    expect(navigateMock).toHaveBeenCalledWith('/commercial/invoice/1?from=project&projectId=12', {
      state: { from: 'project-manage', fromProjectId: '12' },
    })
  })

  it('deletes pending invoices and triggers commercial and progress refresh callbacks', async () => {
    setCommercialGroups([invoiceRow])
    const onCommercialRecordsChanged = vi.fn()
    const onProgressUpdate = vi.fn()

    renderCard({ onCommercialRecordsChanged, onProgressUpdate })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(dialog.confirm).toHaveBeenCalledWith(
        'Delete invoice INV-001? This will delete the actual invoice record from this project, not just this notice.',
        {
          confirmText: 'Delete',
          confirmColor: 'danger',
        },
      ),
    )
    await waitFor(() =>
      expect(deleteProjectCommercialRecord).toHaveBeenCalledWith({
        projectId: 12,
        record: expect.objectContaining({ deleteKind: 'invoice', reference: 'INV-001' }),
      }),
    )
    expect(onCommercialRecordsChanged).toHaveBeenCalled()
    expect(onProgressUpdate).toHaveBeenCalled()
  })

  it('disables invoice delete when the invoice is not pending', () => {
    setCommercialGroups([{ ...invoiceRow, secondary: 'Unpaid | RM 3000.00', status: 'Unpaid' }])

    renderCard()

    expect(screen.getByText('Unpaid')).toBeInTheDocument()
    const deleteButton = screen.getByRole('button', { name: 'Delete' })
    expect(deleteButton).toBeDisabled()
    expect(deleteButton).toHaveAttribute('title', 'Only pending invoices can be deleted.')
  })

  it.each([
    [
      'delivery order',
      'Delete delivery order DO-001? This will delete the actual delivery order record from this project, not just this notice.',
      {
        key: 'delivery-order-2',
        documentType: 'delivery-order',
        recordId: 2,
        reference: 'DO-001',
        label: 'DO-001',
        href: '/commercial/delivery-order/2',
        canOpen: true,
        canEdit: true,
        canDelete: true,
        deleteKind: 'delivery-order',
      },
    ],
    [
      'JD14',
      'Delete JD14 record JD14-001? This will delete the actual JD14 record from this project, not just this notice.',
      {
        key: 'jd14-3',
        documentType: 'jd14',
        recordId: 3,
        reference: 'JD14-001',
        label: 'JD14-001',
        href: '/commercial/jd14/3',
        canOpen: true,
        canEdit: true,
        canDelete: true,
        deleteKind: 'jd14',
      },
    ],
    [
      'supplier PO',
      'Delete supplier PO PO-001? This will delete the actual supplier PO record from this project, not just this notice.',
      {
        key: 'supplier-po-4',
        documentType: 'supplier-po',
        recordId: 4,
        reference: 'PO-001',
        label: 'PO-001',
        href: '/commercial/supplier-po/4',
        canOpen: true,
        canEdit: false,
        canDelete: true,
        deleteKind: 'supplier-po',
      },
    ],
  ])(
    'deletes %s records through the shared delete helper',
    async (_label, expectedConfirmMessage, row) => {
      setCommercialGroups([row])

      renderCard()

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

      await waitFor(() =>
        expect(dialog.confirm).toHaveBeenCalledWith(expectedConfirmMessage, {
          confirmText: 'Delete',
          confirmColor: 'danger',
        }),
      )
      await waitFor(() =>
        expect(deleteProjectCommercialRecord).toHaveBeenCalledWith({
          projectId: 12,
          record: expect.objectContaining({ deleteKind: row.deleteKind, recordId: row.recordId }),
        }),
      )
    },
  )

  it('uses explicit Vendor LOA assignment removal copy and refreshes vendors', async () => {
    const row = {
      key: 'vendor-loa-5',
      documentType: 'vendor-loa',
      recordId: 5,
      reference: 'LOA-001',
      label: 'LOA-001',
      href: '/commercial/vendor-loa/5',
      canOpen: true,
      canEdit: true,
      canDelete: true,
      deleteKind: 'vendor-loa-assignment',
    }
    setCommercialGroups([row])
    const onVendorAssignmentsChanged = vi.fn()
    const onProgressUpdate = vi.fn()

    renderCard({ onVendorAssignmentsChanged, onProgressUpdate })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(dialog.confirm).toHaveBeenCalledWith(
        'Remove Vendor LOA/assignment LOA-001 from this project? This removes the project vendor assignment/LOA, not just this notice.',
        {
          confirmText: 'Delete',
          confirmColor: 'danger',
        },
      ),
    )
    expect(onVendorAssignmentsChanged).toHaveBeenCalled()
    expect(onProgressUpdate).toHaveBeenCalled()
  })

  it('alerts failed deletes without refresh callbacks', async () => {
    setCommercialGroups([invoiceRow])
    deleteProjectCommercialRecord.mockResolvedValueOnce({
      status: 'error',
      message: 'Cannot delete.',
    })
    const onCommercialRecordsChanged = vi.fn()

    renderCard({ onCommercialRecordsChanged })

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }))

    await waitFor(() => expect(dialog.alert).toHaveBeenCalledWith('Cannot delete.'))
    expect(onCommercialRecordsChanged).not.toHaveBeenCalled()
  })
})
