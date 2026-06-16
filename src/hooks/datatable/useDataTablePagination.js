import { useEffect, useMemo, useRef, useState } from 'react'
import { getInitialPageSize } from '../../utils/datatable/tableFormatters'

const normalizeResetDep = (value) => {
  if (Array.isArray(value) || typeof value === 'function') return undefined
  if (value instanceof Date) return value.toISOString()
  if (value && typeof value === 'object') {
    try {
      return JSON.stringify(
        Object.keys(value)
          .sort()
          .reduce((acc, key) => {
            acc[key] = value[key]
            return acc
          }, {}),
      )
    } catch {
      return undefined
    }
  }
  return value
}

export const useDataTablePagination = ({ rows = [], initialPageSize, resetDeps = [] } = {}) => {
  const didMountResetRef = useRef(false)
  const [pageSize, setPageSize] = useState(initialPageSize || getInitialPageSize)
  const [currentPage, setCurrentPage] = useState(1)
  const resetSignature = resetDeps.map(normalizeResetDep).join('|')

  const totalRows = rows.length
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize))
  const safeCurrentPage = Math.min(currentPage, totalPages)
  const pageStart = totalRows === 0 ? 0 : (safeCurrentPage - 1) * pageSize
  const pageEnd = Math.min(pageStart + pageSize, totalRows)

  const pagedRows = useMemo(() => rows.slice(pageStart, pageEnd), [pageEnd, pageStart, rows])

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages)
  }, [currentPage, totalPages])

  useEffect(() => {
    if (!didMountResetRef.current) {
      didMountResetRef.current = true
      return
    }
    setCurrentPage(1)
  }, [resetSignature])

  return {
    pageSize,
    setPageSize: (value) => {
      setPageSize(value)
      setCurrentPage(1)
    },
    currentPage,
    setCurrentPage,
    totalRows,
    totalPages,
    safeCurrentPage,
    pageStart,
    pageEnd,
    pagedRows,
  }
}

export default useDataTablePagination
