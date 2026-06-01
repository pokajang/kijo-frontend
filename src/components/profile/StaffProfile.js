import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCol,
  CForm,
  CFormFeedback,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CRow,
  CSpinner,
} from '@coreui/react'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

const initialProfileState = {
  fullName: '',
  email: '',
  mobileNumber: '',
  birthDate: '',
  nric: '',
  currentAddress: '',
  nameCode: '',
  crmPosition: '',
  emergencyName1: '',
  emergencyRelationship1: '',
  emergencyPhone1: '',
  emergencyAddress1: '',
  emergencyName2: '',
  emergencyRelationship2: '',
  emergencyPhone2: '',
  emergencyAddress2: '',
  chronicIllness: '',
  allergies: '',
  disabilities: '',
  currentMedication: '',
  otherConcerns: '',
}

const requiredFields = [
  'fullName',
  'mobileNumber',
  'birthDate',
  'nric',
  'currentAddress',
  'emergencyName1',
  'emergencyRelationship1',
  'emergencyPhone1',
  'emergencyAddress1',
]

const editableProfileFields = [
  'fullName',
  'mobileNumber',
  'birthDate',
  'nric',
  'currentAddress',
  'crmPosition',
  'emergencyName1',
  'emergencyRelationship1',
  'emergencyPhone1',
  'emergencyAddress1',
  'emergencyName2',
  'emergencyRelationship2',
  'emergencyPhone2',
  'emergencyAddress2',
  'chronicIllness',
  'allergies',
  'disabilities',
  'currentMedication',
  'otherConcerns',
]

const maxLengths = {
  fullName: 255,
  mobileNumber: 30,
  nric: 40,
  currentAddress: 1000,
  crmPosition: 150,
  emergencyName1: 255,
  emergencyRelationship1: 255,
  emergencyPhone1: 30,
  emergencyAddress1: 1000,
  emergencyName2: 255,
  emergencyRelationship2: 255,
  emergencyPhone2: 30,
  emergencyAddress2: 1000,
  chronicIllness: 1000,
  allergies: 1000,
  disabilities: 1000,
  currentMedication: 1000,
  otherConcerns: 1000,
}

const fieldLabels = {
  fullName: 'Full Name',
  email: 'Email',
  mobileNumber: 'Phone Number',
  birthDate: 'Date of Birth',
  nric: 'IC Number',
  currentAddress: 'Current Address',
  nameCode: 'Name Code',
  crmPosition: 'CRM Sales Position',
  emergencyName1: 'Emergency Contact Name',
  emergencyRelationship1: 'Emergency Contact Relationship',
  emergencyPhone1: 'Emergency Contact Phone',
  emergencyAddress1: 'Emergency Contact Address',
  emergencyName2: 'Second Emergency Contact Name',
  emergencyRelationship2: 'Second Emergency Contact Relationship',
  emergencyPhone2: 'Second Emergency Contact Phone',
  emergencyAddress2: 'Second Emergency Contact Address',
  chronicIllness: 'Chronic Illness',
  allergies: 'Known Allergies',
  disabilities: 'Disabilities/Impairments',
  currentMedication: 'Current Medications',
  otherConcerns: 'Other Concerns / Notes',
}

export const isStaffProfileComplete = (profile = {}) =>
  requiredFields.every((key) => String(profile[key] || '').trim() !== '')

const mapProfile = (p = {}) => ({
  fullName: p.full_name || '',
  email: p.email || '',
  mobileNumber: p.mobile_number || '',
  birthDate: p.birth_date || '',
  nric: p.nric || '',
  currentAddress: p.current_address || '',
  nameCode: p.name_code || '',
  crmPosition: p.crm_position || '',
  emergencyName1: p.emergency_name1 || '',
  emergencyRelationship1: p.emergency_relationship1 || '',
  emergencyPhone1: p.emergency_phone1 || '',
  emergencyAddress1: p.emergency_address1 || '',
  emergencyName2: p.emergency_name2 || '',
  emergencyRelationship2: p.emergency_relationship2 || '',
  emergencyPhone2: p.emergency_phone2 || '',
  emergencyAddress2: p.emergency_address2 || '',
  chronicIllness: p.chronic_illness || '',
  allergies: p.allergies || '',
  disabilities: p.disabilities || '',
  currentMedication: p.current_medication || '',
  otherConcerns: p.other_concerns || '',
})

