import { describe, expect, it } from 'vitest'
import { API_BASE, getLegalComplianceAssessmentWordUrl } from './legalComplianceApi'

describe('getLegalComplianceAssessmentWordUrl', () => {
  it('uses the assessment Word endpoint and safely encodes the identifier', () => {
    expect(getLegalComplianceAssessmentWordUrl('47/preview')).toBe(
      `${API_BASE}legal-compliance-assessments/47%2Fpreview/word`,
    )
  })
})
