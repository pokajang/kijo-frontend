import { describe, expect, it } from 'vitest'
import {
  clientModuleTabs,
  financialModuleTabs,
  salarySelfModuleTabs,
  supportModuleTabs,
  systemAdminModuleTabs,
  vendorModuleTabs,
  workflowModuleTabs,
} from './moduleNavConfigs'

describe('supportModuleTabs', () => {
  it('maps Feedback Records to its notification badge key', () => {
    expect(supportModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'feedback-records',
          to: '/support/feedback',
          notificationTabKey: 'support.feedback',
        }),
      ]),
    )
  })
})

describe('clientModuleTabs', () => {
  it('includes the First Touch tab', () => {
    expect(clientModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'first-touch',
          label: 'First Touch',
          to: '/client/first-touch',
          notificationTabKey: 'client.first-touch',
        }),
      ]),
    )
  })

  it('includes the ROI per Client tab', () => {
    expect(clientModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'roi',
          label: 'ROI per Client',
          to: '/client/roi',
        }),
      ]),
    )
  })

  it('includes the Vendor Registration tab', () => {
    expect(clientModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'vendor-registration',
          label: 'Vendor Registration',
          to: '/client/vendor-registration',
        }),
      ]),
    )
  })
})

describe('workflowModuleTabs', () => {
  it('includes First Touch conflict settings', () => {
    expect(workflowModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'client-first-touch-conflict',
          label: 'First Touch',
          to: '/workflows/client-first-touch-conflict',
        }),
      ]),
    )
  })
})

describe('systemAdminModuleTabs', () => {
  it('includes the Email Test tab', () => {
    expect(systemAdminModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'email-test',
          label: 'Email Test',
        }),
      ]),
    )
  })
})

describe('vendorModuleTabs', () => {
  it('puts Payment Queue first', () => {
    expect(vendorModuleTabs[0]).toMatchObject({
      key: 'payment-records',
      label: 'Payment Queue',
      to: '/vendor/payment-records',
      notificationTabKey: 'vendor.payment-records',
    })
  })

  it('includes the Vendor Ledger tab', () => {
    expect(vendorModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'paid',
          label: 'Vendor Ledger',
          to: '/vendor/paid',
        }),
      ]),
    )
  })

  it('includes the Workflow Settings tab', () => {
    expect(vendorModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'workflow',
          label: 'Workflow Settings',
          to: '/workflows/vendor-payment',
          allowedRoles: ['System Admin', 'Manager', 'HR', 'Finance', 'Account', 'Bank'],
        }),
      ]),
    )
  })

  it('does not surface Pay Vendor or Create Vendor', () => {
    expect(vendorModuleTabs).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          to: '/vendor/pay',
        }),
      ]),
    )

    expect(vendorModuleTabs).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          to: '/vendor/create',
        }),
      ]),
    )
  })

  it('keeps Manage Vendors after Vendor Ledger', () => {
    expect(vendorModuleTabs[2]).toMatchObject({
      key: 'manage',
      label: 'Manage Vendors',
      to: '/vendor/manage',
    })
  })

  it('includes the Frozen Vendors tab', () => {
    expect(vendorModuleTabs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'frozen',
          label: 'Frozen Vendors',
          to: '/vendor/frozen',
        }),
      ]),
    )
  })

  it('puts Workflow Settings at the end', () => {
    expect(vendorModuleTabs.at(-1)).toMatchObject({
      key: 'workflow',
      label: 'Workflow Settings',
      to: '/workflows/vendor-payment',
      allowedRoles: ['System Admin', 'Manager', 'HR', 'Finance', 'Account', 'Bank'],
    })
  })
})

describe('financialModuleTabs', () => {
  it('shows Payment Queue, Salary Records, Other Claim Records, and Balance Sheet tabs', () => {
    expect(financialModuleTabs).toEqual([
      {
        key: 'payment-queue',
        label: 'Payment Queue',
        to: '/financial/payment-queue',
        notificationTabKey: 'financial.payment-queue',
      },
      {
        key: 'salary-records',
        label: 'Salary Records',
        to: '/financial/salary-records',
        notificationTabKey: 'financial.salary-records',
      },
      {
        key: 'other-claim-records',
        label: 'Other Claim Records',
        to: '/financial/other-claim-records',
        notificationTabKey: 'financial.other-claim-records',
      },
      {
        key: 'balance-sheet',
        label: 'Balance Sheet',
        to: '/financial/balance-sheet',
      },
    ])
  })
})

describe('salarySelfModuleTabs', () => {
  it('shows my payments, salary application, records, other claim, and settings tabs', () => {
    expect(salarySelfModuleTabs).toEqual([
      {
        key: 'payment-queue',
        label: 'My Payments',
        to: '/my/salary/payment-queue',
        notificationTabKey: 'my.salary.payment-queue',
      },
      {
        key: 'apply',
        label: 'Apply Salary',
        to: '/my/salary/apply',
      },
      {
        key: 'records',
        label: 'Salary Records',
        to: '/my/salary/records',
        notificationTabKey: 'my.salary.records',
      },
      {
        key: 'other-claim-apply',
        label: 'Apply Other Claim',
        to: '/my/salary/other-claims/apply',
      },
      {
        key: 'other-claim-records',
        label: 'Other Claim Records',
        to: '/my/salary/other-claims/records',
        notificationTabKey: 'my.salary.other-claim-records',
      },
      {
        key: 'settings',
        label: 'Settings',
        to: '/my/salary/settings',
      },
    ])
  })
})
