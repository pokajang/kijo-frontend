import { FIRST_TOUCH_RECORDS, createUnknownFirstTouchRecord } from './clientFirstTouchMockData'

const storageKey = 'client.first-touch.ui-prototype.v2'

const readOverrides = () => {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(window.sessionStorage.getItem(storageKey) || '{}')
  } catch {
    return {}
  }
}

const writeOverrides = (overrides) => {
  if (typeof window === 'undefined') return
  window.sessionStorage.setItem(storageKey, JSON.stringify(overrides))
}

const mergeOverride = (record, override) => ({
  ...record,
  ...override,
  firstTouch:
    override && Object.prototype.hasOwnProperty.call(override, 'firstTouch')
      ? override.firstTouch
      : record.firstTouch,
})

export const getMockFirstTouchRecords = () => {
  const overrides = readOverrides()
  return FIRST_TOUCH_RECORDS.map((record) => mergeOverride(record, overrides[record.companyId]))
}

export const getMockFirstTouchRecord = (companyId) => {
  const numericId = Number(companyId)
  const record =
    FIRST_TOUCH_RECORDS.find((item) => item.companyId === numericId) ||
    createUnknownFirstTouchRecord(companyId)
  return mergeOverride(record, readOverrides()[numericId])
}

export const setMockFirstTouchRecord = (companyId, record) => {
  const overrides = readOverrides()
  overrides[companyId] = record
  writeOverrides(overrides)
}
