import { describe, expect, it } from 'vitest'
import { getKnowledgeSlugForPathname } from './knowledgeRouteMap'

describe('knowledgeRouteMap', () => {
  it('maps seeded module routes to contextual Knowledge articles', () => {
    expect(getKnowledgeSlugForPathname('/task-manager')).toBe(
      'how-to-create-and-manage-daily-tasks',
    )
    expect(getKnowledgeSlugForPathname('/pipeline/call-records/42')).toBe(
      'how-to-find-prospects-and-manage-call-records',
    )
    expect(getKnowledgeSlugForPathname('/project/manage/15')).toBe('how-to-manage-projects')
    expect(getKnowledgeSlugForPathname('/commercial/vendor-loa/20')).toBe(
      'how-to-use-commercial-records',
    )
    expect(getKnowledgeSlugForPathname('/commercial/debtors/create')).toBe(
      'how-to-track-and-create-manual-debtors',
    )
    expect(getKnowledgeSlugForPathname('/client/vendor-registration/12/edit')).toBe(
      'how-to-manage-client-vendor-registrations',
    )
    expect(getKnowledgeSlugForPathname('/administration/meetings/edit/12')).toBe(
      'how-to-create-and-manage-meeting-minutes',
    )
    expect(getKnowledgeSlugForPathname('/administration/procedures/view/7')).toBe(
      'how-to-upload-and-manage-standard-operating-procedures',
    )
    expect(getKnowledgeSlugForPathname('/administration/sport-time')).toBe(
      'how-to-record-and-track-sport-time-events',
    )
  })

  it('returns an empty slug for unmapped routes', () => {
    expect(getKnowledgeSlugForPathname('/knowledge')).toBe('')
  })
})
