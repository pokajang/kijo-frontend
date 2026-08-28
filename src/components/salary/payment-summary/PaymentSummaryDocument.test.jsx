import React from 'react'
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import PaymentSummaryDocument from './PaymentSummaryDocument'
import { buildOtherClaimLines } from './PaymentSummaryEmployeeDetails'
import { employeeTotals } from './paymentSummaryViewModel'

afterEach(cleanup)

const record = {
  reference: 'PAY-202608-R01',
  revision: 1,
  status: 'Issued',
  createdAt: '2026-08-27T14:23:00+08:00',
  snapshot: {
    periodLabel: 'August 2026',
    counts: { employees: 2, records: 3 },
    totals: { salary: 8333.6, otherClaims: 239.08, grandTotal: 8572.68 },
    employees: [
      {
        staffName: 'Azam Husain',
        staffCode: 'AZA',
        totals: {
          basicSalary: 3450,
          salaryAdjustments: 160,
          employeeDeductions: 405.15,
          netSalary: 3204.85,
          otherClaims: 239.08,
          employerContributions: 517.25,
          transferAmount: 3443.93,
        },
        salary: [
          {
            label: 'August 2026',
            basicSalary: 3450,
            employeeDeductions: 405.15,
            employerContributions: 517.25,
            payableSalary: 3204.85,
            deductions: {},
            lineItems: [
              {
                date: '2026-08-20',
                type: 'Allowance',
                description: 'Project allowance',
                amount: 160,
                attachments: [
                  {
                    name: 'project-allowance.pdf',
                    mimeType: 'application/pdf',
                    size: 4096,
                    accessKey: 'salary-evidence-key',
                  },
                ],
              },
            ],
            workflow: { approvedAt: '2026-08-26T10:00:00+08:00', approvedBy: 'Finance Approver' },
          },
        ],
        otherClaims: [
          {
            reference: 'OC-000001',
            label: 'August 2026',
            total: 183.13,
            lineItems: [
              {
                date: '2026-08-21',
                type: 'Travel',
                description: 'Travel claim',
                amount: 183.13,
                attachments: [],
              },
            ],
            workflow: {},
          },
          {
            reference: 'OC-000002',
            label: 'August 2026',
            total: 55.95,
            lineItems: [
              {
                date: '2026-08-22',
                type: 'Medical',
                description: 'Medical consultation',
                amount: 55.95,
                attachments: [
                  {
                    name: 'medical-receipt.pdf',
                    mimeType: 'application/pdf',
                    size: 8192,
                    accessKey: 'claim-evidence-key',
                  },
                ],
              },
            ],
            workflow: {},
          },
        ],
      },
      {
        staffName: 'Daniel Lee',
        staffCode: 'DNL',
        salary: [
          {
            label: 'August 2026',
            basicSalary: 5500,
            employeeDeductions: 371.25,
            payableSalary: 5128.75,
            lineItems: [],
            workflow: {},
          },
        ],
        otherClaims: [],
      },
    ],
  },
}

describe('PaymentSummaryDocument', () => {
  it('renders a skim-first employee register and suppresses zero-value categories', () => {
    render(<PaymentSummaryDocument record={record} />)

    expect(
      screen.getByRole('heading', { name: 'Payment Summary — August 2026' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('PAY-202608-R01')).not.toBeInTheDocument()
    expect(screen.queryByText(/Revision 1/i)).not.toBeInTheDocument()
    expect(screen.getByText('RM 8,572.68')).toBeInTheDocument()
    const danielCard = screen.getByText('Daniel Lee').closest('article')
    expect(within(danielCard).getAllByText('RM 5,128.75')).toHaveLength(2)
    expect(within(danielCard).getByText('Net salary')).toBeInTheDocument()
    expect(within(danielCard).getByText('Transfer amount')).toBeInTheDocument()
    expect(within(danielCard).queryByText('Other claims')).not.toBeInTheDocument()
    expect(screen.queryByText('Project allowance')).not.toBeInTheDocument()
  })

  it('opens one employee detail section at a time', () => {
    const { container } = render(<PaymentSummaryDocument record={record} />)

    const toggles = screen.getAllByRole('button', { name: /view payment details/i })
    fireEvent.click(toggles[0])
    expect(screen.getAllByText('Project allowance')).toHaveLength(2)
    expect(screen.queryByText('Employer contributions')).not.toBeInTheDocument()
    expect(screen.queryByText(/Approved by Finance Approver/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Attachment evidence')).not.toBeInTheDocument()
    expect(container.querySelectorAll('dl.payment-summary-mobile-kv').length).toBeGreaterThan(0)
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'true')

    fireEvent.click(toggles[1])
    expect(screen.queryByText('Project allowance')).not.toBeInTheDocument()
    expect(toggles[0]).toHaveAttribute('aria-expanded', 'false')
    expect(toggles[1]).toHaveAttribute('aria-expanded', 'true')
  })

  it('uses the full staff row as the disclosure and consolidates other claims', () => {
    render(<PaymentSummaryDocument record={record} />)

    const trigger = screen.getByRole('button', {
      name: 'View payment details for Azam Husain',
    })
    expect(trigger).toHaveAccessibleName('View payment details for Azam Husain')

    fireEvent.click(trigger)

    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getAllByRole('heading', { name: 'Other claims' })).toHaveLength(1)
    expect(screen.getAllByText('OC-000001').length).toBeGreaterThan(0)
    expect(screen.getAllByText('OC-000002').length).toBeGreaterThan(0)
    expect(screen.queryByRole('heading', { name: /Other claim ·/ })).not.toBeInTheDocument()
  })

  it('exposes protected attachment actions only when a resolver returns a URL', () => {
    const resolveAttachmentUrl = (file) => `/summary/attachments/${file.accessKey}`
    render(<PaymentSummaryDocument record={record} resolveAttachmentUrl={resolveAttachmentUrl} />)

    fireEvent.click(screen.getByRole('button', { name: 'View payment details for Azam Husain' }))

    const salaryLinks = screen.getAllByRole('link', {
      name: 'See attachment: project-allowance.pdf',
    })
    const claimLinks = screen.getAllByRole('link', {
      name: 'See attachment: medical-receipt.pdf',
    })
    expect(salaryLinks[0]).toHaveAttribute('href', '/summary/attachments/salary-evidence-key')
    expect(claimLinks[0]).toHaveAttribute('target', '_blank')
    expect(claimLinks[0]).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('derives totals for historical snapshots that predate employee totals', () => {
    expect(employeeTotals(record.snapshot.employees[1])).toMatchObject({
      basicSalary: 5500,
      netSalary: 5128.75,
      otherClaims: 0,
      transferAmount: 5128.75,
    })
  })

  it('keeps same-date claim lines uniquely addressable after consolidation', () => {
    const lines = buildOtherClaimLines([
      {
        reference: 'OC-000003',
        lineItems: [
          { date: '2026-08-22', description: 'Breakfast', amount: 10 },
          { date: '2026-08-22', description: 'Lunch', amount: 20 },
        ],
      },
    ])

    expect(new Set(lines.map((line) => line.summaryLineKey)).size).toBe(2)
  })
})
