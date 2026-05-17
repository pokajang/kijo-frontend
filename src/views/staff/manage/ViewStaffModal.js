import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CCard,
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CButton,
} from '@coreui/react'

const ViewStaffModal = ({ visible, onClose, detail }) => {
  if (!detail) return null

  // Helper to render a label with its value underneath
  const Field = ({ label, value, xs = 12, md = 6 }) => (
    <CCol xs={xs} md={md} className="mb-3">
      <CFormLabel>{label}</CFormLabel>
      <div>{value ?? '-'}</div>
    </CCol>
  )

  return (
    <CModal size="lg" alignment="center" scrollable visible={visible} onClose={onClose}>
      <CModalHeader>
        <CModalTitle>Staff Details</CModalTitle>
      </CModalHeader>

      <CModalBody>
        {/* General Information */}
        <CCard className="mb-3">
          <CCardHeader>
            <strong>General Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <Field label="Full Name" value={detail.general?.full_name} />
              <Field label="Email" value={detail.general?.email} />
              <Field label="Mobile Number" value={detail.general?.mobile_number} />
              <Field label="Position" value={detail.general?.position} />
              <Field label="CRM Position (if any)" value={detail.general?.crm_position || 'N/A'} />
              <Field label="Department" value={detail.general?.department} />
              <Field label="Start Date" value={detail.general?.start_date} />
              <Field label="Status" value={detail.general?.status} />
              <Field label="Name Code" value={detail.general?.name_code} />
            </CRow>
          </CCardBody>

          {/* System Access Information */}
          <CCardHeader>
            <strong>System Access Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <Field
                label="Role"
                value={
                  Array.isArray(detail.user?.role) ? detail.user.role.join(', ') : detail.user?.role
                }
              />
              <Field label="Created At" value={detail.user?.created_at} />
            </CRow>
          </CCardBody>

          {/* Detail Staff Profile */}
          <CCardHeader>
            <strong>Detail Staff Profile</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <Field label="NRIC" value={detail.profile?.nric} />
              <Field label="Birth Date" value={detail.profile?.birth_date} />
              <Field label="Current Address" value={detail.profile?.current_address} xs={12} />
            </CRow>
          </CCardBody>

          {/* Emergency Contact 1 */}
          <CCardHeader>
            <strong>Emergency Contact 1</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <Field label="Name" value={detail.profile?.emergency_name1} />
              <Field label="Relationship" value={detail.profile?.emergency_relationship1} />
            </CRow>
            <CRow>
              <Field label="Phone" value={detail.profile?.emergency_phone1} />
              <Field label="Address" value={detail.profile?.emergency_address1} />
            </CRow>
          </CCardBody>

          {/* Emergency Contact 2 */}
          <CCardHeader>
            <strong>Emergency Contact 2</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <Field label="Name" value={detail.profile?.emergency_name2} />
              <Field label="Relationship" value={detail.profile?.emergency_relationship2} />
            </CRow>
            <CRow>
              <Field label="Phone" value={detail.profile?.emergency_phone2} />
              <Field label="Address" value={detail.profile?.emergency_address2} />
            </CRow>
          </CCardBody>

          {/* Health Information */}
          <CCardHeader>
            <strong>Health Information</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <Field label="Chronic Illness" value={detail.profile?.chronic_illness} />
              <Field label="Allergies" value={detail.profile?.allergies} />
            </CRow>
            <CRow>
              <Field label="Disabilities" value={detail.profile?.disabilities} />
              <Field label="Current Medication" value={detail.profile?.current_medication} />
            </CRow>
            <CRow>
              <Field label="Other Concerns" value={detail.profile?.other_concerns} xs={12} />
            </CRow>
          </CCardBody>
        </CCard>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" onClick={onClose}>
          Close
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default ViewStaffModal
