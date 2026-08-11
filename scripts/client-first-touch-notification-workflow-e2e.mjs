import { chromium } from 'playwright'

const baseUrl = process.env.FIRST_TOUCH_NOTIFICATION_E2E_BASE_URL || 'http://127.0.0.1:3000'

const users = {
  reviewer: { staff_id: 10, full_name: 'Independent Manager', roles: ['Manager'] },
  submitter: { staff_id: 20, full_name: 'Evidence Submitter', roles: ['Staff'] },
}

let currentUser = users.reviewer
let phase = 'review'
let record = {
  companyId: 399,
  companyName: 'Notification Workflow Client',
  firstTouch: {
    id: 51,
    version: 1,
    status: 'contested',
    isCurrent: true,
    sourceGroup: 'Direct',
    sourceValue: 'Phone Call',
    channel: 'Phone',
    method: 'Incoming call',
    occurredAt: '2025-01-02',
    occurredTime: '09:00',
    occurrencePrecision: 'exact',
    occurrenceTimezone: 'Asia/Kuala_Lumpur',
    submittedByStaffId: 20,
    submittedBy: 'Evidence Submitter',
    submittedAt: '2026-08-11T09:00:00+08:00',
    amioshContact: 'Aminah',
    proofCount: 1,
    proofs: [],
    revisions: [],
  },
  claims: [],
  disputes: [],
  clarifications: [],
  conflict: {
    id: 91,
    status: 'open',
    openedAt: '2026-08-11T09:00:00+08:00',
    currentClaimId: 51,
    competingClaimIds: [52],
    disputeIds: [],
  },
  permissions: {
    canSubmitEvidence: true,
    canEditEvidence: false,
    canDisputeEvidence: false,
    canReviewConflict: true,
    canRespondToClarification: false,
  },
  contribution: { awarded: 0, invoiced: 0, collected: 0, grossProfit: 0, asOf: '2026-08-11' },
  projects: [],
  timeline: [],
}
record.claims = [
  record.firstTouch,
  {
    ...record.firstTouch,
    id: 52,
    status: 'competing',
    isCurrent: false,
    sourceValue: 'LinkedIn Chat',
    channel: 'LinkedIn',
    method: 'Direct message',
    occurredAt: '2025-01-01',
    submittedByStaffId: 30,
    submittedBy: 'Earlier Evidence User',
  },
]

const json = (route, payload, status = 200) =>
  route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(payload),
  })

const browser = await chromium.launch({ headless: true })
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } })
const page = await context.newPage()
const consoleErrors = []
const pageErrors = []
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text())
})
page.on('pageerror', (error) => pageErrors.push(error.stack || error.message))

