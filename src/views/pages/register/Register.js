import React, { useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormInput,
  CInputGroup,
  CInputGroupText,
  CRow,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser, cilToggleOn, cilToggleOff } from '@coreui/icons'

import logoUrl from 'src/assets/brand/logo.svg'

const Register = () => {
  // State to control password visibility
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol md={9} lg={7} xl={6}>
            <CCard className="mx-4">
              <CCardBody className="p-4">
                <CRow className="justify-content-center align-items-center mb-3">
                  <CCol xs="auto">
                    <img src={logoUrl} alt="Let's KIJO logo" style={{ height: '40px' }} />
                  </CCol>
                </CRow>
                <CForm>
                  <p className="text-body-secondary">Create your account</p>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput placeholder="Username" autoComplete="username" />
                  </CInputGroup>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>@</CInputGroupText>
                    <CFormInput placeholder="Email" autoComplete="email" />
                  </CInputGroup>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Password"
                      autoComplete="new-password"
                    />
                  </CInputGroup>
                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Repeat password"
                      autoComplete="new-password"
                    />
                  </CInputGroup>
                  {/* Toggle Button for Password Visibility */}
                  <CRow className="mb-3 justify-content-start text-center">
                    <CCol xs="auto">
                      <button
                        type="button"
                        className="btn btn-link px-0 text-decoration-none d-flex align-items-center justify-content-center"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        <CIcon
                          size="xxl"
                          icon={showPassword ? cilToggleOn : cilToggleOff}
                          className={`me-2 ${showPassword ? 'text-primary' : 'text-secondary'}`}
                        />
                        <span className={showPassword ? 'text-secondary' : 'text-primary'}>
                          {showPassword ? 'Hide Passwords' : 'Show Passwords'}
                        </span>
                      </button>
                    </CCol>
                  </CRow>
                  <div className="d-grid">
                    <CButton color="primary" size="sm">
                      Create Account
                    </CButton>
                  </div>
                </CForm>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Register
