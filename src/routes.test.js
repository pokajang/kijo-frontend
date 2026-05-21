import { describe, expect, it } from 'vitest'
import routes from './routes'

describe('client ROI routes', () => {
  it('includes the commercial history drilldown route before the ROI list route', () => {
    const detailIndex = routes.findIndex((route) => route.path === '/client/roi/:companyId')
    const listIndex = routes.findIndex((route) => route.path === '/client/roi')

    expect(detailIndex).toBeGreaterThanOrEqual(0)
    expect(listIndex).toBeGreaterThanOrEqual(0)
    expect(detailIndex).toBeLessThan(listIndex)
  })
})

describe('client vendor registration routes', () => {
  it('includes the vendor registration tab and form page routes', () => {
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/client/vendor-registration/create',
          name: 'Add Vendor Registration',
        }),
        expect.objectContaining({
          path: '/client/vendor-registration/:registrationId/edit',
          name: 'Edit Vendor Registration',
        }),
        expect.objectContaining({
          path: '/client/vendor-registration/:registrationId',
          name: 'Vendor Registration Details',
        }),
        expect.objectContaining({
          path: '/client/vendor-registration',
          name: 'Vendor Registration',
        }),
      ]),
    )
  })

  it('keeps the detail route between edit and list routes', () => {
    const editIndex = routes.findIndex(
      (route) => route.path === '/client/vendor-registration/:registrationId/edit',
    )
    const detailIndex = routes.findIndex(
      (route) => route.path === '/client/vendor-registration/:registrationId',
    )
    const listIndex = routes.findIndex((route) => route.path === '/client/vendor-registration')

    expect(editIndex).toBeGreaterThanOrEqual(0)
    expect(detailIndex).toBeGreaterThanOrEqual(0)
    expect(listIndex).toBeGreaterThanOrEqual(0)
    expect(editIndex).toBeLessThan(detailIndex)
    expect(detailIndex).toBeLessThan(listIndex)
  })
})

describe('staff leave admin routes', () => {
  it('limits entitlement and workflow admin routes to HR and System Admin', () => {
    const protectedPaths = [
      '/staff/leaves/entitlements',
      '/staff/leaves/assign',
      '/staff/leaves/workflow',
      '/staff/leaves/entitlements/:entitlementId/edit',
    ]

    protectedPaths.forEach((path) => {
      const route = routes.find((item) => item.path === path)

      expect(route?.element?.props?.allowedRoles).toEqual(['System Admin', 'HR'])
    })
  })
})
