import React from 'react'
import { CAlert, CBadge, CCardBody, CCol, CRow } from '@coreui/react'
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

const RecordDetailsCard = ({
  loading,
  error,
  serviceLabel,
  record,
  subject,
  amountDisplay,
  quotationAgeDays,
  getDateOnly,
  statusColor,
}) => {
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
        </CRow>
      )}
    </CCardBody>
  )
}

export default RecordDetailsCard
