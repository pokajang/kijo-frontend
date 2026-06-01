import React from 'react'
import { CButton, CCardBody, CCardFooter, CCol, CRow } from '@coreui/react'

const emptyValue = '-'

const DetailItem = ({ label, value }) => (
  <CCol xs={12} md={4}>
    <div className="text-body-secondary small">{label}</div>
    <div className="fw-semibold">{value || emptyValue}</div>
  </CCol>
)

const JD14ReviewStep = ({ payload, submitting, onBack, onCreate }) => (
  <>
    <CCardBody>
      <h5 className="mb-3">Review JD14</h5>
      <CRow className="g-3">
        <DetailItem label="Employer" value={payload.employer_name} />
        <DetailItem label="Employer Code" value={payload.employer_code} />
        <DetailItem label="Approval No" value={payload.approval_no} />
        <DetailItem label="Group Approved" value={payload.group_approved} />
        <DetailItem label="Group Claimed" value={payload.group_claimed} />
        <DetailItem label="Course Title" value={payload.course_title} />
        <DetailItem label="Training Venue" value={payload.training_venue} />
        <DetailItem label="Commenced Date" value={payload.commenced_date} />
        <DetailItem label="End Date" value={payload.end_date} />
        <DetailItem label="No. of Pax" value={payload.no_of_pax} />
        <DetailItem label="Fee Approved" value={payload.total_fee_approved} />
        <DetailItem label="Fee Claimed" value={payload.total_fee_claimed} />
        <CCol xs={12}>
          <div className="text-body-secondary small">Employer Address</div>
          <div className="fw-semibold">{payload.employer_address || emptyValue}</div>
        </CCol>
      </CRow>
    </CCardBody>
    <CCardFooter className="d-flex justify-content-end gap-2">
      <CButton color="secondary" size="sm" variant="outline" onClick={onBack} disabled={submitting}>
        Back to Edit
      </CButton>
      <CButton color="primary" size="sm" onClick={onCreate} disabled={submitting}>
        {submitting ? 'Creating...' : 'Create JD14'}
      </CButton>
    </CCardFooter>
  </>
)

export default JD14ReviewStep
