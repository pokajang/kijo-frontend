import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import dialog from '../../../../components/dialog/dialogService'
import { fetchJsonCompat } from './compatApi'
import { createHandlers } from './recordsActions'

vi.mock('../../../../components/dialog/dialogService', () => ({
  default: {
    alert: vi.fn(),
    confirm: vi.fn(),
  },
}))

vi.mock('./compatApi', () => ({
  fetchJsonCompat: vi.fn(),
  getMessage: (result, fallback) => result?.message || fallback,
  isSuccess: (result) => result?.success === true,
}))

const modalBindings = {
  setShowFailModal: vi.fn(),
  setShowSuccessModal: vi.fn(),
  setSelectedRecordIdForFail: vi.fn(),
  setSelectedRecordIdForSuccess: vi.fn(),
  setFailureReason: vi.fn(),
  setSuccessReason: vi.fn(),
  setAwardDate: vi.fn(),
  setDescription: vi.fn(),
  setClientLoaRefNo: vi.fn(),
}

const createDeleteHarness = ({
  refreshAfterLocalDelete = false,
  serviceKey = 'training-tab',
  onLegacyPdfPrompt = vi.fn(),
  onApprovalStateChanged = vi.fn(),
  onOpenPdfPreview = vi.fn(),
} = {}) => {
  let quotes = [
    { id: 1, serviceTab: serviceKey },
    { id: 2, serviceTab: serviceKey },
  ]
  const fetchQuotes = vi.fn()
  const onActionSuccess = vi.fn()
  const navigate = vi.fn()
  const setQuotes = vi.fn((updater) => {
    quotes = typeof updater === 'function' ? updater(quotes) : updater
  })

  const handlers = createHandlers({
    serviceKey,
    fetchQuotes,
    setQuotes,
    navigate,
    onActionSuccess,
    onLegacyPdfPrompt,
    onApprovalStateChanged,
    onOpenPdfPreview,
    refreshAfterLocalDelete,
    ...modalBindings,
  })

  return {
    getQuotes: () => quotes,
    fetchQuotes,
    handlers,
    onActionSuccess,
    onLegacyPdfPrompt,
    navigate,
    onApprovalStateChanged,
    onOpenPdfPreview,
    setQuotes,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  dialog.confirm.mockResolvedValue(true)
  fetchJsonCompat.mockResolvedValue({ success: true })
  vi.stubGlobal('fetch', vi.fn())
  window.sessionStorage.clear()
  Object.defineProperty(URL, 'createObjectURL', {
    configurable: true,
    value: vi.fn(() => 'blob:quotation-pdf'),
  })
  Object.defineProperty(URL, 'revokeObjectURL', {
    configurable: true,
    value: vi.fn(),
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('recordsActions delete refresh behavior', () => {
  it('refreshes the table after a successful list delete', async () => {
    const { fetchQuotes, getQuotes, handlers, onActionSuccess, setQuotes } = createDeleteHarness({
      refreshAfterLocalDelete: true,
    })

    await handlers.handleDelete(1)

    expect(setQuotes).toHaveBeenCalledTimes(1)
    expect(getQuotes()).toEqual([{ id: 2, serviceTab: 'training-tab' }])
    expect(fetchQuotes).toHaveBeenCalledTimes(1)
    expect(onActionSuccess).toHaveBeenCalledWith({
      type: 'delete',
      message: 'Quotation record deleted.',
    })
  })

  it('allows detail delete contexts to skip table refresh after navigation', async () => {
    const { fetchQuotes, handlers } = createDeleteHarness({
      refreshAfterLocalDelete: false,
    })

    await handlers.handleDelete(1)

    expect(fetchQuotes).not.toHaveBeenCalled()
  })
})

describe('recordsActions PDF opening', () => {
  it.each([
    ['training-tab', 'training'],
    ['ih-tab', 'ih'],
    ['equipment-tab', 'equipment'],
    ['manpower-tab', 'manpower'],
    ['special-tab', 'special'],
  ])('opens the %s PDF in the application preview', async (serviceKey, serviceRoute) => {
    const { handlers, onOpenPdfPreview, onApprovalStateChanged } = createDeleteHarness({
      serviceKey,
    })
    await handlers.handleGeneratePdf({ id: 68 })

    expect(onOpenPdfPreview).toHaveBeenCalledWith(
      expect.objectContaining({
        record: expect.objectContaining({ id: 68 }),
        serviceKey,
        url: expect.stringContaining(`quote-records/${serviceRoute}/68/pdf`),
        onApprovalStateChanged,
      }),
    )
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not depend on browser popup permission', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const { handlers, onOpenPdfPreview } = createDeleteHarness()
    await handlers.handleGeneratePdf({ id: 68 })

    expect(onOpenPdfPreview).toHaveBeenCalledTimes(1)
    expect(dialog.alert).not.toHaveBeenCalled()
  })

  it.each([
    ['training-tab', 'traffic-light-training-202608-v2'],
    ['equipment-tab', 'traffic-light-equipment-202608-v2'],
    ['manpower-tab', 'traffic-light-manpower-202608-v2'],
  ])(
    'prompts before generating a grandfathered %s PDF and remembers a successful choice',
    async (serviceTab, ruleVersion) => {
      const onLegacyPdfPrompt = vi.fn()
      const onOpenPdfPreview = vi.fn()
      const { handlers } = createDeleteHarness({
        serviceKey: serviceTab,
        onLegacyPdfPrompt,
        onOpenPdfPreview,
      })
      const record = {
        id: 154,
        revisionNo: 0,
        serviceTab,
        issuanceContext: {
          is_grandfathered: true,
          requires_approval: false,
          rule_version: ruleVersion,
        },
      }

      await handlers.handleGeneratePdf(record)

      expect(onLegacyPdfPrompt).toHaveBeenCalledTimes(1)

      onLegacyPdfPrompt.mock.calls[0][0].onGenerate()
      expect(onOpenPdfPreview).toHaveBeenCalledTimes(1)
      const acknowledgementKey = `legacy-cost-pdf:${serviceTab}:154:0:${ruleVersion}`
      expect(window.sessionStorage.getItem(acknowledgementKey)).toBeNull()

      onOpenPdfPreview.mock.calls[0][0].onLoadSuccess()
      expect(window.sessionStorage.getItem(acknowledgementKey)).toBe('1')

      await handlers.handleGeneratePdf(record)
      expect(onLegacyPdfPrompt).toHaveBeenCalledTimes(1)
      expect(onOpenPdfPreview).toHaveBeenCalledTimes(2)
    },
  )

  it('never offers legacy generation while a Training approval trigger is unresolved', async () => {
    const onLegacyPdfPrompt = vi.fn()
    const onOpenPdfPreview = vi.fn()
    const { handlers } = createDeleteHarness({ onLegacyPdfPrompt, onOpenPdfPreview })

    await handlers.handleGeneratePdf({
      id: 157,
      serviceTab: 'training-tab',
      issuanceContext: {
        is_grandfathered: true,
        requires_approval: true,
        required_step: 'bd',
        reasons: ['Special training or special-client pricing requires BD final approval.'],
      },
    })

    expect(onLegacyPdfPrompt).not.toHaveBeenCalled()
    expect(onOpenPdfPreview).not.toHaveBeenCalled()
    expect(dialog.alert).toHaveBeenCalledWith(expect.stringContaining('Special training'))
  })

  it.each(['equipment-tab', 'ih-tab'])(
    'guides an invalid current-policy %s quote to Edit without offering generation',
    async (serviceKey) => {
      const onLegacyPdfPrompt = vi.fn()
      const onOpenPdfPreview = vi.fn()
      const { handlers } = createDeleteHarness({
        serviceKey,
        onLegacyPdfPrompt,
        onOpenPdfPreview,
      })

      await handlers.handleGeneratePdf({
        id: 201,
        serviceTab: serviceKey,
        issuanceContext: { estimated_cost_required: true },
      })

      expect(onLegacyPdfPrompt).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'cost-required',
          record: expect.objectContaining({ id: 201 }),
          onEdit: expect.any(Function),
        }),
      )
      expect(onLegacyPdfPrompt.mock.calls[0][0].onGenerate).toBeUndefined()
      expect(onOpenPdfPreview).not.toHaveBeenCalled()
    },
  )
})

describe('recordsActions un-award safeguards', () => {
  it.each([
    ['training-tab', 'training'],
    ['ih-tab', 'ih'],
    ['equipment-tab', 'equipment'],
    ['manpower-tab', 'manpower'],
    ['special-tab', 'special'],
  ])('blocks %s un-award and links its Supplier PO', async (serviceKey, serviceRoute) => {
    const { handlers } = createDeleteHarness({ serviceKey })
    dialog.confirm.mockResolvedValue(false)
    fetchJsonCompat.mockResolvedValueOnce({
      success: true,
      data: {
        projects: [{ id: 501, project_name: 'Awarded Project' }],
        supplier_pos: [
          {
            po_id: 77,
            po_ref_no: 'POES26-0077AZA',
            supplier_name: 'Lab Supplier',
          },
        ],
      },
    })

    await handlers.handleUnAward(68)

    expect(fetchJsonCompat).toHaveBeenCalledWith(
      expect.stringContaining(`quote-records/${serviceRoute}/68/related-docs`),
      expect.objectContaining({ method: 'GET' }),
    )
    expect(dialog.confirm).toHaveBeenCalledWith(
      expect.stringContaining('cannot be un-awarded'),
      expect.objectContaining({
        confirmDisabled: true,
        relatedRecords: {
          groups: expect.arrayContaining([
            expect.objectContaining({
              key: 'supplier-pos',
              items: [
                expect.objectContaining({
                  label: 'POES26-0077AZA',
                  href: '/commercial/supplier-po/77',
                }),
              ],
            }),
          ]),
        },
      }),
    )
    expect(fetchJsonCompat).toHaveBeenCalledTimes(1)
  })
})
