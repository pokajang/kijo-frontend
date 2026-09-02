import React from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CommercialProjectPickerModal from './CommercialProjectPickerModal'
import { listActiveProjectOptions } from '../../project/manage/projectApi'

vi.mock('../../project/manage/projectApi', () => ({
  listActiveProjectOptions: vi.fn(),
}))

const defaultProps = {
  visible: true,
  onClose: vi.fn(),
  onContinue: vi.fn(),
  title: 'Create Invoice',
  searchInputId: 'commercialProjectSearch',
  creationLabel: 'invoice',
}

const renderPicker = (props = {}) =>
  render(<CommercialProjectPickerModal {...defaultProps} {...props} />)

describe('CommercialProjectPickerModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    listActiveProjectOptions.mockResolvedValue([])
  })

  afterEach(() => {
    cleanup()
  })

  it('loads active project options and renders the shared commercial row UI', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        projectName: 'Project Alpha',
        clientName: 'Client A',
        projectType: 'Training',
        quoteValue: '14310',
      },
    ])

    renderPicker()

    expect(await screen.findByText('Project Alpha for Client A')).toBeInTheDocument()
    expect(screen.getByText('Training')).toBeInTheDocument()
    expect(screen.queryByText('Type: Training')).not.toBeInTheDocument()
    expect(screen.getByText('RM 14,310.00')).toBeInTheDocument()
    expect(screen.queryByText('ID 12')).not.toBeInTheDocument()
    expect(listActiveProjectOptions).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    })
  })

  it('searches by visible fields, value, and hidden ID', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        project_name: 'Project Alpha',
        client_name: 'Client A',
        project_type: 'Training',
        quote_value: '14310',
      },
      {
        id: 99,
        project_name: 'Equipment Beta',
        client_name: 'Client B',
        project_type: 'Equipment Supply',
        quote_value: '150',
      },
    ])

    renderPicker()

    expect(await screen.findByText('Project Alpha for Client A')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Select Project'), { target: { value: '99' } })
    expect(screen.queryByText('Project Alpha for Client A')).not.toBeInTheDocument()
    expect(screen.getByText('Equipment Beta for Client B')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Select Project'), { target: { value: '14,310' } })
    expect(screen.getByText('Project Alpha for Client A')).toBeInTheDocument()
    expect(screen.queryByText('Equipment Beta for Client B')).not.toBeInTheDocument()
  })

  it('shows and searches the specific category while retaining the Special workflow type', async () => {
    const onContinue = vi.fn()
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 77,
        projectName: 'Compliance Assessment',
        clientName: 'Client E',
        projectType: 'Special Service',
        quoteType: 'special',
        serviceCategory: 'Environment',
        serviceCategoryCode: 'ENV',
      },
    ])

    renderPicker({ onContinue })

    expect(await screen.findByText('Environment')).toBeInTheDocument()
    expect(screen.queryByText('Special Service')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Select Project'), { target: { value: 'env' } })
    fireEvent.click(screen.getByRole('button', { name: /compliance assessment for client e/i }))
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        project_type: 'Special Service',
        serviceCategory: 'Environment',
      }),
    )
  })

  it('disables continue until selection and returns normalized project data', async () => {
    const onContinue = vi.fn()
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        projectName: 'Project Alpha',
        clientName: 'Client A',
        projectType: 'Training',
        quoteValue: '14310',
      },
    ])

    renderPicker({ onContinue })

    expect(screen.getByRole('button', { name: /^continue$/i })).toBeDisabled()
    const projectRow = await screen.findByRole('button', { name: /project alpha for client a/i })
    fireEvent.click(projectRow)
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    expect(projectRow).toHaveAttribute('aria-pressed', 'true')
    expect(projectRow.getAttribute('style')).toContain(
      'background-color: rgba(var(--cui-primary-rgb), 0.12)',
    )
    expect(projectRow.getAttribute('style')).toContain(
      'border-color: rgba(var(--cui-primary-rgb), 0.28)',
    )
    expect(projectRow.getAttribute('style')).toContain('color: var(--cui-primary)')
    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 12,
        project_id: 12,
        project_name: 'Project Alpha',
        client_name: 'Client A',
        project_type: 'Training',
        quote_value: '14310',
        quoteValue: '14310',
      }),
    )
  })

  it('prefers current project value for display, search, and normalized commercial payloads', async () => {
    const onContinue = vi.fn()
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 15,
        projectName: 'Variation Project',
        clientName: 'Client C',
        projectType: 'Industrial Hygiene',
        quote_value: '1000',
        current_project_value: '1250',
        resolved_project_value: '1250',
      },
    ])

    renderPicker({ onContinue })

    expect(await screen.findByText('Variation Project for Client C')).toBeInTheDocument()
    expect(screen.getByText('RM 1,250.00')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Select Project'), { target: { value: '1,250' } })
    expect(screen.getByText('Variation Project for Client C')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /variation project for client c/i }))
    fireEvent.click(screen.getByRole('button', { name: /^continue$/i }))

    expect(onContinue).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 15,
        quote_value: '1250',
        quoteValue: '1250',
        current_project_value: '1250',
        resolved_project_value: '1250',
      }),
    )
  })

  it('renders loading, empty, and error states', async () => {
    listActiveProjectOptions.mockResolvedValue([])
    const { rerender } = renderPicker()

    expect(screen.getByText('Loading active projects...')).toBeInTheDocument()
    expect(
      await screen.findByText('No active projects are available for invoice creation.'),
    ).toBeInTheDocument()

    listActiveProjectOptions.mockRejectedValue(new Error('Unable to load projects now.'))
    rerender(<CommercialProjectPickerModal {...defaultProps} visible={false} />)
    rerender(<CommercialProjectPickerModal {...defaultProps} visible />)

    expect(await screen.findByText('Unable to load projects now.')).toBeInTheDocument()
  })

  it('filters by allowed project types case-insensitively', async () => {
    listActiveProjectOptions.mockResolvedValue([
      {
        id: 12,
        project_name: 'Training Alpha',
        client_name: 'Client A',
        project_type: 'training',
      },
      {
        id: 13,
        project_name: 'Manpower Beta',
        client_name: 'Client B',
        project_type: 'Manpower Supply',
      },
    ])

    renderPicker({
      title: 'Create JD14',
      selectLabel: 'Select Training Project',
      creationLabel: 'JD14',
      projectScopeLabel: 'active training projects',
      allowedProjectTypes: ['Training'],
    })

    expect(await screen.findByText('Training Alpha for Client A')).toBeInTheDocument()
    expect(screen.queryByText('Manpower Beta for Client B')).not.toBeInTheDocument()
  })
})
