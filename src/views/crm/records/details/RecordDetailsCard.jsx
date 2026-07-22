import React from 'react'
import {
  CAlert,
  CBadge,
  CCardBody,
  CCol,
  CRow,
  CTable,
  CTableBody,
  CTableDataCell,
  CTableHead,
  CTableHeaderCell,
  CTableRow,
} from '@coreui/react'
import { DataTableLoadingState } from '../../../../components/datatable'
import RemarksCell from '../tables/shared/RemarksCell'
import { getProjectOutcomeLabel, getStatusLabel } from '../utils/allRecordsTableUtils'

const renderField = (label, value, options = {}) => {
  const { mobileInline = false, valueClassName = '' } = options
  if (!mobileInline) {
    return (
      <div className="records-detail-field">
        <div className="small text-muted">{label}</div>
        <div className={valueClassName}>{value}</div>
      </div>
    )
  }
  return (
    <>
      <div className="d-flex d-md-none justify-content-between align-items-start gap-3">
        <div className="small text-muted">{label}</div>
        <div className={`text-end ms-auto ${valueClassName}`.trim()}>{value}</div>
      </div>
      <div className="d-none d-md-block">
        <div className="small text-muted">{label}</div>
        <div className={valueClassName}>{value}</div>
      </div>
    </>
  )
}

const toNumber = (value, fallback = 0) => {
  const next = Number(value)
  return Number.isFinite(next) ? next : fallback
}

const normalizeRecordItemRows = (record, serviceTab) => {
  const items =
    serviceTab === 'ih-tab'
      ? Array.isArray(record?.formData?.hygieneItems)
        ? record.formData.hygieneItems
        : []
      : serviceTab === 'special-tab'
        ? Array.isArray(record?.lineItems)
          ? record.lineItems
          : []
        : []

  return items.map((item, index) => {
    const quantity = toNumber(item.quantity)
    const unitPrice = toNumber(item.unit_price ?? item.unitPrice ?? 0)
    const lineTotal = toNumber(
      item.line_total ?? item.lineTotal ?? item.amount ?? quantity * unitPrice,
    )
    const title =
      serviceTab === 'ih-tab'
        ? item.item_description || item.itemName || item.title || '-'
        : item.title || item.itemName || item.item_description || '-'
    const unit = item.unit || (serviceTab === 'ih-tab' ? 'Lot' : '-')

    return {
      id: item.id ?? `row-${index}`,
      key: item.id ?? index,
      title,
      description: item.description || '',
      quantity,
      unit,
      unitPrice,
      lineTotal,
    }
  })
}

const RecordDetailsCard = ({
  loading,
  error,
  serviceLabel,
  serviceTab,
  record,
  subject,
  amountDisplay,
  quotationAgeDays,
  getDateOnly,
  statusColor,
}) => {
  const itemRows = normalizeRecordItemRows(record, serviceTab)
  const showItemRows = itemRows.length > 0
  const rowHeading = serviceTab === 'special-tab' ? 'Line Items' : 'Additional Fees'

  return (
    <CCardBody>
      {loading ? (
        <DataTableLoadingState message="Loading details..." />
      ) : error ? (
        <CAlert color="warning" className="mb-0">
          {error}
        </CAlert>
      ) : (
        <CRow className="g-3">
          <CCol xs={12} md={4}>
            {renderField('Service', serviceLabel || '-', { mobileInline: true })}
          </CCol>
          <CCol xs={12} md={4}>
            {renderField('Quotation ID', record?.quotationId || '-', { mobileInline: true })}
          </CCol>
          <CCol xs={12} md={4}>
            {renderField(
              'Status',
              <div className="d-flex flex-column align-items-start gap-1">
                <CBadge color={statusColor(record?.status)}>{getStatusLabel(record)}</CBadge>
                {getProjectOutcomeLabel(record) && (
                  <span className="small text-muted">{getProjectOutcomeLabel(record)}</span>
                )}
              </div>,
              { mobileInline: true },
            )}
          </CCol>
          <CCol xs={12} md={4}>
            {renderField('Client', record?.clientDetails?.companyName || '-')}
          </CCol>
          <CCol xs={12} md={4}>
            {renderField('PIC', record?.personInCharge || record?.clientDetails?.fullName || '-')}
          </CCol>
          <CCol xs={12} md={4}>
            {renderField('Email', record?.clientDetails?.email || '-')}
          </CCol>
          <CCol xs={12} md={4}>
            {renderField('Subject', subject)}
          </CCol>
          <CCol xs={12} md={4}>
            {renderField('Amount', amountDisplay, { mobileInline: true })}
          </CCol>
          <CCol xs={12} md={4}>
            {renderField('Created', getDateOnly(record?.dateCreated) || '-', {
              mobileInline: true,
            })}
          </CCol>
          <CCol xs={12} md={4}>
            {renderField('Age', quotationAgeDays != null ? `${quotationAgeDays}d` : '-', {
              mobileInline: true,
              valueClassName: quotationAgeDays > 60 ? 'text-danger' : '',
            })}
          </CCol>
          <CCol xs={12} md={8}>
            <div className="small text-muted mb-1">Remarks</div>
            <RemarksCell record={record} fmtDate={getDateOnly} />
          </CCol>
          {showItemRows ? (
            <CCol xs={12}>
              <div className="small text-muted mb-1">{rowHeading}</div>
              <CTable className="align-middle mb-0 records-table-compact">
                <CTableHead>
                  <CTableRow>
                    <CTableHeaderCell className="fw-normal text-muted">#</CTableHeaderCell>
                    <CTableHeaderCell>Amount (RM)</CTableHeaderCell>
                    <CTableHeaderCell>Line Item</CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
                <CTableBody>
                  {itemRows.map((item, index) => (
                    <CTableRow key={item.key}>
                      <CTableDataCell className="fw-normal text-muted">{index + 1}</CTableDataCell>
                      <CTableDataCell>{item.lineTotal.toFixed(2)}</CTableDataCell>
                      <CTableDataCell>
                        <span>
                          <strong>{item.title}</strong>{' '}
                          <small className="text-muted">
                            ({item.quantity} {item.unit} x {item.unitPrice.toFixed(2)})
                          </small>
                          {item.description ? (
                            <>
                              <span className="text-muted"> Notes: </span>
                              <span className="text-muted">{item.description}</span>
                            </>
                          ) : null}
                        </span>
                      </CTableDataCell>
                    </CTableRow>
                  ))}
                </CTableBody>
              </CTable>
            </CCol>
          ) : null}
        </CRow>
      )}
    </CCardBody>
  )
}

export default RecordDetailsCard
