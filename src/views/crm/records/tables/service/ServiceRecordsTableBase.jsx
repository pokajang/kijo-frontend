import React from 'react'
import {
  CButton,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop, cilSwapVertical } from '@coreui/icons'
import {
  createRecordsHeaderCellBaseStyle,
  createStickyActionCellStyle,
  createStickyActionHeaderStyle,
  recordsDesktopBreakpoint,
} from '../../config/recordsTableUiShared'
import { SERVICE_TABLE_REQUIRED_COLUMNS } from '../../config/serviceTableUiConfig'
import { DataTableFooter, DataTableLoadingState } from '../../../../../components/datatable'
import { StatsStrip } from '../../../../../components/stats'
import { useTableViewportHeight } from '../../../../../hooks/datatable'
import ServiceRecordsFilterPanel from './ServiceRecordsFilterPanel'
import ServiceRecordsMobileList from './ServiceRecordsMobileList'

const ServiceRecordsTableBase = ({
  loading = false,
  searchInput,
  setSearchInput,
  statusFilter,
  setStatusFilter,
  createdByFilter,
  setCreatedByFilter,
  creatorOptions = [],
  yearFilter,
  setYearFilter,
  periodRange,
  setPeriodRange,
  yearOptions = [],
  showAdvancedFilters,
  setShowAdvancedFilters,
  resetFilters,
  followUpFilter,
  setFollowUpFilter,
  followUpRecency,
  setFollowUpRecency,
  quotationAge,
  setQuotationAge,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  activeFilterCount,
  activeChips = [],
  statsItems = [],
  statsScopeLabel = '',
  clearChip,
  handleExportCsv,
  sortedRecordsLength,
  isColumnVisible,
  toggleColumnVisibility,
  resetColumnVisibility,
  onView,
  onOpen,
  onGenerate,
  onFollowUp,
  onChangeToFail,
  onChangeToSuccess,
  onUnAward,
  onReAward,
  onEdit,
  onRevise,
  onNegotiate,
  onSyncClientDetails,
  onDelete,
  onEmail,
  onSharePdf,
  openActionDropdown,
  setOpenActionDropdown,
  truncateStyle,
  renderMobileSubjectExtra,
  renderMobileAmountSecondary,
  showLargeDatasetHint = false,
  filteredRecords = [],
  pageSizeOptions = [],
  pageSize,
  setPageSize,
  totalRows,
  pageStart,
  pageEnd,
  safeCurrentPage,
  totalPages,
  setCurrentPage,
  sortField,
  toggleSort,
  getAriaSort,
  columnWidths,
  renderRow,
}) => {
  const desktopBreakpoint = recordsDesktopBreakpoint
  const headerCellBaseStyle = createRecordsHeaderCellBaseStyle()
  const stickyActionHeaderStyle = createStickyActionHeaderStyle(columnWidths.action)
  const stickyActionCellStyle = createStickyActionCellStyle(columnWidths.action)
  const { tableViewportHeight, tableViewportRef, tableFooterRef } = useTableViewportHeight([
    showAdvancedFilters,
    searchInput,
    statusFilter,
    createdByFilter,
    yearFilter,
    periodRange,
    followUpFilter,
    followUpRecency,
    quotationAge,
    minAmount,
    maxAmount,
    filteredRecords.length,
    totalRows,
  ])

  const renderSortIcon = (field) => (
    <CIcon
      icon={
        sortField !== field
          ? cilSwapVertical
          : getAriaSort(field) === 'ascending'
            ? cilArrowTop
            : cilArrowBottom
      }
      className={`records-table-sort-icon ms-1 ${sortField !== field ? 'text-muted' : ''}`}
      size="sm"
    />
  )

  if (loading) {
    return <DataTableLoadingState />
  }

  return (
    <>
      <StatsStrip items={statsItems} scopeLabel={statsScopeLabel} />
      <ServiceRecordsFilterPanel
        searchInput={searchInput}
        setSearchInput={setSearchInput}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        createdByFilter={createdByFilter}
        setCreatedByFilter={setCreatedByFilter}
        yearFilter={yearFilter}
        setYearFilter={setYearFilter}
        periodRange={periodRange}
        setPeriodRange={setPeriodRange}
        followUpFilter={followUpFilter}
        setFollowUpFilter={setFollowUpFilter}
        followUpRecency={followUpRecency}
        setFollowUpRecency={setFollowUpRecency}
        quotationAge={quotationAge}
        setQuotationAge={setQuotationAge}
        minAmount={minAmount}
        setMinAmount={setMinAmount}
        maxAmount={maxAmount}
        setMaxAmount={setMaxAmount}
        showAdvancedFilters={showAdvancedFilters}
        setShowAdvancedFilters={setShowAdvancedFilters}
        activeFilterCount={activeFilterCount}
        creatorOptions={creatorOptions}
        yearOptions={yearOptions}
        activeChips={activeChips}
        clearChip={clearChip}
        resetFilters={resetFilters}
        handleExportCsv={handleExportCsv}
        sortedRecordsLength={sortedRecordsLength}
        isColumnVisible={isColumnVisible}
        toggleColumnVisibility={toggleColumnVisibility}
        resetColumnVisibility={resetColumnVisibility}
        requiredColumns={SERVICE_TABLE_REQUIRED_COLUMNS}
      />

      <div className="records-table-shell">
        <ServiceRecordsMobileList
          desktopBreakpoint={desktopBreakpoint}
          pageSize={pageSize}
          setPageSize={setPageSize}
          safeCurrentPage={safeCurrentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
          pagedRecords={filteredRecords}
          pageStart={pageStart}
          isColumnVisible={isColumnVisible}
          onView={onView}
          onEmail={onEmail}
          onSharePdf={onSharePdf}
          onOpen={onOpen}
          truncateStyle={truncateStyle}
          onGenerate={onGenerate}
          onFollowUp={onFollowUp}
          onChangeToFail={onChangeToFail}
          onChangeToSuccess={onChangeToSuccess}
          onUnAward={onUnAward}
          onReAward={onReAward}
          onEdit={onEdit}
          onRevise={onRevise}
          onNegotiate={onNegotiate}
          onSyncClientDetails={onSyncClientDetails}
          onDelete={onDelete}
          openActionDropdown={openActionDropdown}
          setOpenActionDropdown={setOpenActionDropdown}
          renderMobileSubjectExtra={renderMobileSubjectExtra}
          renderMobileAmountSecondary={renderMobileAmountSecondary}
        />
        <div
          className={`table-scroll-viewport d-none d-${desktopBreakpoint}-block`}
          ref={tableViewportRef}
          style={{
            maxHeight: tableViewportHeight ? `${tableViewportHeight}px` : 'none',
            overflowX: 'auto',
            overflowY: 'auto',
            borderTopLeftRadius: '0.5rem',
            borderTopRightRadius: '0.5rem',
          }}
        >
          {/* datatable-exempt: existing embedded/layout table */}
          <CTable className="align-middle mb-0 records-table-compact" hover>
            <CTableHead>
              <CTableRow>
                <CTableHeaderCell style={headerCellBaseStyle} className="text-center">
                  #
                </CTableHeaderCell>
                {isColumnVisible('quotationId') && (
                  <CTableHeaderCell
                    style={{ ...headerCellBaseStyle, minWidth: columnWidths.id }}
                    aria-sort={getAriaSort('quotationId')}
                  >
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-dark records-table-sort-btn"
                      onClick={() => toggleSort('quotationId')}
                    >
                      Quotation ID
                      {renderSortIcon('quotationId')}
                    </button>
                  </CTableHeaderCell>
                )}
                {isColumnVisible('client') && (
                  <CTableHeaderCell
                    style={{ ...headerCellBaseStyle, minWidth: columnWidths.client }}
                    aria-sort={getAriaSort('client')}
                  >
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-dark records-table-sort-btn"
                      onClick={() => toggleSort('client')}
                    >
                      Client
                      {renderSortIcon('client')}
                    </button>
                  </CTableHeaderCell>
                )}
                {isColumnVisible('email') && (
                  <CTableHeaderCell
                    style={{ ...headerCellBaseStyle, minWidth: columnWidths.email }}
                    aria-sort={getAriaSort('email')}
                  >
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-dark records-table-sort-btn"
                      onClick={() => toggleSort('email')}
                    >
                      Email
                      {renderSortIcon('email')}
                    </button>
                  </CTableHeaderCell>
                )}
                {isColumnVisible('status') && (
                  <CTableHeaderCell
                    style={{ ...headerCellBaseStyle, minWidth: columnWidths.status }}
                    className="text-center"
                    aria-sort={getAriaSort('status')}
                  >
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-dark text-center w-100 records-table-sort-btn"
                      onClick={() => toggleSort('status')}
                    >
                      Status
                      {renderSortIcon('status')}
                    </button>
                  </CTableHeaderCell>
                )}
                {isColumnVisible('subject') && (
                  <CTableHeaderCell
                    style={{ ...headerCellBaseStyle, minWidth: columnWidths.subject }}
                    aria-sort={getAriaSort('subject')}
                  >
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-dark records-table-sort-btn"
                      onClick={() => toggleSort('subject')}
                    >
                      Subject
                      {renderSortIcon('subject')}
                    </button>
                  </CTableHeaderCell>
                )}
                {isColumnVisible('amount') && (
                  <CTableHeaderCell
                    style={{ ...headerCellBaseStyle, minWidth: columnWidths.amount }}
                    className="text-center"
                    aria-sort={getAriaSort('amount')}
                  >
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-dark text-center w-100 records-table-sort-btn"
                      onClick={() => toggleSort('amount')}
                    >
                      Amount
                      {renderSortIcon('amount')}
                    </button>
                  </CTableHeaderCell>
                )}
                {isColumnVisible('created') && (
                  <CTableHeaderCell
                    style={{ ...headerCellBaseStyle, minWidth: columnWidths.created }}
                    className="text-center"
                    aria-sort={getAriaSort('created')}
                  >
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-dark text-center w-100 records-table-sort-btn"
                      onClick={() => toggleSort('created')}
                    >
                      Created
                      {renderSortIcon('created')}
                    </button>
                  </CTableHeaderCell>
                )}
                {isColumnVisible('age') && (
                  <CTableHeaderCell
                    style={{ ...headerCellBaseStyle, minWidth: columnWidths.age }}
                    className="text-center"
                    aria-sort={getAriaSort('age')}
                  >
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-dark text-center w-100 records-table-sort-btn"
                      onClick={() => toggleSort('age')}
                    >
                      Age
                      {renderSortIcon('age')}
                    </button>
                  </CTableHeaderCell>
                )}
                {isColumnVisible('pic') && (
                  <CTableHeaderCell
                    style={{ ...headerCellBaseStyle, minWidth: columnWidths.pic }}
                    aria-sort={getAriaSort('pic')}
                  >
                    <button
                      type="button"
                      className="btn btn-link p-0 text-decoration-none text-dark records-table-sort-btn"
                      onClick={() => toggleSort('pic')}
                    >
                      PIC
                      {renderSortIcon('pic')}
                    </button>
                  </CTableHeaderCell>
                )}
                {isColumnVisible('remarks') && (
                  <CTableHeaderCell
                    style={{ ...headerCellBaseStyle, minWidth: columnWidths.remarks }}
                  >
                    Remarks
                  </CTableHeaderCell>
                )}
                <CTableHeaderCell style={stickyActionHeaderStyle} aria-label="Row actions">
                  <span className="visually-hidden">Actions</span>
                </CTableHeaderCell>
              </CTableRow>
            </CTableHead>
            <CTableBody>
              {filteredRecords.length === 0 ? (
                <CTableRow>
                  <CTableDataCell
                    colSpan={
                      1 +
                      [
                        'quotationId',
                        'client',
                        'email',
                        'status',
                        'subject',
                        'amount',
                        'created',
                        'age',
                        'pic',
                        'remarks',
                      ].filter((key) => isColumnVisible(key)).length +
                      1
                    }
                    className="text-center text-muted"
                  >
                    No records to display.
                  </CTableDataCell>
                </CTableRow>
              ) : (
                filteredRecords.map((record, index) =>
                  renderRow(record, index, {
                    desktopBreakpoint,
                    stickyActionCellStyle,
                    isColumnVisible,
                  }),
                )
              )}
            </CTableBody>
          </CTable>
        </div>
        <DataTableFooter
          desktopBreakpoint={desktopBreakpoint}
          tableFooterRef={tableFooterRef}
          pageSizeOptions={pageSizeOptions}
          showLargeDatasetHint={showLargeDatasetHint}
          recordsLength={totalRows}
          showScrollTip
          pageSize={pageSize}
          setPageSize={setPageSize}
          totalRows={totalRows}
          pageStart={pageStart}
          pageEnd={pageEnd}
          safeCurrentPage={safeCurrentPage}
          totalPages={totalPages}
          setCurrentPage={setCurrentPage}
        />
      </div>
    </>
  )
}

export default ServiceRecordsTableBase
