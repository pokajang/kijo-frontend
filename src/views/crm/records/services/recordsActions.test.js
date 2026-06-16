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

const createDeleteHarness = ({ refreshAfterLocalDelete = false } = {}) => {
  let quotes = [
    { id: 1, serviceTab: 'training-tab' },
    { id: 2, serviceTab: 'training-tab' },
  ]
  const fetchQuotes = vi.fn()
  const onActionSuccess = vi.fn()
  const setQuotes = vi.fn((updater) => {
    quotes = typeof updater === 'function' ? updater(quotes) : updater
  })

  const handlers = createHandlers({
    serviceKey: 'training-tab',
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