const normalizeErrors = (errors = {}) =>
  Object.fromEntries(
    Object.entries(errors).map(([key, value]) => [
      key,
      Array.isArray(value) ? value.join(' ') : String(value || ''),
    ]),
  )

const normalizeProfileValue = (value) => String(value ?? '').trim()

const buildProfilePayload = (profile) =>
  Object.fromEntries(editableProfileFields.map((key) => [key, normalizeProfileValue(profile[key])]))

const validateProfile = (profile) => {
  const nextErrors = {}

  requiredFields.forEach((key) => {
    if (!String(profile[key] || '').trim()) {
      nextErrors[key] = `${fieldLabels[key] || 'This field'} is required.`
    }
  })

  Object.entries(maxLengths).forEach(([key, max]) => {
    const value = normalizeProfileValue(profile[key])
    if (value.length > max) {
      nextErrors[key] = `${fieldLabels[key] || 'This field'} must be ${max} characters or fewer.`
    }
  })

  if (profile.birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(profile.birthDate)) {
    nextErrors.birthDate = 'Use YYYY-MM-DD format.'
  }

  return nextErrors
}

const formatDisplayValue = (value) => {
  const normalized = String(value || '').trim()
  return normalized || 'Not provided'
}

const FormField = ({
  as = 'input',
  editing,
  label,
  name,
  onChange,
  profile,
  readOnly = false,
  required = false,
  rows = 3,
  type = 'text',
  validationErrors,
}) => {
  const invalid = Boolean(validationErrors[name])
  const errorId = `${name}-error`
  const describedBy = invalid ? errorId : undefined
  const value = profile[name] || ''
  const commonProps = {
    id: name,
    name,
    value,
    onChange,
    invalid,
    maxLength: maxLengths[name],
    required: required || undefined,
    'aria-describedby': describedBy,
    'aria-invalid': invalid || undefined,
  }

  return (
    <>
      <CFormLabel htmlFor={name} className="account-field-label">
        {label}
        {editing && required && <span className="account-required-marker">Required</span>}
      </CFormLabel>
      {!editing || readOnly ? (
        <div
          id={name}
          className={`account-value-display${formatDisplayValue(value) === 'Not provided' ? ' is-empty' : ''}`}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
        >
          {formatDisplayValue(value)}
        </div>
      ) : as === 'textarea' ? (
        <CFormTextarea {...commonProps} rows={rows} />
      ) : (
        <CFormInput {...commonProps} type={type} />
      )}
      <CFormFeedback id={errorId} invalid>
        {validationErrors[name]}
      </CFormFeedback>
    </>
  )
}

const ProfileSection = ({ children, title }) => (
  <section className="account-form-section">
    <div className="account-section-header-row">
      <strong>{title}</strong>
    </div>
    {children}
  </section>
)

const ProfileFieldCol = ({ children, className = '', ...props }) => (
  <CCol {...props} className={['account-profile-field-col', className].filter(Boolean).join(' ')}>
    {children}
  </CCol>
)

