import React from 'react'
import { CCardHeader, CCardBody, CRow, CCol, CFormLabel, CFormInput } from '@coreui/react'

const SalesProfileSection = ({ profile, onChange }) => (
  <>
    <CCardHeader>
      <strong>Sales Identity</strong>
    </CCardHeader>
    <CCardBody>
      <CRow className="mb-2">
        <CCol md={6}>
          <CFormLabel htmlFor="nameCode">Name Code</CFormLabel>
          <CFormInput
            type="text"
            id="nameCode"
            name="nameCode"
            value={profile.nameCode || ''}
            // onChange={onChange}
            disabled
            readOnly
          />
        </CCol>
        <CCol md={6}>
          <CFormLabel htmlFor="crmPosition">CRM Sales Position (if any)</CFormLabel>
          <CFormInput
            type="text"
            id="crmPosition"
            name="crmPosition"
            value={profile.crmPosition || ''}
            onChange={onChange}
          />
        </CCol>
      </CRow>
    </CCardBody>
  </>
)

export default SalesProfileSection
