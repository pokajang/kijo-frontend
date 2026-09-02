import React from 'react'
import PropTypes from 'prop-types'
import { CButton, CFormInput, CFormLabel, CFormSelect } from '@coreui/react'

const formatMonth = (value) => {
  if (!value) return 'All issuance months'
  const [year, month] = value.split('-').map(Number)
  const date = new Date(year, month - 1, 1)
  if (Number.isNaN(date.getTime())) return value
  return `Issued in ${new Intl.DateTimeFormat('en-MY', { month: 'long', year: 'numeric' }).format(date)}`
}

const PaymentVoucherArchiveFilters = ({ filters, onChange, onClear, loading }) => (
  <section aria-label="Payment voucher filters">
    <div className="row g-3 align-items-end">
      <div className="col-12 col-lg-6">
        <CFormLabel htmlFor="voucher-search">Search vouchers</CFormLabel>
        <CFormInput
          id="voucher-search"
          type="search"
          value={filters.search}
          placeholder="Voucher number, vendor, project, or purpose"
          onChange={(event) => onChange('search', event.target.value)}
        />
      </div>
      <div className="col-12 col-sm-6 col-lg-3">
        <CFormLabel htmlFor="voucher-month">Issuance month</CFormLabel>
        <CFormInput
          id="voucher-month"
          type="month"
          value={filters.month}
          onChange={(event) => onChange('month', event.target.value)}
        />
      </div>
      <div className="col-12 col-sm-6 col-lg-3">
        <CFormLabel htmlFor="voucher-status">Voucher / settlement status</CFormLabel>
        <CFormSelect
          id="voucher-status"
          value={filters.status}
          onChange={(event) => onChange('status', event.target.value)}
        >
          <option value="all">All statuses</option>
          <option value="awaiting_payment">Awaiting payment</option>
          <option value="partially_paid">Partially paid</option>
          <option value="paid">Paid</option>
          <option value="voided">Voided</option>
        </CFormSelect>
      </div>
    </div>
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
      <div className="small text-body-secondary" aria-live="polite">
        {formatMonth(filters.month)}
        {filters.status !== 'all' ? ` · ${filters.status.replaceAll('_', ' ')}` : ''}
      </div>
      <CButton
        type="button"
        size="sm"
        color="secondary"
        variant="outline"
        onClick={onClear}
        disabled={loading || (!filters.search && !filters.month && filters.status === 'all')}
      >
        Clear filters
      </CButton>
    </div>
  </section>
)

PaymentVoucherArchiveFilters.propTypes = {
  filters: PropTypes.shape({
    month: PropTypes.string.isRequired,
    search: PropTypes.string.isRequired,
    status: PropTypes.string.isRequired,
  }).isRequired,
  loading: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
}

export default PaymentVoucherArchiveFilters
