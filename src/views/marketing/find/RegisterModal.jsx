import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CRow,
  CCol,
  CFormInput,
  CFormLabel,
  CSpinner,
  CFormTextarea,
  CAlert,
} from '@coreui/react'

const RegisterModal = ({
  showRegister,
  setShowRegister,
  registerForm,
  setRegisterForm,
  registerNotice,
  registerError,
  saving,
  onSave,
}) => {
  const isRegistered = Boolean(registerNotice)

  return (
    <CModal
      visible={showRegister}
      onClose={() => setShowRegister(false)}
      alignment="center"
      backdrop="static"
    >
      <CModalHeader onClose={() => setShowRegister(false)}>
        <CModalTitle>Register Contact to Call Records</CModalTitle>
      </CModalHeader>
      <CModalBody>
        {isRegistered ? (
          <CAlert color="success" className="mb-0">
            {registerNotice}
          </CAlert>
        ) : (
          <>
            <CAlert color="info" className="py-2">
              This will add the contact into <strong>Call Records</strong> so you can log marketing
              calls for this contact.
            </CAlert>
            {registerError && (
              <CAlert color="danger" className="py-2">
                {registerError}
              </CAlert>
            )}
            <CRow className="g-3">
              <CCol xs={12}>
                <CFormLabel htmlFor="reg-name">Business Name</CFormLabel>
                <CFormInput
                  id="reg-name"
                  value={registerForm.name}
                  onChange={(e) => setRegisterForm({ ...registerForm, name: e.target.value })}
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="reg-phone">Phone</CFormLabel>
                <CFormInput
                  id="reg-phone"
                  value={registerForm.phone}
                  onChange={(e) => setRegisterForm({ ...registerForm, phone: e.target.value })}
                />
              </CCol>
              <CCol xs={12}>
                <CFormLabel htmlFor="reg-address">Address</CFormLabel>
                <CFormTextarea
                  id="reg-address"
                  value={registerForm.address}
                  onChange={(e) => setRegisterForm({ ...registerForm, address: e.target.value })}
                />
              </CCol>

              <CCol xs={12}>
                <CFormLabel htmlFor="reg-website">Website</CFormLabel>
                <CFormTextarea
                  id="reg-website"
                  value={registerForm.website || ''}
                  onChange={(e) => setRegisterForm({ ...registerForm, website: e.target.value })}
                />
              </CCol>
            </CRow>
          </>
        )}
      </CModalBody>
      <CModalFooter>
        {isRegistered ? (
          <CButton color="secondary" variant="outline" onClick={() => setShowRegister(false)}>
            Close
          </CButton>
        ) : (
          <>
            <CButton color="secondary" variant="outline" onClick={() => setShowRegister(false)}>
              Cancel
            </CButton>
            <CButton color="success" onClick={onSave} disabled={saving}>
              {saving ? (
                <>
                  <CSpinner size="sm" className="me-2" />
                  Saving...
                </>
              ) : (
                'Register to Call Records'
              )}
            </CButton>
          </>
        )}
      </CModalFooter>
    </CModal>
  )
}

export default RegisterModal
