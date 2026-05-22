import { describe, expect, it } from 'vitest'
import { getKnowledgeSlugForPathname } from './knowledgeRouteMap'

describe('knowledgeRouteMap', () => {
  it('maps seeded module routes to contextual Knowledge articles', () => {
    expect(getKnowledgeSlugForPathname('/task-manager')).toBe(
      'how-to-create-and-manage-daily-tasks',
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
  })

  it('returns an empty slug for unmapped routes', () => {
    expect(getKnowledgeSlugForPathname('/knowledge')).toBe('')
  })
})
