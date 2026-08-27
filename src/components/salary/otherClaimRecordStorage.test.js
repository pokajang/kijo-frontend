import { beforeEach, describe, expect, it, vi } from 'vitest'

const apiMock = vi.hoisted(() => ({
  apiJson: vi.fn(),
}))

vi.mock('../../api/apiClient', () => ({
  apiFetch: vi.fn(),
  apiJson: apiMock.apiJson,
}))

vi.mock('../../notifications/appNotificationEvents', () => ({
  dispatchAppNotificationsChanged: vi.fn(),
}))

import {
  archiveOtherClaimRecord,
  deleteOtherClaimRecord,
  getOtherClaimRecords,
  normalizeOtherClaimRecord,
  saveOtherClaimDraft,
  withdrawOtherClaimRecord,
} from './otherClaimRecordStorage'

describe('saveOtherClaimDraft', () => {
  beforeEach(() => {
    apiMock.apiJson.mockReset()
    apiMock.apiJson.mockResolvedValue({
      record: {
        id: 42,
        claimMonthValue: '2026-07',
        status: 'Draft',
        claims: [],
      },
    })
  })

  it('uses multipart POST method override and excludes embedded attachment binary from JSON', async () => {
    const file = new File(['receipt'], 'receipt.pdf', { type: 'application/pdf' })
    const attachment = {
      clientId: 'receipt-1',
      name: 'receipt.pdf',
      type: 'application/pdf',
      size: file.size,
      file,
      dataUrl: 'data:application/pdf;base64,cmVjZWlwdA==',
    }
    const persistedAttachment = {
      id: 99,
      clientId: 'stored-receipt',
      name: 'stored.pdf',
      url: '/files/stored',
      dataUrl: 'data:application/pdf;base64,c3RvcmVk',
    }

    await saveOtherClaimDraft({
      applicationId: 42,
      recordVersion: 3,
      claimMonthValue: '2026-07',
      claims: [
        {
          id: 'expense-1',
          type: 'Expense',
          date: '2026-07-20',
          description: 'Parking',
          amount: 12,
          attachments: [attachment],
        },
      ],
      draftPayload: {
        formData: { claimMonth: '2026-07', expenseAttachment: attachment },
        expenseItems: [{ id: 'expense-1', attachments: [attachment] }],
        allowanceItems: [{ id: 'allowance-1', attachments: [persistedAttachment] }],
      },
    })

    expect(apiMock.apiJson).toHaveBeenCalledTimes(1)
    const [, options] = apiMock.apiJson.mock.calls[0]
    expect(options.method).toBe('POST')
    expect(options.body).toBeInstanceOf(FormData)
    expect(options.body.get('_method')).toBe('PUT')
    expect(options.body.get('application_id')).toBe('42')
    expect(options.body.get('record_version')).toBe('3')
    expect(options.body.get('claim_month')).toBe('2026-07')

    const storedDraft = JSON.parse(options.body.get('draft_payload'))
    expect(storedDraft.formData.expenseAttachment).toBeNull()
    expect(storedDraft.expenseItems[0].attachments).toEqual([])
    expect(storedDraft.allowanceItems[0].attachments[0]).toMatchObject({
      id: 99,
      name: 'stored.pdf',
      url: '/files/stored',
    })
    expect(storedDraft.allowanceItems[0].attachments[0].dataUrl).toBeUndefined()
    expect(options.body.get('attachments[expense-1][receipt-1]')).toBeInstanceOf(File)
  })

  it('uses one stable client id for legacy single-attachment metadata and multipart uploads', async () => {
    const file = new File(['allowance receipt'], 'allowance.pdf', { type: 'application/pdf' })
    const attachment = {
      name: 'allowance.pdf',
      type: 'application/pdf',
      size: file.size,
      file,
    }

    await saveOtherClaimDraft({
      claimMonthValue: '2026-07',
      claims: [
        {
          id: 'allowance-1',
          type: 'Allowance',
          date: '2026-07-20',
          description: 'Meal allowance',
          amount: 12,
          attachment,
        },
      ],
      draftPayload: {},
    })

    const [, options] = apiMock.apiJson.mock.calls[0]
    const claims = JSON.parse(options.body.get('claims'))
    const clientId = claims[0].attachments[0].clientId

    expect(clientId).toBe('allowance.pdf')
    expect(options.body.get(`attachments[allowance-1][${clientId}]`)).toBeInstanceOf(File)
  })
})

