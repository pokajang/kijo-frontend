// src/templates/create/CreateTemplate.js

import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CButton,
  CFormLabel,
  CAlert,
} from '@coreui/react'

import TrainingServiceTemplate from './TrainingServiceTemplate'
import IhServiceTemplate from './IhServiceTemplate'
import ManpowerServiceTemplate from './ManpowerServiceTemplate'
import SpecialTemplate from './SpecialTemplate'

const SERVICE_OPTIONS = [
  { key: 'training', label: 'Training Proposal', component: TrainingServiceTemplate },
  { key: 'ih', label: 'Industrial Hygiene Proposal', component: IhServiceTemplate },
  { key: 'manpower', label: 'Manpower Supply Proposal', component: ManpowerServiceTemplate },
  { key: 'special', label: 'Special Service Proposal', component: SpecialTemplate },
]

const CreateTemplate = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // parse URL params
  const params = new URLSearchParams(location.search)
  const type = params.get('type') || ''
  const isEdit = params.get('edit') === 'true'
  const editId = params.get('id') || null
  const returnTo = location.state?.returnTo || '/templates/proposals'

  // navigate to the selected type
  const selectService = (key) => {
    navigate(
      { pathname: location.pathname, search: `?type=${key}` },
      { replace: true, state: { returnTo } },
    )
  }

  // find the component for the current type
  const CurrentComponent = SERVICE_OPTIONS.find((opt) => opt.key === type)?.component

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <strong>{isEdit ? 'Editing' : 'Create'} Proposal Template</strong>
            <div className="d-flex flex-wrap gap-2">
              <CButton
                size="sm"
                color="info"
                variant="outline"
                onClick={() => navigate('/knowledge/how-to-create-a-proposal')}
              >
                Help
              </CButton>
              <CButton
                size="sm"
                color="secondary"
                variant="outline"
                onClick={() => navigate(returnTo)}
              >
                Back
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {/* show buttons only when NOT editing */}
            {!isEdit && (
              <CRow className="mb-3">
                <CCol xs={12} className="mb-2">
                  <CAlert color="primary" className="mb-0" dismissible>
                    Please check the existing proposals before creating a new one to avoid
                    duplicates.
                  </CAlert>
                </CCol>
                <CCol xs={12}>
                  <CFormLabel>Select Service</CFormLabel>
                  <div>
                    {SERVICE_OPTIONS.map((opt) => (
                      <CButton
                        variant="outline"
                        key={opt.key}
                        className="me-2 mb-2"
                        color={type === opt.key ? 'primary' : 'secondary'}
                        onClick={() => selectService(opt.key)}
                      >
                        {opt.label}
                      </CButton>
                    ))}
                  </div>
                </CCol>
              </CRow>
            )}

            {/* render the selected form */}
            {CurrentComponent && (
              <CurrentComponent
                key={isEdit ? `edit-${editId}` : `create-${type}`}
                isEdit={isEdit}
                editId={editId}
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default CreateTemplate
