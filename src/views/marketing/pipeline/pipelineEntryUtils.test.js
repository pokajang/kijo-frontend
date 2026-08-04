import { describe, expect, it } from 'vitest'
import {
  entrySources,
  getPipelineEntryValidationError,
  hasInvalidEstimatedRm,
  legalComplianceAssessmentSource,
  normalizeBulkRow,
  serviceCategories,
  serviceCategoryDisplayLabel,
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

  it('supports Consultancy - OSH and requires a description for Others', () => {
    expect(serviceCategories).toEqual(
      expect.arrayContaining([
        { value: 'consultancy_osh', label: 'Consultancy - OSH' },
        { value: 'other', label: 'Others' },
      ]),
    )

    const otherEntry = {
      entry_type: 'lead',
      entry_date: '2026-05-11',
      source: 'WhatsApp Personal',
      prospect_name: 'Acme Sdn Bhd',
      service_category: 'other',
      custom_service_category: '   ',
      estimated_rm: '',
    }

    expect(getPipelineEntryValidationError(otherEntry)).toBe(
      'Specify the service category when Others is selected.',
    )
    expect(
      getPipelineEntryValidationError({
        ...otherEntry,
        custom_service_category: 'Environmental Monitoring',
      }),
    ).toBe('')
    expect(serviceCategoryDisplayLabel('other', ' Environmental Monitoring ')).toBe(
      'Others — Environmental Monitoring',
    )
    expect(serviceCategoryDisplayLabel('consultancy_osh', 'Ignored')).toBe('Consultancy - OSH')
  })

  it('normalizes custom service text and clears it for canonical categories', () => {
    expect(
      normalizeBulkRow({
        entry_type: 'lead',
        entry_date: '2026-05-11',
        source: ' WhatsApp Personal ',
        segment_type: '',
        service_category: 'other',
        custom_service_category: ' Environmental Monitoring ',
        estimated_rm: '',
        prospect_name: ' Acme ',
        notes: '',
      }).custom_service_category,
    ).toBe('Environmental Monitoring')

    expect(
      normalizeBulkRow({
        entry_type: 'lead',
        entry_date: '2026-05-11',
        source: 'WhatsApp Personal',
        segment_type: '',
        service_category: 'training',
        custom_service_category: 'Stale value',
        estimated_rm: '',
        prospect_name: 'Acme',
        notes: '',
      }).custom_service_category,
    ).toBe('')
  })
})
