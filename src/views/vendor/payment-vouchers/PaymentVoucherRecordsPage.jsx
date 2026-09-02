import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { CAlert, CButton, CCard, CCardBody, CCardHeader, CSpinner } from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import ModuleNavStrip from '../../../components/navigation/ModuleNavStrip'
import { vendorModuleTabs } from '../../../components/navigation/moduleNavConfigs'
import { showApiToast } from '../../../api/apiClient'
import { toLocalMonthInputValue } from '../../../utils/dateInputValues'
import { resolveAssetUrl } from '../../../utils/assetUrls'
import { downloadAuthenticatedFile } from '../../../utils/downloadAuthenticatedFile'
import { fetchVendorPaymentVouchers } from '../payment-records/vendorPaymentApi'
import VendorPaymentVoucherPreview from '../pay/VendorPaymentVoucherPreview'
import PaymentVoucherArchiveFilters from './PaymentVoucherArchiveFilters'
import PaymentVoucherArchiveList from './PaymentVoucherArchiveList'
import {
  getVoucherDocumentFilename,
  getVoucherDocumentState,
  getVoucherDocumentUrl,
} from './paymentVoucherArchiveModel'

const API_BASE = import.meta.env.VITE_API_BASE
const initialFilters = () => ({ search: '', month: toLocalMonthInputValue(), status: 'all' })

