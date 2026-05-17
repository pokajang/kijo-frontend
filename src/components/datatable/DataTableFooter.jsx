import React from 'react'
import { CButton, CCol, CFormSelect, CPopover, CRow } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCaretLeft, cilCaretRight, cilInfo } from '@coreui/icons'

const DEFAULT_PAGE_SIZE_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50]

const DataTableFooter = ({
  desktopBreakpoint = 'lg',
  tableFooterRef,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  showLargeDatasetHint = false,
  recordsLength = 0,
  showScrollTip = true,
  pageSize,
  setPageSize,
  totalRows,
  pageStart,
  pageEnd,
  safeCurrentPage,
  totalPages,
  setCurrentPage,
}) => {
  const displayPageStart = totalRows === 0 ? 0 : pageStart + 1

  const pagerControls = (
    <>
      <CButton
        size="sm"
        color="primary"
        variant="ghost"
        className="data-table-mobile-pager-btn records-mobile-top-pager-btn records-mobile-top-pager-btn--plain"
        aria-label="Previous page"
        disabled={safeCurrentPage <= 1}
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
      >
        <CIcon icon={cilCaretLeft} />
      </CButton>
      <small className="text-muted">
        Page {safeCurrentPage}/{totalPages}
      </small>
      <CButton
        size="sm"
        color="primary"
        variant="ghost"
        className="data-table-mobile-pager-btn records-mobile-top-pager-btn records-mobile-top-pager-btn--plain"
        aria-label="Next page"
        disabled={safeCurrentPage >= totalPages}
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
      >
        <CIcon icon={cilCaretRight} />
      </CButton>
    </>
  )

  return (
    <div ref={tableFooterRef} className="data-table-footer records-table-footer">
      {showLargeDatasetHint && (
        <div className={`small text-muted mb-2 d-none d-${desktopBreakpoint}-block`}>
          Large dataset detected ({recordsLength} rows). For best performance, narrow filters before
          broad sorts/exports.
        </div>
      )}

      <CRow className={`g-2 align-items-center d-none d-${desktopBreakpoint}-flex`}>
        <CCol xs={12} md={4} className="d-flex align-items-center gap-2">
          <small className="text-muted">Rows</small>
          <CFormSelect
            size="sm"
            aria-label="Rows per page"
            className="data-table-rows-select records-mobile-rows-select"
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </CFormSelect>
          {showScrollTip && (
            <CPopover
              trigger="focus"
              placement="top"
              content={
                <span>
                  Hold <kbd className="data-table-scroll-tip-kbd records-scroll-tip-kbd">Shift</kbd>{' '}
                  while scrolling to move the table horizontally.
                </span>
              }
            >
              <CButton
                type="button"
                size="sm"
                color="secondary"
                variant="ghost"
                className="data-table-scroll-tip-btn records-scroll-tip-btn"
                aria-label="Horizontal scroll tip"
              >
                <CIcon icon={cilInfo} size="sm" />
              </CButton>
            </CPopover>
          )}
        </CCol>
        <CCol xs={12} md={4} className="d-flex justify-content-md-center">
          <small className="text-muted">
            Showing {displayPageStart}-{pageEnd} of {totalRows}
          </small>
        </CCol>
        <CCol xs={12} md={4} className="d-flex justify-content-md-end align-items-center gap-2">
          {pagerControls}
        </CCol>
      </CRow>

      <div className={`d-${desktopBreakpoint}-none data-table-mobile-footer records-mobile-footer`}>
        <div className="data-table-mobile-footer-inline records-mobile-footer-inline">
          <div className="d-flex align-items-center gap-1">
            <small className="text-muted">Rows</small>
            <CFormSelect
              size="sm"
              aria-label="Rows per page"
              className="data-table-rows-select records-mobile-rows-select"
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </CFormSelect>
          </div>
          <div className="data-table-mobile-footer-bottom records-mobile-footer-bottom">
            {pagerControls}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DataTableFooter
export { DEFAULT_PAGE_SIZE_OPTIONS }
