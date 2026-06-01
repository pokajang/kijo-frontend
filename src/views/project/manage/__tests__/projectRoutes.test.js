import { describe, expect, it } from 'vitest'

import {
  getCommercialCreatePath,
  getProjectManagePath,
  isProjectManagePathCanonical,
} from '../projectRoutes'

describe('projectRoutes', () => {
  const project = {
    id: 12,
    project_name: 'Project Alpha',
    project_type: 'Equipment Supply',
  }

  it('builds canonical project manage paths with slugs', () => {
    expect(getProjectManagePath(project)).toBe('/project/manage/12/equipment-supply/project-alpha')
  })

  it('falls back missing project type and name slugs', () => {
    expect(getProjectManagePath({ id: 99, project_name: '', project_type: '' })).toBe(
      '/project/manage/99/project/details',
    )
  })

  it.each([
    ['invoice', '/commercial/invoice/create/12'],
    ['delivery-order', '/commercial/delivery-order/create/12'],
    ['jd14', '/commercial/jd14/create/12'],
    ['vendor-loa', '/commercial/vendor-loa/create/12'],
    ['supplier-po', '/commercial/supplier-po/create/12'],
  ])('builds %s commercial create paths', (documentType, expectedPath) => {
    expect(getCommercialCreatePath(documentType, 12)).toBe(expectedPath)
  })

  it('identifies canonical project manage params', () => {
    expect(
      isProjectManagePathCanonical(project, {
        id: '12',
        type: 'equipment-supply',
        name: 'project-alpha',
      }),
    ).toBe(true)
  })

  it('rejects missing, stale, or mismatched project manage params', () => {
    expect(isProjectManagePathCanonical(project, { id: '12' })).toBe(false)
    expect(
      isProjectManagePathCanonical(project, {
        type: 'equipment-supply',
        name: 'project-alpha',
      }),
    ).toBe(false)
    expect(
      isProjectManagePathCanonical(project, {
        id: '12',
        type: 'old-type',
        name: 'project-alpha',
      }),
    ).toBe(false)
    expect(
      isProjectManagePathCanonical(project, {
        id: '999',
        type: 'equipment-supply',
        name: 'project-alpha',
      }),
    ).toBe(false)
  })
})
