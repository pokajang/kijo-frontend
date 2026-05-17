import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
import { cilLockLocked, cilUser, cilToggleOff, cilToggleOn } from '@coreui/icons'

import logoUrl from 'src/assets/brand/logo.svg'
import { useAuth } from 'src/auth/AuthProvider'

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [loginDetails, setLoginDetails] = useState({ email: '', password: '' })
  const [errorMessage, setErrorMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()

  useEffect(() => {
    if (location.state?.reason === 'session-expired') {
      setErrorMessage('Session expired. Please log in again.')
    }
  }, [location.state])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setLoginDetails((prev) => ({ ...prev, [name]: value }))
  }

  const handleLoginSubmit = async (event) => {
    event?.preventDefault?.()
    if (isSubmitting) return

    setErrorMessage('')
    setIsSubmitting(true)
    try {
      const response = await login(loginDetails)

      if (response.ok) {
        setErrorMessage('Credentials correct. Redirecting...')
        const redirectTo = location.state?.from?.pathname || '/dashboard'
        setTimeout(() => {
          navigate(redirectTo, { replace: true })
        }, 800)
        return
      }

      setErrorMessage(`Login failed: ${response.message || 'Invalid credentials.'}`)
    } catch (err) {
      console.error('Login error:', err)
      setErrorMessage('Server error. Please try again later.')
    } finally {
      setIsSubmitting(false)
    }
  }

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

                <CForm onSubmit={handleLoginSubmit}>
                  <p className="text-body-secondary">Sign In to your account</p>
                  {errorMessage && <p className="text-danger small">{errorMessage}</p>}

                  <CInputGroup className="mb-3">
                    <CInputGroupText>
                      <CIcon icon={cilUser} />
                    </CInputGroupText>
                    <CFormInput
                      type="email"
                      name="email"
                      value={loginDetails.email}
                      onChange={handleInputChange}
                      placeholder="Email address"
                      autoComplete="email"
                    />
                  </CInputGroup>

                  <CInputGroup className="mb-4">
                    <CInputGroupText>
                      <CIcon icon={cilLockLocked} />
                    </CInputGroupText>
                    <CFormInput
                      type={showPassword ? 'text' : 'password'}
                      name="password"
                      value={loginDetails.password}
                      onChange={handleInputChange}
                      placeholder="Password"
                      autoComplete="current-password"
                    />
                  </CInputGroup>

                  <CRow className="mb-3 justify-content-start text-center">
                    <CCol xs="auto">
                      <button
                        type="button"
                        className="btn btn-link px-0 d-flex align-items-center justify-content-center"
                        onClick={() => setShowPassword((prev) => !prev)}
                      >
                        <CIcon
                          size="xxl"
                          icon={showPassword ? cilToggleOn : cilToggleOff}
                          className={`me-2 ${showPassword ? 'text-primary' : 'text-secondary'}`}
                        />
                        <span className={showPassword ? 'text-secondary' : 'text-primary'}>
                          {showPassword ? 'Hide Password' : 'Show Password'}
                        </span>
                      </button>
                    </CCol>
                  </CRow>

                  <CRow>
                    <CCol xs={6}>
                      <CButton
                        type="submit"
                        color="primary"
                        className="px-4"
                        disabled={isSubmitting}
                      >
                        Login
                      </CButton>
                    </CCol>
                  </CRow>
                </CForm>

                <CRow className="mt-3">
                  <CCol>
                    <p className="text-body-secondary">
                      No account or lost password? Please send an email to azam@amiosh.com.
                    </p>
                  </CCol>
                </CRow>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
