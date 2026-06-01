import React, { useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CInputGroup,
  CRow,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'
import CIcon from '@coreui/icons-react'
import { cilToggleOff, cilToggleOn } from '@coreui/icons'

const API_BASE = import.meta.env.VITE_API_BASE || '/'
const PASSWORD_MIN_LENGTH = 12
const PASSWORD_MAX_LENGTH = 128

const initialFormData = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
}

const normalizeErrors = (errors = {}) =>
  Object.fromEntries(
    Object.entries(errors).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(' ') : String(value || ''),
    ]),
  )

const validatePasswordForm = (formData) => {
  const errors = {}

  if (!formData.currentPassword) {
    errors.currentPassword = 'Current password is required.'
  }

  if (!formData.newPassword) {
    errors.newPassword = 'New password is required.'
  } else if (formData.newPassword.length < PASSWORD_MIN_LENGTH) {
    errors.newPassword = `Use at least ${PASSWORD_MIN_LENGTH} characters.`
  } else if (formData.newPassword.length > PASSWORD_MAX_LENGTH) {
    errors.newPassword = `Use ${PASSWORD_MAX_LENGTH} characters or fewer.`
  }

  if (!formData.confirmPassword) {
    errors.confirmPassword = 'Confirm your new password.'
  } else if (formData.newPassword !== formData.confirmPassword) {
    errors.confirmPassword = 'New passwords do not match.'
  }

  if (
    formData.currentPassword &&
    formData.newPassword &&
    formData.currentPassword === formData.newPassword
  ) {
    errors.newPassword = 'New password must be different from your current password.'
  }

  return errors
}

const PasswordField = ({
  autoComplete,
  errors,
  label,
  name,
  onBlur,
  onChange,
  disabled = false,
  showPassword,
  value,
}) => (
  <>
    <CFormLabel htmlFor={name} className="account-field-label">
      {label}
    </CFormLabel>
    <CInputGroup>
      <CFormInput
        type={showPassword ? 'text' : 'password'}
        id={name}
        name={name}
        value={value}
        onBlur={onBlur}
        onChange={onChange}
        autoComplete={autoComplete}
        invalid={Boolean(errors[name])}
        disabled={disabled}
        aria-invalid={Boolean(errors[name]) || undefined}
        aria-describedby={errors[name] ? `${name}-error` : undefined}
      />
      <CFormFeedback id={`${name}-error`} invalid>
        {errors[name]}
      </CFormFeedback>
    </CInputGroup>
  </>
)

const UserSetting = ({ closeModal }) => {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [notice, setNotice] = useState(null)
  const [saving, setSaving] = useState(false)
  const [redirecting, setRedirecting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState({})
  const [serverErrors, setServerErrors] = useState({})
  const [formData, setFormData] = useState(initialFormData)

  const validationErrors = useMemo(() => validatePasswordForm(formData), [formData])
  const touchedErrors = Object.fromEntries(
    Object.entries(validationErrors).filter(([field]) => touched[field]),
  )
  const visibleErrors = submitted
    ? { ...validationErrors, ...serverErrors }
    : { ...touchedErrors, ...serverErrors }
  const hasValidationErrors = Object.keys(validationErrors).length > 0
  const formDisabled = saving || redirecting

  const resetForm = () => {
    setFormData(initialFormData)
    setSubmitted(false)
    setTouched({})
    setServerErrors({})
    setNotice(null)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setNotice(null)
    setServerErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlur = (e) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitted(true)
    setNotice(null)

    if (hasValidationErrors) return

    setSaving(true)
    try {
      const res = await fetch(`${API_BASE}auth/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const result = await res.json()

      if (!res.ok || result.status !== 'success') {
        const nextErrors = normalizeErrors(result.errors || {})
        if (Object.keys(nextErrors).length) {
          setServerErrors(nextErrors)
          setSubmitted(true)
          setNotice({ color: 'warning', message: 'Review the highlighted fields before saving.' })
          return
        }
        throw new Error(result.message || 'Failed to update password.')
      }

      setNotice({
        color: 'success',
        message:
          'Password updated. You will be automatically logged out. Log in with your new credentials.',
      })
      setRedirecting(true)
      setFormData(initialFormData)
      setSubmitted(false)
      setTouched({})
      setServerErrors({})

      setTimeout(async () => {
        await fetch(`${API_BASE}auth/logout`, {
          method: 'POST',
          credentials: 'include',
        })
        navigate('/login', { replace: true })
      }, 3000)
    } catch (err) {
      setNotice({ color: 'danger', message: err.message || 'Failed to update password.' })
      setRedirecting(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    resetForm()
    closeModal?.()
  }

  return (
    <CCard className="account-card records-page-card">
      <CCardHeader className="account-card-header records-page-card-header">
        <div>
          <strong>Password</strong>
        </div>
      </CCardHeader>
      <CCardBody className="records-page-card-body">
        {notice && (
          <CAlert color={notice.color} className="mb-3" aria-live="polite">
            {notice.message}
          </CAlert>
        )}

        <CForm onSubmit={handleSubmit} noValidate>
          <CRow className="g-3">
            <CCol md={4}>
              <PasswordField
                label="Current Password"
                name="currentPassword"
                value={formData.currentPassword}
                onBlur={handleBlur}
                onChange={handleChange}
                disabled={formDisabled}
                showPassword={showPassword}
                autoComplete="current-password"
                errors={visibleErrors}
              />
            </CCol>
            <CCol md={4}>
              <PasswordField
                label="New Password"
                name="newPassword"
                value={formData.newPassword}
                onBlur={handleBlur}
                onChange={handleChange}
                disabled={formDisabled}
                showPassword={showPassword}
                autoComplete="new-password"
                errors={visibleErrors}
              />
            </CCol>
            <CCol md={4}>
              <PasswordField
                label="Confirm New Password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onBlur={handleBlur}
                onChange={handleChange}
                disabled={formDisabled}
                showPassword={showPassword}
                autoComplete="new-password"
                errors={visibleErrors}
              />
            </CCol>
          </CRow>

          <div className="account-password-tools">
            <button
              type="button"
              className="btn btn-link px-0 text-decoration-none d-inline-flex align-items-center gap-2"
              onClick={() => setShowPassword((prev) => !prev)}
              disabled={formDisabled}
              aria-pressed={showPassword}
              aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
            >
              <CIcon
                size="xl"
                icon={showPassword ? cilToggleOn : cilToggleOff}
                className={showPassword ? 'text-primary' : 'text-secondary'}
              />
              <span>{showPassword ? 'Hide Passwords' : 'Show Passwords'}</span>
            </button>
          </div>

          <div className="account-form-actions">
            <CButton
              color="primary"
              size="sm"
              type="submit"
              disabled={formDisabled || hasValidationErrors}
            >
              {redirecting ? 'Logging out...' : saving ? 'Saving...' : 'Update Password'}
            </CButton>
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              type="button"
              onClick={handleCancel}
              disabled={formDisabled}
            >
              Clear
            </CButton>
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

export default UserSetting
