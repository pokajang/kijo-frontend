import { describe, expect, it } from 'vitest'
import {
  buildFinancialOtherClaimStats,
  canExportFinancialOtherClaim,
  claimsTotalText,
  workflowText,
} from './FinancialOtherClaimRecordsPage'

describe('canExportFinancialOtherClaim', () => {
  it('does not offer a PDF export for withdrawn or archived claims', () => {
    expect(canExportFinancialOtherClaim({ status: 'Cancelled' })).toBe(false)
  })

  it('does not offer a PDF export for a read-only workflow row', () => {
    expect(
      canExportFinancialOtherClaim({ status: 'Submitted', canViewFinancialDetails: false }),
    ).toBe(false)
  })

  it('keeps PDF export available for active financial claims', () => {
    expect(canExportFinancialOtherClaim({ status: 'Approved' })).toBe(true)
  })

  it('shows the server-provided workflow summary and redacts restricted values', () => {
    expect(
      workflowText({
        workflow: { summary: 'Reviewed by Manager (MGR) • Pending approval by Admin (ADM)' },
      }),
    ).toBe('Reviewed by Manager (MGR) • Pending approval by Admin (ADM)')
    expect(claimsTotalText({ canViewFinancialDetails: false, claimsTotal: null })).toBe(
      'Restricted',
    )
  })
})

describe('buildFinancialOtherClaimStats', () => {
  it('keeps the four reviewer and approver decision states only', () => {
    const stats = buildFinancialOtherClaimStats([
      { status: 'Submitted' },
      { status: 'Prepared' },
      { status: 'Checked' },
      { status: 'Approved' },
      { status: 'Paid' },
      { status: 'Rejected' },
      { status: 'Cancelled' },
    ])

    expect(stats).toEqual([
      expect.objectContaining({ key: 'submitted', value: 2 }),
      expect.objectContaining({ key: 'checked', value: 1 }),
      expect.objectContaining({ key: 'approved', value: 1 }),
      expect.objectContaining({ key: 'rejected', value: 1 }),
    ])
  })
})
