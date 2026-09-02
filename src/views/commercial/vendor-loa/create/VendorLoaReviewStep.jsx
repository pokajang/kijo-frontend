import React from 'react'
import { CButton, CCardBody, CCardFooter, CCol, CRow } from '@coreui/react'
import { formatMoney } from '../../../../utils/formatters/numberFormatters'

const emptyValue = '-'

const DetailItem = ({ label, value }) => (
  <CCol xs={12} md={4}>
    <div className="text-body-secondary small">{label}</div>
    <div className="fw-semibold">{value || emptyValue}</div>
  </CCol>
)

const VendorLoaReviewStep = ({
  project,
  selectedVendor,
  payload,
  submitting,
  onBack,
  onCreate,
}) => (
  <>
    <CCardBody>
      <h5 className="mb-3">Review Vendor LOA</h5>
      <CRow className="g-3">
        <DetailItem label="Project" value={project?.project_name} />
        <DetailItem label="Client" value={project?.client_name} />
        <DetailItem label="Vendor" value={selectedVendor?.vendor_name} />
        <DetailItem label="Award Value" value={formatMoney(payload.award_value)} />
        <DetailItem label="Payment Terms" value={payload.payment_terms} />
        <DetailItem label="Position" value={payload.position} />
        <DetailItem label="Services Description" value={payload.services_description} />
        <DetailItem label="Venue Details" value={payload.venue_details} />
        <DetailItem label="Award Date" value={payload.award_date} />
        <CCol xs={12} md={6}>
          <div className="text-body-secondary small">Fee Breakdown</div>
          <div className="fw-semibold" style={{ whiteSpace: 'pre-wrap' }}>
            {payload.fee_breakdown || emptyValue}
          </div>
        </CCol>
        <CCol xs={12} md={6}>
          <div className="text-body-secondary small">Remarks</div>
          <div className="fw-semibold" style={{ whiteSpace: 'pre-wrap' }}>
            {payload.remarks || emptyValue}
          </div>
        </CCol>
      </CRow>
    </CCardBody>
    <CCardFooter className="d-flex justify-content-end gap-2">
      <CButton color="secondary" size="sm" variant="outline" onClick={onBack} disabled={submitting}>
        Back to Edit
      </CButton>
      <CButton color="primary" size="sm" onClick={onCreate} disabled={submitting}>
        {submitting ? 'Creating...' : 'Create Vendor LOA'}
      </CButton>
    </CCardFooter>
  </>
)

export default VendorLoaReviewStep
