// src/templates/create/CreateTemplate.js

import React, { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { CRow, CCol, CCard, CCardBody, CCardHeader, CButton } from '@coreui/react'

import TrainingServiceTemplate from './TrainingServiceTemplate'
import IhServiceTemplate from './IhServiceTemplate'
import ManpowerServiceTemplate from './ManpowerServiceTemplate'
import SpecialTemplate from './SpecialTemplate'
import { getDetailReturnTo } from '../../../utils/navigation/returnTo'
import { getTemplateHandoff, getTemplateReturnState } from '../shared/templateHandoff'
import dialog from '../../../components/dialog/dialogService'

const SERVICE_OPTIONS = [
  { key: 'training', label: 'Training Proposal', component: TrainingServiceTemplate },
  { key: 'ih', label: 'Industrial Hygiene Proposal', component: IhServiceTemplate },
  { key: 'manpower', label: 'Manpower Supply Proposal', component: ManpowerServiceTemplate },
  { key: 'special', label: 'Other Services Proposal', component: SpecialTemplate },
]

const CreateTemplate = () => {
  const location = useLocation()
  const navigate = useNavigate()

  // parse URL params
  const params = new URLSearchParams(location.search)
  const type = params.get('type') || ''
  const isEdit = params.get('edit') === 'true'
  const editId = params.get('id') || null
  const returnTo = getDetailReturnTo(location, '/templates/proposals')
  const templateHandoff = getTemplateHandoff(location)
  const specialCategoryId =
    Number(params.get('categoryId') || templateHandoff?.specialCategoryId) || null
  const templateReturnState = getTemplateReturnState(location)
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    if (!isDirty) return undefined

    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const confirmLeave = async () => {
    if (!isDirty) return true
    return dialog.confirm(
      'Leave this proposal form? Text changes remain in the local draft, but selected files must be added again.',
    )
  }

  // navigate to the selected type
  const selectService = async (key) => {
    if (!(await confirmLeave())) return
    navigate(
      { pathname: location.pathname, search: `?type=${key}` },
      {
        replace: true,
        state: {
          returnTo,
          ...(templateHandoff ? { templateHandoff } : {}),
        },
      },
    )
  }

  const showServiceSelector = async () => {
    if (!(await confirmLeave())) return
    navigate(
      { pathname: location.pathname, search: '' },
      { replace: true, state: { returnTo, ...(templateHandoff ? { templateHandoff } : {}) } },
    )
  }

  const handleBack = async () => {
    if (!(await confirmLeave())) return
    navigate(returnTo, { state: templateReturnState })
  }

  // find the component for the current type
  const activeOption = SERVICE_OPTIONS.find((opt) => opt.key === type)
  const CurrentComponent = activeOption?.component

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <strong>
              {isEdit
                ? `Edit ${activeOption?.label || 'Proposal'} Template`
                : activeOption
                  ? `Create ${activeOption.label} Template`
                  : 'Create Proposal Template'}
            </strong>
            <div className="d-flex flex-wrap gap-2">
              <CButton size="sm" color="secondary" variant="outline" onClick={handleBack}>
                Back
              </CButton>
            </div>
          </CCardHeader>
          <CCardBody>
            {!isEdit && !CurrentComponent && (
              <div className="mb-3">
                <h2 className="h6 mb-1">Choose proposal type</h2>
                <p className="text-muted mb-3">
                  Select the service that best matches the reusable proposal you are creating.
                </p>
                <div className="d-flex flex-wrap gap-2">
                  {SERVICE_OPTIONS.map((opt) => (
                    <CButton
                      variant="outline"
                      key={opt.key}
                      color="secondary"
                      onClick={() => selectService(opt.key)}
                    >
                      {opt.label}
                    </CButton>
                  ))}
                </div>
                <div className="border-top mt-4 pt-3 small text-muted">
                  Check existing templates first to avoid duplicates.{' '}
                  <CButton
                    color="link"
                    size="sm"
                    className="p-0 align-baseline"
                    onClick={() => navigate(returnTo, { state: templateReturnState })}
                  >
                    Review existing proposals
                  </CButton>
                </div>
              </div>
            )}

            {!isEdit && CurrentComponent && (
              <div className="d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-2 border-bottom pb-3 mb-4">
                <div>
                  <div className="small text-muted">Proposal type</div>
                  <div className="fw-semibold">{activeOption.label}</div>
                </div>
                <CButton
                  color="secondary"
                  variant="outline"
                  size="sm"
                  className="align-self-start align-self-sm-auto"
                  onClick={showServiceSelector}
                >
                  Change type
                </CButton>
              </div>
            )}

            {/* render the selected form */}
            {CurrentComponent && (
              <CurrentComponent
                key={isEdit ? `edit-${editId}` : `create-${type}`}
                isEdit={isEdit}
                editId={editId}
                onDirtyChange={setIsDirty}
                specialCategoryId={type === 'special' ? specialCategoryId : null}
                specialCategoryName={
                  type === 'special' ? templateHandoff?.specialCategoryName || '' : ''
                }
              />
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default CreateTemplate
