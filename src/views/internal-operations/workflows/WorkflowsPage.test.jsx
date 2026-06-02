import React from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { refreshWorkflowSetupStatus } = vi.hoisted(() => ({
  refreshWorkflowSetupStatus: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../../workflows/WorkflowSetupStatusProvider', () => ({
  useWorkflowSetupStatus: () => ({
    refreshWorkflowSetupStatus,
    getWorkflowSetupCount: () => 0,
    getWorkflowSetupTotal: () => 0,
  }),
}))

vi.mock('../../../api/apiClient', () => ({
  apiJson: vi.fn(),
}))

vi.mock('../../../components/forms/ThemedSelect', () => ({
  default: ({ options = [], value = [], onChange, isDisabled }) => (
    <select
      aria-label="Named staff recipients"
      disabled={isDisabled}
      value={value[0]?.value ? String(value[0].value) : ''}
      onChange={(event) =>
        onChange(
          [options.find((item) => String(item.value) === event.target.value)].filter(Boolean),
        )
      }
    >
      <option value="">Use fallback</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}))

const { apiJson } = await import('../../../api/apiClient')
const { default: WorkflowsPage } = await import('./WorkflowsPage')

afterEach(() => {
  cleanup()
})

const renderPage = (path = '/workflows/salary-application') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/workflows" element={<WorkflowsPage />} />
        <Route path="/workflows/:templateKey" element={<WorkflowsPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('WorkflowsPage', () => {
  beforeEach(() => {
    apiJson.mockReset()
    refreshWorkflowSetupStatus.mockClear()
    apiJson.mockImplementation((url, options = {}) => {
      if (
        String(url).includes('workflows/templates/salary-application') &&
        options.method === 'PUT'
      ) {
        return Promise.resolve({ message: 'Salary workflow settings saved.' })
      }

      if (String(url).includes('workflows/templates/vendor-payment') && options.method === 'PUT') {
        return Promise.resolve({ message: 'Vendor payment workflow settings saved.' })
      }

      if (String(url).includes('workflows/templates/vendor-payment')) {
        return Promise.resolve({
          can_edit: true,
          active_staff: [{ staff_id: 30, full_name: 'Manager Example', name_code: 'MGR' }],
          template: {
            key: 'vendor-payment',
            label: 'Vendor Payment',
            adapter: 'vendor',
            settings: {
              review_enabled: true,
              review_levels: 1,
              approval_enabled: true,
              approval_levels: 1,
            },
            steps: [
              {
                id: 'review.1',
                stepKey: 'review',
                levelNo: 1,
                label: 'Review',
                fallbackLabel: 'Using module fallback recipients',
                recipients: [],
                usingDefault: true,
              },
              {
                id: 'approval.1',
                stepKey: 'approval',
                levelNo: 1,
                label: 'Approval',
                fallbackLabel: 'Using module fallback recipients',
                recipients: [],
                usingDefault: true,
              },
              {
                id: 'finance.1',
                stepKey: 'finance',
                levelNo: 1,
                label: 'Finance',
                fallbackLabel: 'Using module fallback recipients',
                recipients: [],
                usingDefault: true,
              },
            ],
          },
        })
      }

      if (String(url).includes('workflows/templates/salary-application')) {
        return Promise.resolve({
          can_edit: true,
          active_staff: [{ staff_id: 30, full_name: 'Manager Example', name_code: 'MGR' }],
          template: {
            key: 'salary-application',
            label: 'Salary',
            steps: [
              {
                id: 1,
                stepKey: 'check',
                levelNo: 1,
                label: 'Check',
                fallbackLabel: 'Finance, Account, HR, Manager, System Admin',
                recipients: [],
                usingDefault: true,
              },
            ],
          },
        })
      }

      if (String(url).includes('workflows/templates')) {
        return Promise.resolve({
          can_edit: true,
          templates: [{ key: 'salary-application', label: 'Salary' }],
        })
      }

      return Promise.resolve({})
    })
  })

  it('renders workflow settings without the removed inbox tab', async () => {
    renderPage()

    expect(await screen.findByText('Salary Approval Setup')).toBeInTheDocument()
    expect(screen.getByText(/Checkers review the submitted salary month/i)).toBeInTheDocument()
    expect(screen.queryByRole('tab', { name: /^inbox$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /columns/i })).not.toBeInTheDocument()
    expect(screen.queryByText(/rows/i)).not.toBeInTheDocument()
  })

  it('renders salary settings and saves named recipients', async () => {
    renderPage('/workflows/salary-application')

    expect(await screen.findByText('Salary Approval Setup')).toBeInTheDocument()
    expect((await screen.findAllByText('Salary')).length).toBeGreaterThan(0)
    expect(
      screen.getByText('Fallback: Finance, Account, HR, Manager, System Admin'),
    ).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Named staff recipients'), {
      target: { value: '30' },
    })
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => {
      expect(apiJson).toHaveBeenCalledWith(
        expect.stringContaining('workflows/templates/salary-application'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"recipient_staff_ids":[30]'),
        }),
      )
    })
    await waitFor(() => {
      expect(refreshWorkflowSetupStatus).toHaveBeenCalled()
    })
  })

  it('reshapes vendor workflow rows when level controls change before save', async () => {
    renderPage('/workflows/vendor-payment')

    expect((await screen.findAllByText('Vendor Payment')).length).toBeGreaterThan(0)
    expect(screen.getByText(/Reviewers check the request details/i)).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Review levels'), {
      target: { value: '2' },
    })

    expect(screen.getByText('Review Level 1')).toBeInTheDocument()
    expect(screen.getByText('Review Level 2')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /save settings/i }))

    await waitFor(() => {
      expect(apiJson).toHaveBeenCalledWith(
        expect.stringContaining('workflows/templates/vendor-payment'),
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"review_levels":2'),
        }),
      )
    })
  })
})
