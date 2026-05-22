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

describe('vendor frozen routes', () => {
  it('includes the frozen vendor list, detail, and legacy detail routes', () => {
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/vendor/frozen/:vendorId',
          name: 'Frozen Vendor Details',
        }),
        expect.objectContaining({
          path: '/vendor/frozen',
          name: 'Frozen Vendors',
        }),
        expect.objectContaining({
          path: '/vendor/manage/frozen/:vendorId',
          name: 'Frozen Vendor Details',
        }),
      ]),
    )
  })

  it('keeps the frozen vendor detail route before the frozen vendor list route', () => {
    const detailIndex = routes.findIndex((route) => route.path === '/vendor/frozen/:vendorId')
    const listIndex = routes.findIndex((route) => route.path === '/vendor/frozen')

    expect(detailIndex).toBeGreaterThanOrEqual(0)
    expect(listIndex).toBeGreaterThanOrEqual(0)
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

describe('commercial create routes', () => {
  it('keeps project create routes before commercial detail routes', () => {
    const routePairs = [
      ['/commercial/invoice/create/:projectId', '/commercial/invoice/:id'],
      ['/commercial/delivery-order/create/:projectId', '/commercial/delivery-order/:id'],
      ['/commercial/jd14/create/:projectId', '/commercial/jd14/:id'],
    ]

    routePairs.forEach(([createPath, detailPath]) => {
      const createIndex = routes.findIndex((route) => route.path === createPath)
      const detailIndex = routes.findIndex((route) => route.path === detailPath)

      expect(createIndex).toBeGreaterThanOrEqual(0)
      expect(detailIndex).toBeGreaterThanOrEqual(0)
      expect(createIndex).toBeLessThan(detailIndex)
    })
  })
})
