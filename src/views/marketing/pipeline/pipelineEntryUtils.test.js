import { describe, expect, it } from 'vitest'
import {
  entrySources,
  getPipelineEntryValidationError,
  hasInvalidEstimatedRm,
  legalComplianceAssessmentSource,
  normalizeBulkRow,
} from './pipelineEntryUtils'

describe('pipeline entry utilities', () => {
  it('validates shared manual pipeline entry requirements', () => {
    expect(
      getPipelineEntryValidationError({
        entry_type: 'closed',
        entry_date: '2026-05-11',
        source: 'WhatsApp Personal',
        prospect_name: 'Acme Sdn Bhd',
        service_category: '',
        estimated_rm: '1000',
      }),
    ).toBe('Closed manual entries require a service category.')

    expect(
      getPipelineEntryValidationError({
        entry_type: 'closed',
        entry_date: '2026-05-11',
        source: 'WhatsApp Personal',
        prospect_name: 'Acme Sdn Bhd',
        service_category: 'training',
        estimated_rm: '0',
      }),
    ).toBe('Closed manual entries require Estimated RM greater than zero.')

    expect(
      getPipelineEntryValidationError({
        entry_type: 'proposal',
        entry_date: '2026-05-11',
        source: 'WhatsApp Personal',
        prospect_name: 'Acme Sdn Bhd',
        service_category: '',
        estimated_rm: '0',
      }),
    ).toBe('')
  })

  it('normalizes stale estimated RM away from non-value pipeline stages', () => {
    const normalized = normalizeBulkRow({
      entry_type: 'lead',
      entry_date: '2026-05-11',
      source: ' WhatsApp Personal ',
      segment_type: '',
      service_category: '',
      estimated_rm: '5000',
      prospect_name: ' Acme Sdn Bhd ',
      notes: ' Follow up ',
      photoFile: null,
    })

    expect(normalized.estimated_rm).toBe('')
    expect(normalized.source).toBe('WhatsApp Personal')
    expect(normalized.prospect_name).toBe('Acme Sdn Bhd')
    expect(hasInvalidEstimatedRm('-1')).toBe(true)
  })

  it('exposes free legal compliance assessments as a source filter option', () => {
    expect(entrySources).toContain(legalComplianceAssessmentSource)
  })
})