await page.route('**/proxy/**', async (route) => {
  const request = route.request()
  const url = new URL(request.url())
  const path = url.pathname.replace(/^\/proxy\//, '')

  if (path === 'auth/session') {
    return json(route, { status: 'success', csrf_token: 'mock-token', user: currentUser })
  }
  if (path === 'notifications/summary') {
    const attention = phase === 'resolved' ? 0 : 1
    return json(route, {
      status: 'success',
      data: {
        total: attention,
        listable_total: attention,
        by_module: attention ? { 'client.first-touch': attention } : {},
        by_route_group: attention ? { '/client/first-touch': attention } : {},
        by_tab: attention ? { 'client.first-touch': attention } : {},
      },
    })
  }
  if (path === 'notifications/consume-entity') {
    return json(route, { status: 'success', data: { consumed_count: 1 } })
  }
  if (path === 'workflows/setup-status') {
    return json(route, { status: 'success', data: { total_missing: 0, templates: {} } })
  }
  if (path === 'client-first-touches/staff-options') {
    return json(route, { status: 'success', data: [] })
  }
  if (path === 'client-first-touches/399' && request.method() === 'GET') {
    return json(route, { status: 'success', data: record })
  }
  if (path === 'client-first-touch-conflicts/91/resolve' && request.method() === 'POST') {
    const body = JSON.parse(request.postData() || '{}')
    if (body.decision === 'clarification_requested') {
      phase = 'clarification'
      record = {
        ...record,
        permissions: {
          ...record.permissions,
          canReviewConflict: false,
          canRespondToClarification: true,
        },
        conflict: {
          ...record.conflict,
          status: 'clarification_requested',
          resolution: 'clarification_requested',
          comment: body.note,
          clarificationRecipient: 'Evidence Submitter',
          clarificationRecipientStaffId: 20,
        },
        clarifications: [
          {
            id: 71,
            conflictId: 91,
            requestedFromStaffId: 20,
            requestedFrom: 'Evidence Submitter',
            requestedByStaffId: 10,
            requestedBy: 'Independent Manager',
            requestNote: body.note,
            status: 'pending',
            proofs: [],
          },
        ],
      }
    } else {
      phase = 'resolved'
      record = {
        ...record,
        firstTouch: { ...record.firstTouch, status: 'current' },
        claims: record.claims.map((claim) => ({
          ...claim,
          status: claim.id === 51 ? 'current' : 'rejected',
          isCurrent: claim.id === 51,
        })),
        conflict: {
          ...record.conflict,
          status: 'resolved',
          resolution: body.decision,
          comment: body.note,
          resolvedBy: 'Independent Manager',
          resolvedAt: '2026-08-11T11:00:00+08:00',
        },
      }
    }
    return json(route, { status: 'success', data: record })
  }
  if (
    path === 'client-first-touch-conflicts/91/clarifications/71/respond' &&
    request.method() === 'POST'
  ) {
    phase = 'review'
    record = {
      ...record,
      permissions: {
        ...record.permissions,
        canReviewConflict: false,
        canRespondToClarification: false,
      },
      conflict: {
        ...record.conflict,
        status: 'open',
        resolution: null,
        clarificationRecipient: null,
        clarificationRecipientStaffId: null,
      },
      clarifications: record.clarifications.map((item) => ({
        ...item,
        status: 'responded',
        response: 'The screenshot timestamp confirms the encounter date.',
        respondedBy: 'Evidence Submitter',
        respondedAt: '2026-08-11T10:30:00+08:00',
        proofs: [
          {
            id: 801,
            originalName: 'clarification-timestamp.png',
            platform: 'Clarification evidence',
          },
        ],
      })),
    }
    return json(route, { status: 'success', data: record })
  }

  return json(route, { status: 'success', data: [] })
})

try {
  await page.goto(`${baseUrl}/client/first-touch/399?tab=claims&reviewConflict=91`, {
    waitUntil: 'domcontentloaded',
  })
  await page.getByText(/Resolve first-touch conflict/i).waitFor()
  await page.getByLabel('Request clarification').check()
  await page.locator('#first-touch-clarification-recipient').selectOption('20')
  await page
    .locator('#first-touch-resolution-note')
    .fill('Confirm the timestamp shown in the evidence.')
  await page.getByRole('button', { name: 'Review decision' }).click()
  await page.getByRole('button', { name: 'Confirm decision' }).click()
  await page.getByText(/Clarification requested from the selected evidence submitter/i).waitFor()

  currentUser = users.submitter
  await page.goto(`${baseUrl}/client/first-touch/399?tab=claims&clarification=71`, {
    waitUntil: 'domcontentloaded',
  })
  await page.getByRole('heading', { name: 'Provide first-touch clarification' }).waitFor()
  await page
    .locator('#first-touch-clarification-response')
    .fill('The screenshot timestamp confirms the encounter date.')
  await page.getByRole('button', { name: 'Submit clarification' }).click()
  await page.getByText(/independent reviewers have been notified/i).waitFor()

  currentUser = users.reviewer
  record = {
    ...record,
    permissions: {
      ...record.permissions,
      canReviewConflict: true,
      canRespondToClarification: false,
    },
  }
  await page.goto(`${baseUrl}/client/first-touch/399?tab=claims&reviewConflict=91`, {
    waitUntil: 'domcontentloaded',
  })
  await page.getByText(/Resolve first-touch conflict/i).waitFor()
  const reviewDialog = page.getByRole('dialog')
  await reviewDialog.getByText('Response from Evidence Submitter', { exact: true }).waitFor()
  const reviewText = await reviewDialog.innerText()
  if (!reviewText.includes('The screenshot timestamp confirms the encounter date.')) {
    throw new Error('Clarification response was not visible in the reviewer dossier.')
  }
  await page.getByLabel('Uphold current').check()
  await page.locator('#first-touch-resolution-note').fill('The current claim remains supported.')
  await page.getByRole('button', { name: 'Review decision' }).click()
  await page.getByRole('button', { name: 'Confirm decision' }).click()
  await page.getByText(/affected submitters notified/i).waitFor()

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${baseUrl}/client/first-touch/399?tab=claims`, {
    waitUntil: 'domcontentloaded',
  })
  await page.getByRole('heading', { name: /Claims and decision history/i }).waitFor()

  if (pageErrors.length || consoleErrors.length) {
    throw new Error([...pageErrors, ...consoleErrors].join(' | '))
  }

  console.log(
    JSON.stringify({ status: 'passed', lifecycle: ['review', 'clarify', 'respond', 'resolve'] }),
  )
} finally {
  await browser.close()
}
