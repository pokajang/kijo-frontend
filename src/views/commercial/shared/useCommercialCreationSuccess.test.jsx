import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import AppDialogProvider from '../../../components/dialog/AppDialogProvider'
import useCommercialCreationSuccess, {
  getCommercialCreationReceiptKey,
} from './useCommercialCreationSuccess'

const RecoveryHarness = () => {
  useCommercialCreationSuccess({
    documentType: 'invoice',
    documentLabel: 'Invoice',
    projectId: 44,
    projectLabel: 'Project Alpha',
    origin: 'project',
    listOrigin: 'invoice-list',
    listPath: '/commercial/invoice',
    detailPath: '/commercial/invoice',
    viewLabel: 'View Invoice',
    listLabel: 'View Invoice List',
  })
  return null
}

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location">{`${location.pathname}${location.search}`}</div>
}

describe('useCommercialCreationSuccess recovery', () => {
  const receiptKey = getCommercialCreationReceiptKey('invoice', 44)

  beforeEach(() => sessionStorage.clear())
  afterEach(() => sessionStorage.clear())

  it('restores a pending success modal after reload and preserves project context', async () => {
    sessionStorage.setItem(
      receiptKey,
      JSON.stringify({
        detailId: 123,
        reference: 'INV-123',
        detailLines: [],
        createdAt: Date.now(),
      }),
    )

    render(
      <MemoryRouter initialEntries={['/commercial/invoice/create/44']}>
        <AppDialogProvider>
          <RecoveryHarness />
          <LocationProbe />
        </AppDialogProvider>
      </MemoryRouter>,
    )

    await waitFor(() => expect(screen.getByText('Invoice Created')).toBeInTheDocument())
    expect(screen.getByText(/For project: Project Alpha/)).toBeInTheDocument()
    const viewAction = screen.getByRole('button', { name: 'View Invoice', exact: true })
    await waitFor(() => expect(viewAction).toHaveFocus())
    fireEvent.click(viewAction)

    await waitFor(() =>
      expect(screen.getByTestId('location')).toHaveTextContent(
        '/commercial/invoice/123?from=project&projectId=44',
      ),
    )
    expect(sessionStorage.getItem(receiptKey)).toBeNull()
  })
})
