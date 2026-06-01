import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { CButton, CCard, CCardBody, CCardHeader, CCol, CRow, CSpinner } from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'
import { fetchDetailJson } from '../../../utils/detailPages'

const renderField = (label, value) => (
  <div className="records-detail-field">
    <div className="small text-muted">{label}</div>
    <div>{value ?? '-'}</div>
  </div>
)

export default function StaffDetailPage() {
  const { staffId } = useParams()
  const navigate = useNavigate()
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    setLoading(true)
    setError(null)
    fetchDetailJson(`${import.meta.env.VITE_API_BASE}hr/staff/${encodeURIComponent(staffId)}`, {
      notFoundMessage: 'Staff record not found.',
    })
      .then((detailResult) => {
        if (!isMounted) return
        if (detailResult.notFound) {
          setDetail(null)
          return
        }
        const result = detailResult.data
        if (result.status === 'success') setDetail(result.data)
        else setError(result.message || 'Failed to load staff details.')
      })
      .catch((err) => {
        if (isMounted) setError(err?.message || 'Server error loading staff details.')
      })
      .finally(() => {
        if (isMounted) setLoading(false)
      })

    return () => {
      isMounted = false
    }
  }, [staffId])

  const handleEdit = () => navigate(`/staff/create?edit_id=${staffId}`)

  const handleTerminate = async () => {
    if (
      !(await dialog.confirm('Are you sure? This cannot be undone.', {
        confirmText: 'Terminate',
        confirmColor: 'danger',
      }))
    )
      return
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}hr/staff/${encodeURIComponent(staffId)}/terminate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ staff_id: staffId }),
        },
      )
      const result = await res.json()
      if (result.status === 'success') {
        dialog.alert('Staff terminated successfully.')
        navigate('/staff/manage')
      } else {
        dialog.alert(`Failed: ${result.message}`)
      }
    } catch {
      dialog.alert('Server error during termination.')
    }
  }

  const roleDisplay = Array.isArray(detail?.user?.role)
    ? detail.user.role.join(', ')
    : detail?.user?.role

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2">
            <strong>Staff Details</strong>
            <CButton
              size="sm"
              color="secondary"
              variant="outline"
              onClick={() => navigate('/staff/manage')}
            >
              Back
            </CButton>
          </CCardHeader>

          {loading && (
            <CCardBody>
              <div className="text-center py-4 text-muted">
                <CSpinner size="sm" className="me-2" />
                Loading details...
              </div>
            </CCardBody>
          )}

          {!loading && error && (
            <CCardBody>
              <div className="text-center py-4 text-danger">{error}</div>
            </CCardBody>
          )}

          {!loading && !error && !detail && (
            <CCardBody>
              <div className="text-center py-4 text-muted">Staff record not found.</div>
            </CCardBody>
          )}

          {!loading && !error && detail && (
            <>
              <CCardHeader>
                <strong>General Information</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    {renderField('Full Name', detail.general?.full_name)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Email', detail.general?.email)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Mobile Number', detail.general?.mobile_number)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Position', detail.general?.position)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('CRM Position', detail.general?.crm_position || 'N/A')}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Department', detail.general?.department)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Start Date', detail.general?.start_date)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Status', detail.general?.status)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Name Code', detail.general?.name_code)}
                  </CCol>
                </CRow>
              </CCardBody>

              <CCardHeader>
                <strong>System Access</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    {renderField('Role', roleDisplay)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Created At', detail.user?.created_at)}
                  </CCol>
                </CRow>
              </CCardBody>

              <CCardHeader>
                <strong>Staff Profile</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    {renderField('NRIC', detail.profile?.nric)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Birth Date', detail.profile?.birth_date)}
                  </CCol>
                  <CCol xs={12}>
                    {renderField('Current Address', detail.profile?.current_address)}
                  </CCol>
                </CRow>
              </CCardBody>

              <CCardHeader>
                <strong>Emergency Contact 1</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    {renderField('Name', detail.profile?.emergency_name1)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Relationship', detail.profile?.emergency_relationship1)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Phone', detail.profile?.emergency_phone1)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Address', detail.profile?.emergency_address1)}
                  </CCol>
                </CRow>
              </CCardBody>

              <CCardHeader>
                <strong>Emergency Contact 2</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    {renderField('Name', detail.profile?.emergency_name2)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Relationship', detail.profile?.emergency_relationship2)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Phone', detail.profile?.emergency_phone2)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Address', detail.profile?.emergency_address2)}
                  </CCol>
                </CRow>
              </CCardBody>

              <CCardHeader>
                <strong>Health Information</strong>
              </CCardHeader>
              <CCardBody>
                <CRow className="g-3">
                  <CCol xs={12} md={6}>
                    {renderField('Chronic Illness', detail.profile?.chronic_illness)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Allergies', detail.profile?.allergies)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Disabilities', detail.profile?.disabilities)}
                  </CCol>
                  <CCol xs={12} md={6}>
                    {renderField('Current Medication', detail.profile?.current_medication)}
                  </CCol>
                  <CCol xs={12}>
                    {renderField('Other Concerns', detail.profile?.other_concerns)}
                  </CCol>
                </CRow>
              </CCardBody>

              <CCardHeader>
                <strong>Actions</strong>
              </CCardHeader>
              <CCardBody>
                <div className="d-flex flex-wrap gap-2">
                  <CButton color="primary" variant="outline" size="sm" onClick={handleEdit}>
                    Edit
                  </CButton>
                  {detail.general?.status !== 'Inactive' && (
                    <CButton color="danger" variant="outline" size="sm" onClick={handleTerminate}>
                      Terminate
                    </CButton>
                  )}
                </div>
              </CCardBody>
            </>
          )}
        </CCard>
      </CCol>
    </CRow>
  )
}
