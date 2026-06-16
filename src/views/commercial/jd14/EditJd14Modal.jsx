import React, { useEffect, useState } from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CModal,
  CModalBody,
  CModalFooter,
  CModalHeader,
  CModalTitle,
  CRow,
} from '@coreui/react'
import dialog from '../../../components/dialog/dialogService'
import { showToast } from '../../../components/toast/toastService'

const EditJd14Modal = ({ visible, formData, onClose, onSaved }) => {
  const [form, setForm] = useState({})

  useEffect(() => {
    setForm(formData || {})
  }, [formData])

  const handleChange = (field) => (event) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }))
  }

  const handleSubmit = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_API_BASE}jd14-forms/${encodeURIComponent(form.id)}`,
        {
          method: 'PUT',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        },
      )

      const result = await res.json()

      if (result.status === 'success') {
        showToast('JD14 record updated.')
        await onSaved?.()
        onClose()
      } else {
        dialog.alert(result.message || 'Failed to update JD14 form.')
      }
    } catch (err) {
      console.error('Update JD14 Error:', err)
      dialog.alert('Error while updating JD14 form.')
    }
  }

  return (
    <CModal visible={visible} onClose={onClose} size="lg" backdrop="static" scrollable>
      <CModalHeader>
        <CModalTitle>Edit JD14 Form</CModalTitle>
      </CModalHeader>
      <CModalBody>
        <CForm>
          <CCard className="mb-3">
            <CCardHeader>
              <strong>Employer Details</strong>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol md={12}>
                  <CFormLabel>Employer Name</CFormLabel>
                  <CFormInput
                    value={form.employer_name || ''}
                    onChange={handleChange('employer_name')}
                  />
                </CCol>
              </CRow>
              <CRow className="mt-3">
                <CCol md={12}>
                  <CFormLabel>Employer Address</CFormLabel>
                  <CFormTextarea
                    rows={2}
                    value={form.employer_address || ''}
                    onChange={handleChange('employer_address')}
                  />
                </CCol>
              </CRow>
              <CRow className="mt-3">
                <CCol md={4}>
                  <CFormLabel>Approval No</CFormLabel>
                  <CFormInput
                    value={form.approval_no || ''}
                    onChange={handleChange('approval_no')}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Employer Code</CFormLabel>
                  <CFormInput
                    value={form.employer_code || ''}
                    onChange={handleChange('employer_code')}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel>Group Approved</CFormLabel>
                  <CFormInput
                    value={form.group_approved || ''}
                    onChange={handleChange('group_approved')}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel>Group Claimed</CFormLabel>
                  <CFormInput
                    value={form.group_claimed || ''}
                    onChange={handleChange('group_claimed')}
                  />
                </CCol>
              </CRow>
            </CCardBody>
            <CCardHeader>
              <strong>Training Details</strong>
            </CCardHeader>
            <CCardBody>
              <CRow>
                <CCol md={12}>
                  <CFormLabel>Training Venue</CFormLabel>
                  <CFormInput
                    value={form.training_venue || ''}
                    onChange={handleChange('training_venue')}
                  />
                </CCol>
              </CRow>
              <CRow className="mt-3">
                <CCol md={12}>
                  <CFormLabel>Course Title</CFormLabel>
                  <CFormInput
                    value={form.course_title || ''}
                    onChange={handleChange('course_title')}
                  />
                </CCol>
              </CRow>
              <CRow className="mt-3">
                <CCol md={6}>
                  <CFormLabel>Commenced Date</CFormLabel>
                  <CFormInput
                    type="date"
                    value={form.commenced_date || ''}
                    onChange={handleChange('commenced_date')}
                  />
                </CCol>
                <CCol md={6}>
                  <CFormLabel>End Date</CFormLabel>
                  <CFormInput
                    type="date"
                    value={form.end_date || ''}
                    onChange={handleChange('end_date')}
                  />
                </CCol>
              </CRow>
              <CRow className="mt-3">
                <CCol md={4}>
                  <CFormLabel>No. of Trainee(s)</CFormLabel>
                  <CFormInput
                    type="number"
                    value={form.no_of_pax || ''}
                    onChange={handleChange('no_of_pax')}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Total Fee Approved (RM)</CFormLabel>
                  <CFormInput
                    type="number"
                    value={form.total_fee_approved || ''}
                    onChange={handleChange('total_fee_approved')}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel>Total Fee Claimed (RM)</CFormLabel>
                  <CFormInput
                    type="number"
                    value={form.total_fee_claimed || ''}
                    onChange={handleChange('total_fee_claimed')}
                  />
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>
        </CForm>
      </CModalBody>
      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={handleSubmit}>
          Save Changes
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default EditJd14Modal
