import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormCheck,
  CFormInput,
  CFormLabel,
  CInputGroup,
  CInputGroupText,
  CRow,
  CSpinner,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilLockLocked, cilUser } from '@coreui/icons'

import logoUrl from 'src/assets/brand/logo.svg'
import { useAuth } from 'src/auth/AuthProvider'
import PasswordVisibilityButton from './PasswordVisibilityButton'

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [loginDetails, setLoginDetails] = useState({ email: '', password: '', remember: false })
  const [mode, setMode] = useState('login')
  const [message, setMessage] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { login, requestPasswordReset, isAuthenticated = false } = useAuth()
  const alertId = 'login-message'
  const redirectTo = location.state?.from?.pathname || '/dashboard'

  useEffect(() => {
    if (location.state?.reason === 'session-expired') {
      setMessage('Session expired. Please sign in again.')
    }
  }, [location.state])

  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirectTo, { replace: true })
    }
  }, [isAuthenticated, navigate, redirectTo])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    const nextValue = e.target.type === 'checkbox' ? e.target.checked : value
    setLoginDetails((prev) => ({ ...prev, [name]: nextValue }))
  }

  const handleForgotPassword = () => {
    setMode('forgot')
    setMessage(null)
  }

  const handleBackToLogin = () => {
    setMode('login')
    setMessage(null)
  }

  const handlePasswordResetRequest = async (event) => {
    event?.preventDefault?.()
    if (isSubmitting) return

    setMessage(null)
    setIsSubmitting(true)
    try {
      const response = await requestPasswordReset({ email: loginDetails.email.trim() })
      if (response.ok) {
        setMessage(
          'If an active account exists for that email, a password reset link has been sent.',
        )
        return
      }

      setMessage(response.message || 'Unable to request password reset.')
    } catch (err) {
      console.error('Password reset request error:', err)
      setMessage(
        err instanceof TypeError
          ? 'Cannot reach the password reset service. Please try again later.'
          : err?.message || 'Unable to request password reset.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleLoginSubmit = async (event) => {
    event?.preventDefault?.()
    if (isSubmitting) return

    setMessage(null)
    setIsSubmitting(true)
    try {
      const credentials = {
        email: loginDetails.email.trim(),
        password: loginDetails.password,
        remember: loginDetails.remember,
      }
      const response = await login(credentials)

      if (response.ok) {
        navigate(redirectTo, { replace: true })
        return
      }

      setMessage(
        response.kind === 'service'
          ? response.message || 'Login service is unavailable. Please try again later.'
          : 'Invalid email or password.',
      )
    } catch (err) {
      console.error('Login error:', err)
      setMessage(
        err instanceof TypeError
          ? 'Cannot reach the login service. Please try again later.'
          : err?.message || 'Server error. Please try again later.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-body-tertiary min-vh-100 d-flex flex-row align-items-center">
      <CContainer>
        <CRow className="justify-content-center">
          <CCol xs={12} sm={10} md={7} lg={5} xl={4}>
            <CCard className="mx-3 mx-sm-0 shadow-sm">
              <CCardBody className="p-4 p-sm-5">
                <CRow className="justify-content-center align-items-center mb-3">
                  <CCol xs="auto">
                    <img src={logoUrl} alt="Let's KIJO logo" style={{ height: '44px' }} />
                  </CCol>
                </CRow>

                <CForm
                  onSubmit={mode === 'forgot' ? handlePasswordResetRequest : handleLoginSubmit}
                >
                  {message && (
                    <p id={alertId} className="text-body-secondary mb-3" aria-live="polite">
                      {message}
                    </p>
                  )}

                  {mode === 'forgot' && !message && (
                    <p className="text-body-secondary mb-3">
                      Enter your email address and we will send you a password reset link.
                    </p>
                  )}

                  <div className="mb-3">
                    <CFormLabel htmlFor="loginEmail">Email address</CFormLabel>
                    <CInputGroup className="mb-3">
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        id="loginEmail"
                        type="email"
                        name="email"
                        value={loginDetails.email}
                        onChange={handleInputChange}
                        placeholder="name@example.com"
                        autoComplete="email"
                        autoFocus
                        required
                        aria-describedby={message ? alertId : undefined}
                      />
                    </CInputGroup>
                  </div>

                  {mode === 'login' && (
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <CFormLabel htmlFor="loginPassword">Password</CFormLabel>
                        <CButton
                          type="button"
                          color="link"
                          className="px-0 py-0 text-decoration-none"
                          onClick={handleForgotPassword}
                        >
                          Forgot password?
                        </CButton>
                      </div>
                      <CInputGroup>
                        <CInputGroupText>
                          <CIcon icon={cilLockLocked} />
                        </CInputGroupText>
                        <CFormInput
                          id="loginPassword"
                          type={showPassword ? 'text' : 'password'}
                          name="password"
                          value={loginDetails.password}
                          onChange={handleInputChange}
                          placeholder="Password"
                          autoComplete="current-password"
                          required
                          aria-describedby={message ? alertId : undefined}
                        />
                        <PasswordVisibilityButton
                          visible={showPassword}
                          onToggle={() => setShowPassword((prev) => !prev)}
                          showLabel="Show password"
                          hideLabel="Hide password"
                        />
                      </CInputGroup>
                    </div>
                  )}

                  {mode === 'login' && (
                    <CFormCheck
                      id="loginRemember"
                      name="remember"
                      className="mb-3"
                      checked={loginDetails.remember}
                      onChange={handleInputChange}
                      label="Remember me for 30 days"
                    />
                  )}

                  <CButton
                    type="submit"
                    color="primary"
                    size="sm"
                    className="w-100"
                    disabled={isSubmitting}
                  >
                    {isSubmitting && <CSpinner size="sm" className="me-2" />}
                    {isSubmitting
                      ? mode === 'forgot'
                        ? 'Sending...'
                        : 'Signing in...'
                      : mode === 'forgot'
                        ? 'Send reset link'
                        : 'Sign in'}
                  </CButton>

                  {mode === 'forgot' && (
                    <CButton
                      type="button"
                      color="link"
                      size="sm"
                      className="d-block mx-auto mt-3 text-decoration-none"
                      onClick={handleBackToLogin}
                    >
                      Back to sign in
                    </CButton>
                  )}
                </CForm>

                <p className="text-body-secondary text-center small mt-4 mb-0">
                  Need an account? Contact your administrator.
                </p>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default Login
