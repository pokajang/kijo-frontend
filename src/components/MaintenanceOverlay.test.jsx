import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import useMaintenanceStatus from '../lib/useMaintenanceStatus'
import MaintenanceOverlay from './MaintenanceOverlay'

vi.mock('../lib/useMaintenanceStatus', () => ({
  default: vi.fn(),
}))

describe('MaintenanceOverlay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('stays hidden while maintenance is inactive', () => {
    useMaintenanceStatus.mockReturnValue({ maintenanceActive: false })

    render(<MaintenanceOverlay />)

    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('blocks the app with an accessible maintenance message while active', () => {
    useMaintenanceStatus.mockReturnValue({ maintenanceActive: true })

    render(<MaintenanceOverlay />)

    expect(screen.getByRole('alertdialog', { name: 'Kijo is being upgraded' })).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Maintenance in progress')
  })
})
