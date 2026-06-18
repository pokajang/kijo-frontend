import { describe, expect, it } from 'vitest'
import routes from './routes'

describe('support feedback routes', () => {
  it('keeps the feedback SLA analytics route before the feedback detail route', () => {
    const slaIndex = routes.findIndex((route) => route.path === '/support/feedback/sla')
    const detailIndex = routes.findIndex((route) => route.path === '/support/feedback/:feedbackId')

    expect(slaIndex).toBeGreaterThanOrEqual(0)
    expect(detailIndex).toBeGreaterThanOrEqual(0)
    expect(slaIndex).toBeLessThan(detailIndex)
  })
})

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

describe('vendor workflow routes', () => {
  it('redirects the old payment workflow settings route to central workflows', () => {
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/vendor/workflow',
          name: 'Vendor Payment Workflow',
        }),
      ]),
    )
  })
})

describe('staff leave admin routes', () => {
  it('limits entitlement admin routes to HR and System Admin', () => {
    const protectedPaths = [
      '/staff/leaves/entitlements',
      '/staff/leaves/assign',
      '/staff/leaves/entitlements/:entitlementId/edit',
    ]

    protectedPaths.forEach((path) => {
      const route = routes.find((item) => item.path === path)

      expect(route?.element?.props?.allowedRoles).toEqual(['System Admin', 'HR'])
    })
  })

  it('redirects the old leave workflow route to central workflows', () => {
    const route = routes.find((item) => item.path === '/staff/leaves/workflow')

    expect(route).toBeTruthy()
    expect(route?.element?.props?.allowedRoles).toBeUndefined()
  })
})

describe('personal salary routes', () => {
  it('includes payment queue, salary records, and apply workspace routes', () => {
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/my/salary/payment-queue',
          name: 'My Salary Payment Queue',
        }),
        expect.objectContaining({
          path: '/my/salary/payment-queue/:staffId/:period',
          name: 'My Salary Payment Queue Details',
        }),
        expect.objectContaining({
          path: '/my/salary/records',
          name: 'My Salary Records',
        }),
        expect.objectContaining({
          path: '/my/salary',
          name: 'My Salary Payment Queue',
        }),
        expect.objectContaining({
          path: '/my/salary/apply',
          name: 'Apply Salary',
        }),
        expect.objectContaining({
          path: '/my/salary/settings',
          name: 'My Salary Settings',
        }),
        expect.objectContaining({
          path: '/my/salary/records/:salaryRecordId',
          name: 'My Salary Details',
        }),
      ]),
    )
  })

  it('keeps the salary detail route before the salary records route', () => {
    const detailIndex = routes.findIndex(
      (route) => route.path === '/my/salary/records/:salaryRecordId',
    )
    const recordsIndex = routes.findIndex((route) => route.path === '/my/salary/records')

    expect(detailIndex).toBeGreaterThanOrEqual(0)
    expect(recordsIndex).toBeGreaterThanOrEqual(0)
    expect(detailIndex).toBeLessThan(recordsIndex)
  })

  it('redirects the old salary root to the payment queue tab URL', () => {
    const route = routes.find((item) => item.path === '/my/salary')

    expect(route?.element?.props?.to).toBe('/my/salary/payment-queue')
    expect(route?.element?.props?.replace).toBe(true)
  })
})

describe('financial routes', () => {
  it('includes the internal operations financial payment queue page', () => {
    const route = routes.find((item) => item.path === '/financial/payment-queue')

    expect(route).toEqual(
      expect.objectContaining({
        path: '/financial/payment-queue',
        name: 'Payment Queue',
      }),
    )
    expect(route?.element?.props?.allowedRoles).toEqual([
      'System Admin',
      'Manager',
      'HR',
      'Finance',
      'Account',
      'Bank',
    ])
  })

  it('includes the internal operations financial payment queue detail page', () => {
    const route = routes.find((item) => item.path === '/financial/payment-queue/:staffId/:period')

    expect(route).toEqual(
      expect.objectContaining({
        path: '/financial/payment-queue/:staffId/:period',
        name: 'Payment Queue Details',
      }),
    )
    expect(route?.element?.props?.allowedRoles).toEqual([
      'System Admin',
      'Manager',
      'HR',
      'Finance',
      'Account',
      'Bank',
    ])
  })

  it('includes the internal operations financial salary records page', () => {
    const route = routes.find((item) => item.path === '/financial/salary-records')

    expect(route).toEqual(
      expect.objectContaining({
        path: '/financial/salary-records',
        name: 'Salary Records',
      }),
    )
    expect(route?.element?.props?.allowedRoles).toEqual([
      'System Admin',
      'Manager',
      'HR',
      'Finance',
      'Account',
      'Bank',
    ])
  })

  it('includes the financial balance sheet page', () => {
    const route = routes.find((item) => item.path === '/financial/balance-sheet')

    expect(route).toEqual(
      expect.objectContaining({
        path: '/financial/balance-sheet',
        name: 'Balance Sheet',
      }),
    )
    expect(route?.element?.props?.allowedRoles).toEqual([
      'System Admin',
      'Manager',
      'HR',
      'Finance',
      'Account',
      'Bank',
    ])
  })
})

describe('central workflow routes', () => {
  it('redirects the workflow root and includes template settings routes', () => {
    const root = routes.find((item) => item.path === '/workflows')
    const settings = routes.find((item) => item.path === '/workflows/:templateKey')

    expect(root?.element?.props?.to).toBe('/workflows/salary-application')
    expect(settings?.element?.props?.allowedRoles).toEqual([
      'System Admin',
      'Manager',
      'HR',
      'Finance',
      'Account',
      'Bank',
    ])
  })
})

describe('personal account routes', () => {
  it('includes profile, signature, and password pages', () => {
    expect(routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: '/my/account',
          name: 'My Account',
        }),
        expect.objectContaining({
          path: '/my/profile',
          name: 'My Profile',
        }),
        expect.objectContaining({
          path: '/my/signature',
          name: 'My Signature',
        }),
        expect.objectContaining({
          path: '/my/password',
          name: 'My Password',
        }),
      ]),
    )
  })
})

describe('commercial create routes', () => {
  it('keeps project create routes before commercial detail routes', () => {
    const routePairs = [
      ['/commercial/invoice/create/:projectId', '/commercial/invoice/:id'],
      ['/commercial/delivery-order/create/:projectId', '/commercial/delivery-order/:id'],
      ['/commercial/jd14/create/:projectId', '/commercial/jd14/:id'],
      ['/commercial/vendor-loa/create/:projectId', '/commercial/vendor-loa/:id'],
      ['/commercial/supplier-po/create/:projectId', '/commercial/supplier-po/:id'],
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
