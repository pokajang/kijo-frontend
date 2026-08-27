import { describe, expect, it, vi } from 'vitest'
import { getRecordActions } from './assessmentRecordsTableConfig'

describe('legal compliance assessment record actions', () => {
  const handlers = () => ({
    navigate: vi.fn(),
    onDelete: vi.fn(),
    onExportPdf: vi.fn(),
    onExportWord: vi.fn(),
    onCreateRevision: vi.fn(),
  })

  it('exposes the Word export action for submitted records', () => {
    const record = { id: 47, stage: 'submitted' }
    const actionHandlers = handlers()
    const actions = getRecordActions(record, actionHandlers)
    const wordAction = actions.find((action) => action.key === 'word')

    expect(wordAction).toMatchObject({ label: 'Export Report Word', hidden: false })
    wordAction.onClick()
    expect(actionHandlers.onExportWord).toHaveBeenCalledWith(record)
  })

  it('keeps the Word export action hidden until the record is submitted', () => {
    const actions = getRecordActions({ id: 47, stage: 'details_saved' }, handlers())

    expect(actions.find((action) => action.key === 'word')).toMatchObject({ hidden: true })
  })
})