describe('normalizeOtherClaimRecord', () => {
  it('preserves a redacted financial worklist row without converting values to zero', () => {
    expect(
      normalizeOtherClaimRecord({
        id: 42,
        status: 'Submitted',
        canViewFinancialDetails: false,
        financialDetailsRestricted: true,
        claimsTotal: null,
      }),
    ).toMatchObject({
      canViewFinancialDetails: false,
      financialDetailsRestricted: true,
      claimsTotal: null,
    })
  })

  it('keeps archive state needed for the withdrawn-claim lifecycle', () => {
    expect(
      normalizeOtherClaimRecord({
        id: 42,
        status: 'Cancelled',
        archivedAt: '2026-08-20T11:20:00Z',
        archivedBy: 10,
        archiveReason: 'No longer needed.',
        canRestoreArchived: true,
      }),
    ).toMatchObject({
      status: 'Cancelled',
      archivedAt: '2026-08-20T11:20:00Z',
      archivedBy: 10,
      archiveReason: 'No longer needed.',
      canRestoreArchived: true,
    })
  })

  it('keeps audit events and their previous claim snapshot for the detail timeline', () => {
    expect(
      normalizeOtherClaimRecord({
        id: 42,
        auditEvents: [
          {
            id: 8,
            action: 'edit',
            reason: 'Claim edited and resubmitted before review.',
            previousSnapshot: {
              claimsTotal: 120,
              claims: [{ id: 'mileage-1' }],
            },
            actedAt: '2026-08-20T11:20:00Z',
            actorName: 'Aina',
          },
        ],
      }),
    ).toMatchObject({
      auditEvents: [
        {
          id: 8,
          action: 'edit',
          previousSnapshot: { claimsTotal: 120, claims: [{ id: 'mileage-1' }] },
          actorName: 'Aina',
        },
      ],
    })
  })
})

describe('archived other-claim records', () => {
  beforeEach(() => {
    apiMock.apiJson.mockReset()
  })

  it('requests the archived scope and posts archive actions with optimistic versioning', async () => {
    apiMock.apiJson
      .mockResolvedValueOnce({ records: [] })
      .mockResolvedValueOnce({ status: 'success' })

    await getOtherClaimRecords('archived')
    await archiveOtherClaimRecord(42, 'No longer needed.', 3)

    expect(apiMock.apiJson).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('hr/salary/other-claims?scope=archived'),
    )
    expect(apiMock.apiJson).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('hr/salary/other-claims/42/archive'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(JSON.parse(apiMock.apiJson.mock.calls[1][1].body)).toEqual({
      reason: 'No longer needed.',
      record_version: 3,
    })
  })
})

describe('withdraw and hard-delete other claims', () => {
  beforeEach(() => {
    apiMock.apiJson.mockReset()
    apiMock.apiJson.mockResolvedValue({ status: 'success' })
  })

  it('uses an explicit withdrawal endpoint instead of DELETE', async () => {
    await withdrawOtherClaimRecord(42, 'Submitted by mistake.', 3)

    expect(apiMock.apiJson).toHaveBeenCalledWith(
      expect.stringContaining('hr/salary/other-claims/42/withdraw'),
      expect.objectContaining({ method: 'POST' }),
    )
    expect(JSON.parse(apiMock.apiJson.mock.calls[0][1].body)).toEqual({
      reason: 'Submitted by mistake.',
      record_version: 3,
    })
  })

  it('uses DELETE only for permanent removal and sends the required confirmation', async () => {
    await deleteOtherClaimRecord(42, 3)

    expect(apiMock.apiJson).toHaveBeenCalledWith(
      expect.stringContaining('hr/salary/other-claims/42'),
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(JSON.parse(apiMock.apiJson.mock.calls[0][1].body)).toEqual({
      confirmation: 'DELETE',
      record_version: 3,
    })
  })
})
