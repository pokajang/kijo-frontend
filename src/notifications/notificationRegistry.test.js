import { describe, expect, it } from 'vitest'
import { getRouteNotificationBadge, getTabNotificationBadge } from './notificationRegistry'

describe('payment queue notification registry', () => {
  it('maps financial and applicant payment notifications to visible badges', () => {
    expect(getRouteNotificationBadge('/financial/payment-queue')?.title).toContain('payments')
    expect(getTabNotificationBadge('financial.payment-queue')?.title).toContain('payments')
    expect(getRouteNotificationBadge('/my/salary/payment-queue')?.title).toContain('Payment')
    expect(getTabNotificationBadge('my.salary.payment-queue')?.title).toContain('Payment')
  })

  it('maps feedback notifications to Support and Feedback Records badges', () => {
    expect(getRouteNotificationBadge('/support/feedback')?.title).toContain('Feedback')
    expect(getTabNotificationBadge('support.feedback')?.title).toContain('Feedback')
  })
})
