import { useEffect, useMemo, useState } from 'react'
import { getInitialPageSize } from '../../utils/datatable/tableFormatters'

export const useDataTablePagination = ({ rows = [], initialPageSize, resetDeps = [] } = {}) => {
  const [pageSize, setPageSize] = useState(initialPageSize || getInitialPageSize)
  const [currentPage, setCurrentPage] = useState(1)

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
    setCurrentPage(1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps)

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