const PaymentVoucherRecordsPage = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = useState(initialFilters)
  const [records, setRecords] = useState([])
  const [pagination, setPagination] = useState({ current_page: 1, last_page: 1, total: 0 })
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(new Set())
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [downloadingId, setDownloadingId] = useState(null)
  const [error, setError] = useState('')

  const loadRecords = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await fetchVendorPaymentVouchers({
        page,
        per_page: 50,
        ...(filters.search.trim() ? { search: filters.search.trim() } : {}),
        ...(filters.month ? { month: filters.month } : {}),
        status: filters.status,
      })
      setRecords(Array.isArray(payload?.data) ? payload.data : [])
      setPagination(payload?.pagination || { current_page: 1, last_page: 1, total: 0 })
    } catch (requestError) {
      setRecords([])
      setError(requestError?.message || 'Unable to load payment vouchers.')
    } finally {
      setLoading(false)
    }
  }, [filters.month, filters.search, filters.status, page])

  useEffect(() => {
    const timer = setTimeout(loadRecords, filters.search ? 250 : 0)
    return () => clearTimeout(timer)
  }, [filters.search, loadRecords])

  useEffect(() => {
    setPage(1)
    setSelected(new Set())
  }, [filters.month, filters.search, filters.status])

  const pageIds = useMemo(() => records.map((record) => Number(record.id)), [records])
  const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id))
  const hasFilters = Boolean(filters.search || filters.month || filters.status !== 'all')

  const toggleOne = (voucherId) => {
    const id = Number(voucherId)
    if (!selected.has(id) && selected.size >= 100) {
      setError('Select no more than 100 vouchers per bulk download.')
      return
    }
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    const newIds = pageIds.filter((id) => !selected.has(id))
    if (!allSelected && selected.size + newIds.length > 100) {
      setError('Only the first 100 selected vouchers can be included in one bulk download.')
    }
    setSelected((current) => {
      const next = new Set(current)
      if (allSelected) pageIds.forEach((id) => next.delete(id))
      else
        pageIds.forEach((id) => {
          if (next.size < 100) next.add(id)
        })
      return next
    })
  }

  const handleBulkDownload = async () => {
    if (!selected.size) return
    setDownloading(true)
    setError('')
    try {
      const count = selected.size
      await downloadAuthenticatedFile({
        url: `${API_BASE}vendor-payment-vouchers/bulk-download`,
        init: {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/zip' },
          body: JSON.stringify({ voucher_ids: Array.from(selected) }),
        },
        expectedType: 'zip',
        fallbackFilename: `payment-vouchers-${filters.month || toLocalMonthInputValue()}.zip`,
      })
      setSelected(new Set())
      showApiToast(`${count} payment ${count === 1 ? 'voucher' : 'vouchers'} downloaded.`)
    } catch (requestError) {
      setError(requestError?.message || 'Unable to download the selected vouchers.')
    } finally {
      setDownloading(false)
    }
  }

  const handleDownload = async (record) => {
    setDownloadingId(Number(record.id))
    setError('')
    try {
      await downloadAuthenticatedFile({
        url: resolveAssetUrl(getVoucherDocumentUrl(record)),
        expectedType: 'pdf',
        fallbackFilename: getVoucherDocumentFilename(record),
      })
      showApiToast(`${record.voucher_number} downloaded.`)
    } catch (requestError) {
      setError(requestError?.message || `Unable to download ${record.voucher_number}.`)
    } finally {
      setDownloadingId(null)
    }
  }

  const updateFilter = (key, value) => setFilters((current) => ({ ...current, [key]: value }))
  const clearFilters = () => setFilters({ search: '', month: '', status: 'all' })

  return (
    <>
      <ModuleNavStrip tabs={vendorModuleTabs} ariaLabel="Vendor sections" />
      <CCard className="mb-4">
        <CCardHeader className="d-flex flex-wrap align-items-center justify-content-between gap-3">
          <div>
            <strong>Payment Voucher Records</strong>
            <div className="small text-body-secondary">
              Finance archive for individual retrieval, monthly storage, and audit preparation.
            </div>
          </div>
          <CButton
            color="primary"
            size="sm"
            disabled={!selected.size || downloading}
            onClick={handleBulkDownload}
          >
            {downloading ? (
              <>
                <CSpinner size="sm" className="me-2" />
                Preparing ZIP…
              </>
            ) : (
              `Download selected (${selected.size})`
            )}
          </CButton>
        </CCardHeader>
        <CCardBody>
          <PaymentVoucherArchiveFilters
            filters={filters}
            onChange={updateFilter}
            onClear={clearFilters}
            loading={loading}
          />

          {selected.size > 0 && (
            <div className="vendor-payment-voucher-selection mt-3" role="status">
              {selected.size} selected across viewed pages (maximum 100). Bulk downloads use the
              paid copy when available and retain void markings.
            </div>
          )}
          {error && (
            <CAlert color="danger" role="alert" className="mt-3 mb-0">
              {error}
            </CAlert>
          )}

          <div className="mt-3" aria-busy={loading}>
            {loading ? (
              <div className="d-flex justify-content-center align-items-center gap-2 py-5 text-body-secondary">
                <CSpinner size="sm" /> Loading vouchers…
              </div>
            ) : records.length === 0 ? (
              <div className="vendor-payment-voucher-empty">
                <strong>
                  {hasFilters
                    ? 'No vouchers match these filters.'
                    : 'No vouchers have been generated yet.'}
                </strong>
                <div className="small mt-1">
                  {hasFilters
                    ? 'Clear the filters to search the complete voucher archive.'
                    : 'Generate a voucher from an approved payment request.'}
                </div>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  className="mt-3"
                  onClick={hasFilters ? clearFilters : () => navigate('/vendor/payment-records')}
                >
                  {hasFilters ? 'Clear filters' : 'Open Payment Queue'}
                </CButton>
              </div>
            ) : (
              <PaymentVoucherArchiveList
                records={records}
                selected={selected}
                allSelected={allSelected}
                downloadingId={downloadingId}
                onToggle={toggleOne}
                onToggleAll={toggleAll}
                onPreview={setPreview}
                onDownload={handleDownload}
                onOpenRequest={(record) =>
                  navigate(`/vendor/payment-records/${record.vendor_payment_id}`)
                }
              />
            )}
          </div>

          {pagination.last_page > 1 && (
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3">
              <span className="small text-body-secondary">
                Page {pagination.current_page} of {pagination.last_page} · {pagination.total}{' '}
                vouchers
              </span>
              <div className="d-flex gap-2">
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((value) => value - 1)}
                >
                  Previous
                </CButton>
                <CButton
                  size="sm"
                  color="secondary"
                  variant="outline"
                  disabled={page >= pagination.last_page || loading}
                  onClick={() => setPage((value) => value + 1)}
                >
                  Next
                </CButton>
              </div>
            </div>
          )}
        </CCardBody>
      </CCard>
      <VendorPaymentVoucherPreview
        visible={Boolean(preview)}
        onClose={() => setPreview(null)}
        url={resolveAssetUrl(getVoucherDocumentUrl(preview || {}))}
        voucherNumber={preview?.voucher_number}
        documentState={getVoucherDocumentState(preview || {})}
      />
    </>
  )
}

export default PaymentVoucherRecordsPage