const StaffProfile = ({ onStatusChange }) => {
  const [profileDetails, setProfileDetails] = useState(initialProfileState)
  const [savedProfileDetails, setSavedProfileDetails] = useState(initialProfileState)
  const [validationErrors, setValidationErrors] = useState({})
  const [notice, setNotice] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)

  const isDirty = useMemo(
    () => JSON.stringify(profileDetails) !== JSON.stringify(savedProfileDetails),
    [profileDetails, savedProfileDetails],
  )
  const profileComplete = useMemo(() => isStaffProfileComplete(profileDetails), [profileDetails])

  useEffect(() => {
    if (loading || loadError) return
    onStatusChange?.({ profileComplete })
  }, [loadError, loading, onStatusChange, profileComplete])

  const fetchProfile = useCallback(
    async ({ ignore = () => false } = {}) => {
      setLoading(true)
      setNotice(null)
      setLoadError('')
      try {
        const res = await fetch(`${API_BASE}staff/profile`, {
          credentials: 'include',
        })
        const result = await res.json()
        if (!res.ok || result.status !== 'success' || !result.profile) {
          throw new Error(result.message || 'Profile could not be loaded.')
        }

        if (ignore()) return
        const nextProfile = mapProfile(result.profile)
        setProfileDetails(nextProfile)
        setSavedProfileDetails(nextProfile)
        setValidationErrors({})
        setEditing(false)
        onStatusChange?.({ profileComplete: isStaffProfileComplete(nextProfile) })
      } catch (error) {
        if (ignore()) return
        setLoadError(error.message || 'Unexpected error while loading your profile.')
        onStatusChange?.({ profileComplete: 'unavailable' })
      } finally {
        if (!ignore()) setLoading(false)
      }
    },
    [onStatusChange],
  )

  useEffect(() => {
    let ignore = false

    fetchProfile({ ignore: () => ignore })

    return () => {
      ignore = true
    }
  }, [fetchProfile])

  const handleProfileChange = (e) => {
    const { name, value } = e.target
    setNotice(null)
    setProfileDetails((prev) => ({ ...prev, [name]: value }))
    setValidationErrors((prev) => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault()
    const nextErrors = validateProfile(profileDetails)
    if (Object.keys(nextErrors).length) {
      setValidationErrors(nextErrors)
      setNotice({ color: 'warning', message: 'Review the highlighted fields before saving.' })
      return
    }

    setSaving(true)
    setNotice(null)
    const payload = buildProfilePayload(profileDetails)
    try {
      const res = await fetch(`${API_BASE}staff/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })
      const result = await res.json()
      if (!res.ok || result.status !== 'success') {
        if (result.errors) {
          setValidationErrors(normalizeErrors(result.errors))
        }
        throw new Error(result.message || 'Failed to update profile.')
      }

      const nextSavedProfile = { ...profileDetails, ...payload }
      setProfileDetails(nextSavedProfile)
      setSavedProfileDetails(nextSavedProfile)
      setValidationErrors({})
      setEditing(false)
      setNotice({ color: 'success', message: 'Profile saved.' })
      onStatusChange?.({ profileComplete: isStaffProfileComplete(nextSavedProfile) })
    } catch (error) {
      setNotice({
        color: 'danger',
        message: error.message || 'Unexpected error. Please try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDiscardProfile = () => {
    setProfileDetails(savedProfileDetails)
    setValidationErrors({})
    setNotice(null)
    setEditing(false)
  }

  const handleEditProfile = () => {
    setNotice(null)
    setValidationErrors({})
    setEditing(true)
  }

  if (loading) {
    return (
      <CCard className="account-card records-page-card">
        <CCardBody className="account-loading-state">
          <CSpinner size="sm" aria-hidden="true" />
          <span>Loading profile...</span>
        </CCardBody>
      </CCard>
    )
  }

  if (loadError) {
    return (
      <CCard className="account-card records-page-card">
        <CCardBody className="records-page-card-body">
          <CAlert color="danger" className="mb-3" aria-live="assertive">
            {loadError}
          </CAlert>
          <CButton color="primary" size="sm" type="button" onClick={() => fetchProfile()}>
            Retry
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard className="account-card records-page-card">
      <CCardBody className="records-page-card-body account-profile-card-body">
        {notice && (
          <CAlert color={notice.color} className="mb-3" aria-live="polite">
            {notice.message}
          </CAlert>
        )}
        {!profileComplete && (
          <CAlert color="warning" className="mb-3">
            Complete the required profile and emergency contact fields to keep HR records current.
          </CAlert>
        )}

        <CForm
          className={`account-profile-form ${
            editing ? 'account-profile-form--edit' : 'account-profile-form--read'
          }`}
          onSubmit={handleUpdateProfile}
          noValidate
        >
          <ProfileSection title="General Information">
            <CRow className="g-3">
              <ProfileFieldCol md={6}>
                <FormField
                  label="Full Name"
                  name="fullName"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                  required
                />
              </ProfileFieldCol>
              <ProfileFieldCol md={6}>
                <FormField
                  label="Email"
                  name="email"
                  type="email"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                  readOnly
                />
              </ProfileFieldCol>
              <ProfileFieldCol md={4}>
                <FormField
                  label="Phone Number"
                  name="mobileNumber"
                  type="tel"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                  required
                />
              </ProfileFieldCol>
              <ProfileFieldCol md={4}>
                <FormField
                  label="Date of Birth"
                  name="birthDate"
                  type="date"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                  required
                />
              </ProfileFieldCol>
              <ProfileFieldCol md={4}>
                <FormField
                  label="IC Number"
                  name="nric"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                  required
                />
              </ProfileFieldCol>
              <ProfileFieldCol xs={12}>
                <FormField
                  as="textarea"
                  label="Current Address"
                  name="currentAddress"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                  required
                />
              </ProfileFieldCol>
            </CRow>
          </ProfileSection>

          <ProfileSection title="Identity">
            <CRow className="g-3">
              <ProfileFieldCol md={6}>
                <FormField
                  label="Name Code"
                  name="nameCode"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                  readOnly
                />
              </ProfileFieldCol>
              <ProfileFieldCol md={6}>
                <FormField
                  label="CRM Sales Position"
                  name="crmPosition"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                />
              </ProfileFieldCol>
            </CRow>
          </ProfileSection>

          <ProfileSection title="Emergency Contacts">
            {[1, 2].map((index) => (
              <div key={index} className="account-contact-group">
                <div className="account-contact-title">Person {index}</div>
                <CRow className="g-3">
                  <ProfileFieldCol md={6}>
                    <FormField
                      label="Full Name"
                      name={`emergencyName${index}`}
                      profile={profileDetails}
                      onChange={handleProfileChange}
                      validationErrors={validationErrors}
                      editing={editing}
                      required={index === 1}
                    />
                  </ProfileFieldCol>
                  <ProfileFieldCol md={6}>
                    <FormField
                      label="Relationship"
                      name={`emergencyRelationship${index}`}
                      profile={profileDetails}
                      onChange={handleProfileChange}
                      validationErrors={validationErrors}
                      editing={editing}
                      required={index === 1}
                    />
                  </ProfileFieldCol>
                  <ProfileFieldCol md={6}>
                    <FormField
                      label="Phone Number"
                      name={`emergencyPhone${index}`}
                      type="tel"
                      profile={profileDetails}
                      onChange={handleProfileChange}
                      validationErrors={validationErrors}
                      editing={editing}
                      required={index === 1}
                    />
                  </ProfileFieldCol>
                  <ProfileFieldCol md={6}>
                    <FormField
                      as="textarea"
                      label="Address"
                      name={`emergencyAddress${index}`}
                      rows={2}
                      profile={profileDetails}
                      onChange={handleProfileChange}
                      validationErrors={validationErrors}
                      editing={editing}
                      required={index === 1}
                    />
                  </ProfileFieldCol>
                </CRow>
              </div>
            ))}
          </ProfileSection>

          <ProfileSection title="Health & Medical">
            <CRow className="g-3">
              <ProfileFieldCol md={6}>
                <FormField
                  label="Chronic Illness"
                  name="chronicIllness"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                />
              </ProfileFieldCol>
              <ProfileFieldCol md={6}>
                <FormField
                  label="Known Allergies"
                  name="allergies"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                />
              </ProfileFieldCol>
              <ProfileFieldCol md={6}>
                <FormField
                  label="Disabilities/Impairments"
                  name="disabilities"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                />
              </ProfileFieldCol>
              <ProfileFieldCol md={6}>
                <FormField
                  label="Current Medications"
                  name="currentMedication"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                />
              </ProfileFieldCol>
              <ProfileFieldCol xs={12}>
                <FormField
                  as="textarea"
                  label="Other Concerns / Notes"
                  name="otherConcerns"
                  profile={profileDetails}
                  onChange={handleProfileChange}
                  validationErrors={validationErrors}
                  editing={editing}
                />
              </ProfileFieldCol>
            </CRow>
          </ProfileSection>

          <div className="account-form-actions">
            {editing ? (
              <>
                <CButton color="primary" type="submit" size="sm" disabled={!isDirty || saving}>
                  {saving ? 'Saving...' : 'Save Changes'}
                </CButton>
                <CButton
                  color="secondary"
                  variant="outline"
                  type="button"
                  size="sm"
                  onClick={handleDiscardProfile}
                  disabled={saving}
                >
                  Cancel
                </CButton>
              </>
            ) : (
              <CButton
                color="primary"
                variant="outline"
                type="button"
                size="sm"
                onClick={handleEditProfile}
              >
                Edit
              </CButton>
            )}
          </div>
        </CForm>
      </CCardBody>
    </CCard>
  )
}

export default StaffProfile
