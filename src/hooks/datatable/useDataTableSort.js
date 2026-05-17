import { useMemo, useState } from 'react'

const compareNullish = (a, b) => {
  if (a === b) return 0
  if (a === null || typeof a === 'undefined') return 1
  if (b === null || typeof b === 'undefined') return -1
  return null
}

const compareNumbers = (a, b) => {
  const nullish = compareNullish(a, b)
  if (nullish !== null) return nullish

  const aNumber = Number(a)
  const bNumber = Number(b)
  if (!Number.isFinite(aNumber) && !Number.isFinite(bNumber)) return 0
  if (!Number.isFinite(aNumber)) return 1
  if (!Number.isFinite(bNumber)) return -1
  return aNumber - bNumber
}

const compareDates = (a, b) => {
  const nullish = compareNullish(a, b)
  if (nullish !== null) return nullish

  const aTime = Date.parse(a)
  const bTime = Date.parse(b)
  if (!Number.isFinite(aTime) && !Number.isFinite(bTime)) return 0
  if (!Number.isFinite(aTime)) return 1
  if (!Number.isFinite(bTime)) return -1
  return aTime - bTime
}

const compareBooleans = (a, b) => {
  const nullish = compareNullish(a, b)
  if (nullish !== null) return nullish
  return Number(Boolean(a)) - Number(Boolean(b))
}

const compareStrings = (a, b) => {
  const nullish = compareNullish(a, b)
  if (nullish !== null) return nullish

  if (typeof a === 'number' && typeof b === 'number') return a - b

  return String(a).localeCompare(String(b), undefined, {
    numeric: true,
    sensitivity: 'base',
  })
}

const compareValues = (a, b, sortType = 'string') => {
  if (sortType === 'number') return compareNumbers(a, b)
  if (sortType === 'date') return compareDates(a, b)
  if (sortType === 'boolean') return compareBooleans(a, b)
  return compareStrings(a, b)
}

export const useDataTableSort = ({
  rows = [],
  initialSortField,
  initialSortDir = 'asc',
  getSortValue,
  sortTypes = {},
  sortComparators = {},
  initialSortDirByField = {},
} = {}) => {
  const [sortField, setSortField] = useState(initialSortField)
  const [sortDir, setSortDir] = useState(initialSortDir)

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortField(field)
    setSortDir(initialSortDirByField[field] || 'asc')
  }

  const sortedRows = useMemo(() => {
    if (!sortField) return rows

    return [...rows].sort((left, right) => {
      const leftValue = getSortValue ? getSortValue(left, sortField) : left?.[sortField]
      const rightValue = getSortValue ? getSortValue(right, sortField) : right?.[sortField]
      const customComparator = sortComparators[sortField]
      const result =
        typeof customComparator === 'function'
          ? customComparator(leftValue, rightValue, left, right)
          : compareValues(leftValue, rightValue, sortTypes[sortField])
      return sortDir === 'desc' ? -result : result
    })
  }, [getSortValue, rows, sortComparators, sortDir, sortField, sortTypes])

  return {
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    toggleSort,
    sortedRows,
  }
}

export default useDataTableSort
export { compareValues }
