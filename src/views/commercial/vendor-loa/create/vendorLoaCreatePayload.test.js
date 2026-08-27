import { describe, expect, it } from 'vitest'
import { getVendorLoaUrl, getVendorLoaWordUrl } from './vendorLoaCreatePayload'

describe('Vendor LOA document URLs', () => {
  it('uses the same assignment scope for PDF and Word exports', () => {
    const input = { projectId: 12, vendorId: 34, assignmentId: 56 }

    expect(getVendorLoaUrl(input)).toContain('projects/12/loa?')
    expect(getVendorLoaWordUrl(input)).toContain('projects/12/loa/word?')
    expect(getVendorLoaUrl(input)).toContain('assignment_id=56')
    expect(getVendorLoaWordUrl(input)).toContain('assignment_id=56')
  })
})
