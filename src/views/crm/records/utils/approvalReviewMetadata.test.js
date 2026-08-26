import { describe, expect, it } from 'vitest'
import {
  enrichApprovalReviewMetadata,
  needsApprovalReviewMetadataHydration,
  readNullableNumber,
} from './approvalReviewMetadata'

describe('approval review metadata', () => {
  it('hydrates client and financial values from a matched quote record', () => {
    const metadata = enrichApprovalReviewMetadata(
      { id: 7, service: 'training', quote_id: 21 },
      {
        id: 21,
        quote_ref_no: 'QTR-021',
        quote_date: '2026-08-20',
        formData: { trainingTitle: 'Confined Space Training', estimated_cost: 100 },
        clientDetails: { companyName: 'Example Sdn Bhd' },
        amount: 'RM 130.00',
      },
    )

    expect(metadata).toMatchObject({
      quote_ref_no: 'QTR-021',
      quote_title: 'Confined Space Training',
      quote_date: '2026-08-20',
      client_name: 'Example Sdn Bhd',
      quoted_total: 130,
      estimated_cost: 100,
      margin_percent: 30,
      review_metadata_margin_calculated: true,
      review_metadata_missing_fields: [],
    })
  })

  it('keeps authoritative approval values over quote-record fallbacks', () => {
    const metadata = enrichApprovalReviewMetadata(
      {
        quoted_total: 250,
        estimated_cost: 200,
        margin_percent: 25,
      },
      {
        grandTotal: 130,
        estimatedCost: 100,
        marginPercent: 30,
      },
    )

    expect(metadata).toMatchObject({
      quoted_total: 250,
      estimated_cost: 200,
      margin_percent: 25,
      review_metadata_margin_calculated: false,
    })
  })

  it('marks incomplete approval data for hydration and review warning', () => {
    expect(needsApprovalReviewMetadataHydration({ quote_id: 21 })).toBe(true)

    const metadata = enrichApprovalReviewMetadata({ quote_id: 21 })
    expect(metadata.review_metadata_missing_fields).toContain('quoted total')
    expect(metadata.review_metadata_missing_fields).toContain('client')
  })

  it('parses currency strings without converting unavailable data to zero', () => {
    expect(readNullableNumber('RM 1,250.50')).toBe(1250.5)
    expect(readNullableNumber('')).toBeNull()
    expect(readNullableNumber(undefined, null)).toBeNull()
  })
})
