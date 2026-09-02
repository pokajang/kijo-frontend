import React from 'react'
import PropTypes from 'prop-types'
import {
  CButton,
  CFormCheck,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { DataTableStatusBadge } from '../../../components/datatable'
import { formatMoney } from '../../../utils/formatters/numberFormatters'
import { formatVoucherIssuedDate, getVoucherStatusPresentation } from './paymentVoucherArchiveModel'

const VoucherActions = ({
  record,
  onPreview,
  onDownload,
  onOpenRequest,
  downloading = false,
  compact = false,
}) => (
  <div className={`d-flex flex-wrap gap-2 ${compact ? '' : 'justify-content-end'}`}>
    <CButton size="sm" color="primary" variant="outline" onClick={() => onPreview(record)}>
      Preview
    </CButton>
    <CButton size="sm" color="primary" disabled={downloading} onClick={() => onDownload(record)}>
      {downloading ? 'Downloading…' : 'Download'}
    </CButton>
    <CButton size="sm" color="secondary" variant="outline" onClick={() => onOpenRequest(record)}>
      View request
    </CButton>
  </div>
)

VoucherActions.propTypes = {
  compact: PropTypes.bool,
  downloading: PropTypes.bool,
  onDownload: PropTypes.func.isRequired,
  onOpenRequest: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  record: PropTypes.object.isRequired,
}

const PaymentVoucherArchiveList = ({
  records,
  selected,
  allSelected,
  onToggle,
  onToggleAll,
  onPreview,
  onDownload,
  onOpenRequest,
  downloadingId,
}) => (
  <>
    <div className="d-none d-lg-block table-responsive vendor-payment-voucher-table">
      <CTable align="middle" hover>
        <CTableHead>
          <CTableRow>
            <CTableHeaderCell scope="col" className="vendor-payment-voucher-table__select">
              <CFormCheck
                aria-label="Select all vouchers on this page"
                checked={allSelected}
                onChange={onToggleAll}
              />
            </CTableHeaderCell>
            <CTableHeaderCell scope="col">Voucher</CTableHeaderCell>
            <CTableHeaderCell scope="col">Vendor</CTableHeaderCell>
            <CTableHeaderCell scope="col">Project / purpose</CTableHeaderCell>
            <CTableHeaderCell scope="col" className="text-end">
              Amount
            </CTableHeaderCell>
            <CTableHeaderCell scope="col">Status</CTableHeaderCell>
            <CTableHeaderCell scope="col" className="text-end">
              Actions
            </CTableHeaderCell>
          </CTableRow>
        </CTableHead>
        <CTableBody>
          {records.map((record) => {
            const status = getVoucherStatusPresentation(record)
            return (
              <CTableRow key={record.id}>
                <CTableDataCell>
                  <CFormCheck
                    aria-label={`Select ${record.voucher_number}`}
                    checked={selected.has(Number(record.id))}
                    onChange={() => onToggle(record.id)}
                  />
                </CTableDataCell>
                <CTableDataCell>
                  <strong>{record.voucher_number}</strong>
                  <div className="small text-body-secondary">
                    {formatVoucherIssuedDate(record.issued_at)}
                  </div>
                </CTableDataCell>
                <CTableDataCell>{record.vendor_name || '-'}</CTableDataCell>
                <CTableDataCell>{record.project_or_context || '-'}</CTableDataCell>
                <CTableDataCell className="text-end text-nowrap">
                  {formatMoney(record.amount)}
                </CTableDataCell>
                <CTableDataCell>
                  <DataTableStatusBadge tone={status.tone}>{status.label}</DataTableStatusBadge>
                </CTableDataCell>
                <CTableDataCell className="text-end">
                  <VoucherActions
                    record={record}
                    onPreview={onPreview}
                    onDownload={onDownload}
                    onOpenRequest={onOpenRequest}
                    downloading={downloadingId === Number(record.id)}
                  />
                </CTableDataCell>
              </CTableRow>
            )
          })}
        </CTableBody>
      </CTable>
    </div>
    <div className="d-lg-none vendor-payment-voucher-mobile-list">
      {records.map((record) => {
        const status = getVoucherStatusPresentation(record)
        return (
          <article key={record.id} className="vendor-payment-voucher-mobile-card">
            <div className="d-flex align-items-start gap-3">
              <CFormCheck
                className="vendor-payment-voucher-mobile-card__check"
                aria-label={`Select ${record.voucher_number}`}
                checked={selected.has(Number(record.id))}
                onChange={() => onToggle(record.id)}
              />
              <div className="min-w-0 flex-grow-1">
                <div className="d-flex flex-wrap align-items-center justify-content-between gap-2">
                  <strong>{record.voucher_number}</strong>
                  <DataTableStatusBadge tone={status.tone}>{status.label}</DataTableStatusBadge>
                </div>
                <div className="small text-body-secondary mt-1">
                  Issued {formatVoucherIssuedDate(record.issued_at)}
                </div>
              </div>
            </div>
            <dl className="vendor-payment-voucher-mobile-card__details">
              <div>
                <dt>Vendor</dt>
                <dd>{record.vendor_name || '-'}</dd>
              </div>
              <div>
                <dt>Amount</dt>
                <dd>{formatMoney(record.amount)}</dd>
              </div>
              <div className="vendor-payment-voucher-mobile-card__wide">
                <dt>Project / purpose</dt>
                <dd>{record.project_or_context || '-'}</dd>
              </div>
            </dl>
            {status.label === 'Voided' && record.void_reason && (
              <div className="small text-danger mb-3">
                <strong>Void reason:</strong> {record.void_reason}
              </div>
            )}
            <VoucherActions
              compact
              record={record}
              onPreview={onPreview}
              onDownload={onDownload}
              onOpenRequest={onOpenRequest}
              downloading={downloadingId === Number(record.id)}
            />
          </article>
        )
      })}
    </div>
  </>
)

PaymentVoucherArchiveList.propTypes = {
  allSelected: PropTypes.bool.isRequired,
  downloadingId: PropTypes.number,
  onDownload: PropTypes.func.isRequired,
  onOpenRequest: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired,
  onToggle: PropTypes.func.isRequired,
  onToggleAll: PropTypes.func.isRequired,
  records: PropTypes.arrayOf(PropTypes.object).isRequired,
  selected: PropTypes.instanceOf(Set).isRequired,
}

export default PaymentVoucherArchiveList
