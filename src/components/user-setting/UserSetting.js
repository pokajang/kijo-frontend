import React, { useState } from 'react'
import {
  CRow,
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CFormLabel,
  CFormInput,
  CButton,
  CInputGroup,
  CAlert,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'

import CIcon from '@coreui/icons-react'
import { cilToggleOff, cilToggleOn } from '@coreui/icons'
import dialog from '../dialog/dialogService'
const UserSetting = ({ closeModal }) => {
  const navigate = useNavigate()
  // Unified toggle for all password visibility
  const [showPassword, setShowPassword] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.newPassword !== formData.confirmPassword) {
      dialog.alert('New passwords do not match.')
      return
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}auth/password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })

      const result = await res.json()

      if (result.status === 'success') {
        // 1. Show success alert
        setSuccessMessage(
          '✅ Password updated. You will be automatically logged out. Log in with your new credentials.',
        )

        // 2. Clear fields
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        })

        // 3. Trigger logout after delay
        setTimeout(async () => {
          await fetch(`${import.meta.env.VITE_API_BASE}auth/logout`, {
            method: 'POST',
            credentials: 'include',
          })
          navigate('/login', { replace: true })
        }, 3000) // 3 seconds delay
      } else {
        dialog.alert('❌ ' + result.message)
      }
    } catch (err) {
      console.error('Update failed:', err)
      dialog.alert('❌ Failed to update settings.')
    }
  }

  const handleCancel = () => {
    if (closeModal) closeModal() // ✅ close the modal
  }

  return (
    <CRow className="justify-content-center">
      <CCol xs={12}>
        {/* <CCard> */}
        {/* <CCardHeader><strong>User Settings</strong></CCardHeader> */}
        {/* <CCardBody> */}
        <CForm onSubmit={handleSubmit}>
          {/* Password Fields */}
          <CRow className="mb-3">
            <CCol xs={12} md={4} className="mb-2">
              <CFormLabel htmlFor="currentPassword">Current Password</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type={showPassword ? 'text' : 'password'}
                  id="currentPassword"
                  name="currentPassword"
                  placeholder="Enter current password"
                  value={formData.currentPassword}
                  onChange={handleChange}
                  autoComplete="current-password"
                />
              </CInputGroup>
            </CCol>

            <CCol xs={12} md={4} className="mb-2">
              <CFormLabel htmlFor="newPassword">New Password</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type={showPassword ? 'text' : 'password'}
                  id="newPassword"
                  name="newPassword"
                  placeholder="Enter new password"
                  value={formData.newPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </CInputGroup>
            </CCol>

            <CCol xs={12} md={4}>
              <CFormLabel htmlFor="confirmPassword">Confirm New Password</CFormLabel>
              <CInputGroup>
                <CFormInput
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  placeholder="Re-enter new password"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  autoComplete="new-password"
                />
              </CInputGroup>
            </CCol>
          </CRow>

          {/* Toggle Button (Affects All Password Fields) */}
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

          {/* Action Buttons */}
          <CRow className="mt-2 justify-content-start g-2">
            <CCol xs="auto">
              <CButton color="primary" type="submit">
                Update Settings
              </CButton>
            </CCol>
            <CCol xs="auto">
              <CButton color="secondary" type="reset" onClick={handleCancel}>
                Cancel
              </CButton>
            </CCol>
          </CRow>
        </CForm>

        {successMessage && (
          <CAlert color="primary" className="mt-3">
            <strong>{successMessage}</strong>
          </CAlert>
        )}

        {/* </CCardBody> */}
        {/* </CCard> */}
      </CCol>
    </CRow>
  )
}

export default UserSetting
