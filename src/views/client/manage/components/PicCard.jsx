import React from 'react'
import { CCard, CCardBody, CCol, CForm, CFormLabel, CFormInput, CButton } from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash } from '@coreui/icons'

const PicCard = ({
  pic,
  source,
  index,
  isEditing,
  editForm,
  onEditFormChange,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onDelete,
}) => {
  const isNew = source === 'new'

  if (isEditing) {
    return (
      <CCard className="mb-2">
        <CCardBody>
          <CForm className="row g-3">
            <CCol md={3}>
              <CFormLabel>Full Name</CFormLabel>
              <CFormInput
                value={editForm.full_name}
                onChange={(e) => onEditFormChange('full_name', e.target.value)}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Email</CFormLabel>
              <CFormInput
                value={editForm.email}
                onChange={(e) => onEditFormChange('email', e.target.value)}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Mobile Number</CFormLabel>
              <CFormInput
                value={editForm.mobile_number}
                onChange={(e) => onEditFormChange('mobile_number', e.target.value)}
              />
            </CCol>
            <CCol md={3}>
              <CFormLabel>Position</CFormLabel>
              <CFormInput
                value={editForm.position}
                onChange={(e) => onEditFormChange('position', e.target.value)}
              />
            </CCol>
            <CCol xs={12} className="d-flex justify-content-end gap-2">
              <CButton size="sm" color="secondary" variant="outline" onClick={onCancelEdit}>
                Cancel
              </CButton>
              <CButton size="sm" color="primary" onClick={onSaveEdit}>
                Save
              </CButton>
            </CCol>
          </CForm>
        </CCardBody>
      </CCard>
    )
  }

  return (
    <CCard className="mb-2">
      <CCardBody className="p-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
        <div className="d-flex flex-wrap align-items-center gap-2">
          <strong>{pic.full_name || '-'}</strong>
          {pic.position && <span className="text-muted">({pic.position})</span>}
          {pic.email && <small>{pic.email}</small>}
          {pic.mobile_number && <small>{pic.mobile_number}</small>}
          {isNew && <span className="badge bg-info text-light">New</span>}
        </div>
        <div className="d-flex align-items-center gap-2">
          <CButton
            size="sm"
            color="link"
            className="p-0 border-0 bg-transparent text-primary"
            title="Edit PIC"
            onClick={() => onStartEdit(source, index, pic)}
          >
            <CIcon icon={cilPencil} size="sm" />
          </CButton>
          <CButton
            size="sm"
            color="link"
            className="p-0 border-0 bg-transparent text-danger"
            title={isNew ? 'Remove new PIC' : 'Unassign PIC'}
            onClick={() => onDelete(source, index)}
          >
            <CIcon icon={cilTrash} size="sm" />
          </CButton>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default PicCard
