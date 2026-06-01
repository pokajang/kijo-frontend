import { describe, expect, it } from 'vitest'

import {
  getCommercialReturnContext,
  getProjectReturnState,
  withProjectReturnParams,
} from './commercialReturnNavigation'

describe('commercial return navigation', () => {
  it('uses project origin from navigation state', () => {
    expect(
      getCommercialReturnContext(
        { state: { from: 'project-manage', fromProjectId: 12 }, search: '' },
        '/commercial/invoice',
      ),
    ).toEqual({
      isProjectOrigin: true,
      projectId: '12',
      backLabel: 'Back to Project',
      backPath: '/project/manage/12',
      listPath: '/commercial/invoice',
    })
  })

  it('uses project origin from query params after refresh', () => {
    expect(
      getCommercialReturnContext(
        { state: null, search: '?from=project&projectId=110' },
        '/commercial/delivery-order',
      ),
    ).toMatchObject({
      isProjectOrigin: true,
      projectId: '110',
      backLabel: 'Back to Project',
      backPath: '/project/manage/110',
    })
  })

  it('falls back to the commercial list without project origin', () => {
    expect(getCommercialReturnContext({ state: null, search: '' }, '/commercial/jd14')).toEqual({
      isProjectOrigin: false,
      projectId: '',
      backLabel: 'Back',
      backPath: '/commercial/jd14',
      listPath: '/commercial/jd14',
    })
  })

  it('falls back to the commercial list for invalid project query params', () => {
    expect(
      getCommercialReturnContext(
        { state: null, search: '?from=project&projectId=' },
        '/commercial/vendor-loa',
      ),
    ).toMatchObject({
      isProjectOrigin: false,
      backLabel: 'Back',
      backPath: '/commercial/vendor-loa',
    })
  })

  it('adds durable project return params to commercial detail hrefs', () => {
    expect(withProjectReturnParams('/commercial/invoice/1', 12)).toBe(
      '/commercial/invoice/1?from=project&projectId=12',
    )
    expect(withProjectReturnParams('/commercial/invoice/1?tab=details#top', 12)).toBe(
      '/commercial/invoice/1?tab=details&from=project&projectId=12#top',
    )
  })

  it('builds navigation state for project-origin links', () => {
    expect(getProjectReturnState(12)).toEqual({
      from: 'project-manage',
      fromProjectId: '12',
    })
  })
})
