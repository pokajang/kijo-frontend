import React from 'react'
import { CBadge, CButton, CFormSelect, CTooltip } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilCaretLeft, cilCaretRight } from '@coreui/icons'
import { PAGE_SIZE_OPTIONS } from '../../config/allRecordsTableConfig'
import { getProjectOutcomeLabel, truncateFront } from '../../utils/allRecordsTableUtils'
import RecordActionMenu from '../shared/RecordActionMenu'
import { actionMenuPopperConfig } from '../shared/actionMenuPopperConfig'

const ServiceRecordsMobileList = ({
  desktopBreakpoint,
  pageSize,
  setPageSize,
  safeCurrentPage,
  totalPages,
  setCurrentPage,
  pagedRecords,
  pageStart,
  isColumnVisible = () => true,
  onView,
  onOpen,
  truncateStyle,
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
  renderMobileSubjectExtra,
  renderMobileAmountSecondary,
}) => {
  return (
    <div className={`d-${desktopBreakpoint}-none records-mobile-wrap`}>
      <div className="records-mobile-top-pager">
        <div className="d-flex align-items-center gap-1">
          <small className="text-muted">Rows</small>
          <CFormSelect
            size="sm"
            className="records-mobile-rows-select"
            value={String(pageSize)}
            onChange={(e) => setPageSize(Number(e.target.value))}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </CFormSelect>
        </div>
        <div className="d-flex align-items-center gap-1">
          <CButton
            size="sm"
            color="primary"
            variant="ghost"
            className="records-mobile-top-pager-btn records-mobile-top-pager-btn--plain"
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
            className="records-mobile-top-pager-btn records-mobile-top-pager-btn--plain"
            aria-label="Next page"
            disabled={safeCurrentPage >= totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
          >
            <CIcon icon={cilCaretRight} />
          </CButton>
        </div>
      </div>

      {pagedRecords.length === 0 ? (
        <div className="text-center text-muted py-3">No records to display.</div>
      ) : (
        <div className="records-mobile-list">
          {pagedRecords.map((record, idx) => {
            const meta = record?.__serviceTableMeta || {}
            const amount = Number(meta.amountValue ?? 0)
            const amountDisplay = Number.isFinite(amount)
              ? `RM ${amount.toLocaleString('en-MY', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`
              : '-'
            const rowActionKey = `${record?.serviceTab || 'service'}-${record?.id || idx}-mobile-list`

            return (
              <div key={rowActionKey} className="records-mobile-item">
                <div className="records-mobile-item-head">
                  <button
                    type="button"
                    className="records-mobile-item-main btn btn-link p-0 text-start text-decoration-none"
                    onClick={() => {
                      if (typeof onView === 'function') onView(record)
                    }}
                  >
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <span className="records-mobile-row-index text-muted">
                        #{pageStart + idx + 1}
                      </span>
                      <CTooltip content={record?.quotationId || '-'} placement="top">
                        <span className="records-mobile-quote-id">
                          {truncateFront(record?.quotationId, 12)}
                        </span>
                      </CTooltip>
                      <CBadge
                        className={`records-status-badge records-status-badge--${meta.statusTone || 'info'}`}
                      >
                        {meta.statusLabel || record?.status || '-'}
                      </CBadge>
                      {getProjectOutcomeLabel(record) && (
                        <CBadge color="secondary">{getProjectOutcomeLabel(record)}</CBadge>
                      )}
                    </div>
                    {isColumnVisible('subject') && (
                      <div className="records-mobile-subtitle mt-1">
                        <CTooltip content={meta.subjectText || '-'} placement="top">
                          <span style={{ ...truncateStyle, maxWidth: '100%' }}>
                            {meta.subjectText || '-'}
                          </span>
                        </CTooltip>
                      </div>
                    )}
                    <div className="records-mobile-client mt-1">
                      <CTooltip content={meta.clientName || '-'} placement="top">
                        <span style={{ ...truncateStyle, maxWidth: '100%' }}>
                          {meta.clientName || '-'}
                        </span>
                      </CTooltip>
                    </div>
                  </button>
                  <div className="records-mobile-head-actions d-flex align-items-start gap-2 ms-2">
                    <RecordActionMenu
                      record={record}
                      onGenerate={onGenerate}
                      onFollowUp={onFollowUp}
                      onChangeToFail={onChangeToFail ? () => onChangeToFail(record.id) : undefined}
                      onChangeToSuccess={
                        onChangeToSuccess ? () => onChangeToSuccess(record.id) : undefined
                      }
                      onUnAward={onUnAward ? () => onUnAward(record.id) : undefined}
                      onReAward={onReAward ? () => onReAward(record.id) : undefined}
                      onEdit={onEdit}
                      onRevise={onRevise}
                      onNegotiate={onNegotiate}
                      onView={onView}
                      onEmail={onEmail}
                      onSharePdf={onSharePdf}
                      onSyncClient={onSyncClientDetails}
                      onOpenTab={onOpen}
                      onDelete={onDelete ? () => onDelete(record.id) : undefined}
                      popperConfig={actionMenuPopperConfig}
                      actionKey={rowActionKey}
                      openActionKey={openActionDropdown}
                      setOpenActionKey={setOpenActionDropdown}
                    />
                  </div>
                </div>

                {isColumnVisible('subject') && typeof renderMobileSubjectExtra === 'function' && (
                  <div className="mt-1">{renderMobileSubjectExtra(record)}</div>
                )}

                {isColumnVisible('amount') && (
                  <div className="records-mobile-kv-grid mt-2">
                    <div className="records-mobile-kv">
                      <span className="records-mobile-k">Amount</span>
                      <span className="records-mobile-v">{amountDisplay}</span>
                    </div>
                    {typeof renderMobileAmountSecondary === 'function' && (
                      <div className="records-mobile-kv">
                        <span className="records-mobile-k">&nbsp;</span>
                        <span className="records-mobile-v text-muted">
                          {renderMobileAmountSecondary(record)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ServiceRecordsMobileList
