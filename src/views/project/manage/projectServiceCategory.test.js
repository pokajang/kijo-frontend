import { describe, expect, it } from 'vitest'

import {
  getProjectServiceCategory,
  getProjectServiceCategoryCode,
  getProjectWorkflowType,
  isQuoteBackedProject,
} from './projectServiceCategory'

describe('projectServiceCategory', () => {
  it('prefers the API category while preserving the workflow type', () => {
    const project = {
      quote_id: 88,
      project_type: 'Special Service',
      service_category: 'Environment',
      service_category_code: 'ENV',
    }

    expect(getProjectServiceCategory(project)).toBe('Environment')
    expect(getProjectServiceCategoryCode(project)).toBe('ENV')
    expect(getProjectWorkflowType(project)).toBe('Special Service')
    expect(isQuoteBackedProject(project)).toBe(true)
  })

  it('falls back to the workflow type for legacy and non-Special projects', () => {
    expect(getProjectServiceCategory({ project_type: 'Training' })).toBe('Training')
    expect(getProjectServiceCategory({ projectType: 'Special Service' })).toBe('Special Service')
    expect(getProjectServiceCategory({})).toBe('-')
  })
})
