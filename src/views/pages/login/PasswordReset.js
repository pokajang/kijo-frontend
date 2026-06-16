import React, { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import {
  CButton,
  CCard,
  CCardBody,
  CCol,
  CContainer,
  CForm,
  CFormFeedback,
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
import { showToast } from 'src/components/toast/toastService'
import PasswordVisibilityButton from './PasswordVisibilityButton'

const PASSWORD_MIN_LENGTH = 12
const PASSWORD_MAX_LENGTH = 128

const normalizeErrors = (errors = {}) =>
  Object.fromEntries(
    Object.entries(errors).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(' ') : String(value || ''),
    ]),
  )

const validateResetForm = (form) => {
  const errors = {}
  const email = form.email.trim()

  if (!email) {
    errors.email = 'Email address is required.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address.'
  }

  if (!form.newPassword) {
    errors.newPassword = 'New password is required.'
  } else if (form.newPassword.length < PASSWORD_MIN_LENGTH) {
    errors.newPassword = `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  } else if (form.newPassword.length > PASSWORD_MAX_LENGTH) {
    errors.newPassword = `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`
  }

  if (!form.confirmPassword) {
    errors.confirmPassword = 'Confirm your new password.'
  } else if (form.newPassword !== form.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match.'
  }

  return errors
}

const PasswordReset = () => {
  const { token = '' } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { resetPassword } = useAuth()
  const [form, setForm] = useState({
    email: searchParams.get('email') || '',
    newPassword: '',
    confirmPassword: '',
  })
  const [message, setMessage] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const messageId = 'password-reset-message'
  const validationErrors = validateResetForm(form)
  const touchedErrors = Object.fromEntries(
    Object.entries(validationErrors).filter(([field]) => touched[field]),
  )
  const visibleErrors = submitted
    ? { ...validationErrors, ...serverErrors }
    : { ...touchedErrors, ...serverErrors }
  const hasValidationErrors = Object.keys(validationErrors).length > 0

  const handleInputChange = (event) => {
    const { name, value } = event.target
    setServerErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlur = (event) => {
    const { name } = event.target
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (isSubmitting) return

    setSubmitted(true)
    setMessage(null)
    setServerErrors({})
    if (hasValidationErrors) {
      setMessage('Review the highlighted fields before saving.')
      return
    }

    setIsSubmitting(true)
    try {
      const response = await resetPassword({
        email: form.email.trim(),
        token,
        newPassword: form.newPassword,
        confirmPassword: form.confirmPassword,
      })

      if (response.ok) {
        setMessage(null)
        showToast('Password reset successfully. You can now sign in with your new password.')
        setTimeout(() => navigate('/login', { replace: true }), 1200)
        return
      }

      if (response.errors) {
        setServerErrors(normalizeErrors(response.errors))
      }
      setMessage(response.message || 'Unable to reset password.')
    } catch (err) {
      console.error('Password reset error:', err)
      setMessage(
        err instanceof TypeError
          ? 'Cannot reach the password reset service. Please try again later.'
          : err?.message || 'Unable to reset password.',
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

                <CForm onSubmit={handleSubmit} noValidate>
                  <p className="text-body-secondary mb-3">
                    Set a new password for your KIJO account.
                  </p>

                  {message && (
                    <p id={messageId} className="text-body-secondary mb-3" aria-live="polite">
                      {message}
                    </p>
                  )}

                  <div className="mb-3">
                    <CFormLabel htmlFor="resetEmail">Email address</CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>
                        <CIcon icon={cilUser} />
                      </CInputGroupText>
                      <CFormInput
                        id="resetEmail"
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        autoComplete="email"
                        required
                        invalid={Boolean(visibleErrors.email)}
                        aria-invalid={Boolean(visibleErrors.email) || undefined}
                        aria-describedby={
                          visibleErrors.email ? 'resetEmail-error' : message ? messageId : undefined
                        }
                      />
                      <CFormFeedback id="resetEmail-error" invalid>
                        {visibleErrors.email}
                      </CFormFeedback>
                    </CInputGroup>
                  </div>

                  <div className="mb-3">
                    <CFormLabel htmlFor="resetNewPassword">New password</CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        id="resetNewPassword"
                        type={showNewPassword ? 'text' : 'password'}
                        name="newPassword"
                        value={form.newPassword}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
                        maxLength={PASSWORD_MAX_LENGTH}
                        required
                        invalid={Boolean(visibleErrors.newPassword)}
                        aria-invalid={Boolean(visibleErrors.newPassword) || undefined}
                        aria-describedby={
                          visibleErrors.newPassword
                            ? 'resetNewPassword-error'
                            : message
                              ? messageId
                              : undefined
                        }
                      />
                      <PasswordVisibilityButton
                        visible={showNewPassword}
                        onToggle={() => setShowNewPassword((prev) => !prev)}
                        showLabel="Show new password"
                        hideLabel="Hide new password"
                      />
                      <CFormFeedback id="resetNewPassword-error" invalid>
                        {visibleErrors.newPassword}
                      </CFormFeedback>
                    </CInputGroup>
                  </div>

                  <div className="mb-4">
                    <CFormLabel htmlFor="resetConfirmPassword">Confirm password</CFormLabel>
                    <CInputGroup>
                      <CInputGroupText>
                        <CIcon icon={cilLockLocked} />
                      </CInputGroupText>
                      <CFormInput
                        id="resetConfirmPassword"
                        type={showConfirmPassword ? 'text' : 'password'}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleInputChange}
                        onBlur={handleBlur}
                        autoComplete="new-password"
                        minLength={PASSWORD_MIN_LENGTH}
                        maxLength={PASSWORD_MAX_LENGTH}
                        required
                        invalid={Boolean(visibleErrors.confirmPassword)}
                        aria-invalid={Boolean(visibleErrors.confirmPassword) || undefined}
                        aria-describedby={
                          visibleErrors.confirmPassword
                            ? 'resetConfirmPassword-error'
                            : message
                              ? messageId
                              : undefined
                        }
                      />
                      <PasswordVisibilityButton
                        visible={showConfirmPassword}
                        onToggle={() => setShowConfirmPassword((prev) => !prev)}
                        showLabel="Show confirm password"
                        hideLabel="Hide confirm password"
                      />
                      <CFormFeedback id="resetConfirmPassword-error" invalid>
                        {visibleErrors.confirmPassword}
                      </CFormFeedback>
                    </CInputGroup>
                  </div>

                  <div className="d-flex justify-content-end">
                    <CButton type="submit" color="primary" size="sm" disabled={isSubmitting}>
                      {isSubmitting && <CSpinner size="sm" className="me-2" />}
                      {isSubmitting ? 'Resetting...' : 'Reset password'}
                    </CButton>
                  </div>
                </CForm>

                <p className="text-body-secondary text-center small mt-4 mb-0">
                  <Link to="/login" className="text-decoration-none">
                    Back to sign in
                  </Link>
                </p>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      </CContainer>
    </div>
  )
}

export default PasswordReset
