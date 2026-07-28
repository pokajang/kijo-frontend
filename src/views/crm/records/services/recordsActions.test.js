import { beforeEach, describe, expect, it, vi } from 'vitest'
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
} = {}) => {
  let quotes = [
    { id: 1, serviceTab: serviceKey },
    { id: 2, serviceTab: serviceKey },
  ]
  const fetchQuotes = vi.fn()
  const onActionSuccess = vi.fn()
  const setQuotes = vi.fn((updater) => {
    quotes = typeof updater === 'function' ? updater(quotes) : updater
  })

  const handlers = createHandlers({
    serviceKey,
    fetchQuotes,
    setQuotes,
    navigate: vi.fn(),
    onActionSuccess,
    refreshAfterLocalDelete,
    ...modalBindings,
  })

  return {
    getQuotes: () => quotes,
    fetchQuotes,
    handlers,
    onActionSuccess,
    setQuotes,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  dialog.confirm.mockResolvedValue(true)
  fetchJsonCompat.mockResolvedValue({ success: true })
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
  ])(
    'opens the %s endpoint directly so the response filename is preserved',
    async (serviceKey, serviceRoute) => {
      const popup = {
        close: vi.fn(),
        location: { replace: vi.fn() },
      }
      vi.spyOn(window, 'open').mockReturnValue(popup)

      const { handlers } = createDeleteHarness({ serviceKey })
      await handlers.handleGeneratePdf({ id: 68 })

      expect(window.open).toHaveBeenCalledWith('about:blank', '_blank')
      expect(popup.opener).toBeNull()
      expect(popup.close).not.toHaveBeenCalled()
      expect(popup.location.replace).toHaveBeenCalledWith(
        expect.stringContaining(`quote-records/${serviceRoute}/68/pdf`),
      )
    },
  )

  it('explains how to continue when the PDF popup is blocked', async () => {
    vi.spyOn(window, 'open').mockReturnValue(null)

    const { handlers } = createDeleteHarness()
    await handlers.handleGeneratePdf({ id: 68 })

    expect(dialog.alert).toHaveBeenCalledWith(
      'The PDF window was blocked by the browser. Allow pop-ups for this site, then retry.',
    )
  })
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
