import React from 'react'
import { CCol, CFormInput, CFormLabel, CFormSelect, CRow } from '@coreui/react'
import { calculateMileageAmount, formatMoney } from '../../salaryCalculations'
import { distanceMethods, travelCategories } from '../model/otherClaimModel'
import {
  AttachmentInput,
  ClaimDraftActions,
  FormPanelHeading,
} from '../../claim-ui/ClaimFormPrimitives'

const travelEvidence = {
  mileage: {
    label: 'Route proof',
    required: false,
    helpText: 'Optional: upload a map screenshot or route record showing the route and distance.',
  },
  taxi: {
    label: 'Taxi / e-hailing receipt',
    required: true,
    helpText: 'Upload the receipt showing the pickup, drop-off, and fare where available.',
  },
  toll: {
    label: 'Toll receipt or payment proof',
    required: true,
    helpText: 'Upload the toll receipt or payment evidence.',
  },
  parking: {
    label: 'Parking receipt',
    required: true,
    helpText: 'Upload the parking receipt or payment evidence.',
  },
  other: {
    label: 'Receipt or supporting proof',
    required: true,
    helpText: 'Upload evidence that supports this travel expense.',
  },
}

const mileageInputCopy = (distanceMethod) => {
  if (distanceMethod === 'one_way') {
    return {
      label: 'One-way distance (KM)',
      help: 'Claiming a single journey only. The entered distance is not doubled.',
    }
  }
  if (distanceMethod === 'total_distance') {
    return {
      label: 'Total distance travelled (KM)',
      help: 'Enter the combined actual distance for all legs. The distance is not doubled.',
    }
  }
  return {
    label: 'One-way distance (KM)',
    help: 'Enter the distance from From to To. We will double it for the return leg.',
  }
}

const TravelClaimEditor = ({
  formData,
  showDraft,
  addAction,
  attachmentInputVersion,
  isPreparing,
  projectOptions,
  isProjectOptionsLoading,
  onChange,
  onAttachmentChange,
  onAttachmentRemove,
  onSave,
  onCancel,
}) => {
  const category = formData.travelCategory || 'mileage'
  const distanceMethod = formData.travelDistanceMethod || 'return_same_route'
  const evidence = travelEvidence[category] || travelEvidence.other
  const distanceCopy = mileageInputCopy(distanceMethod)
  const mileageAmount = calculateMileageAmount(
    formData.mileageKm,
    formData.mileageRate,
    distanceMethod,
  )
  const mileageFormula =
    distanceMethod === 'return_same_route'
      ? `${formData.mileageKm || 0} KM x 2 x ${formatMoney(formData.mileageRate || 0)} = ${formatMoney(mileageAmount)}`
      : `${formData.mileageKm || 0} KM x ${formatMoney(formData.mileageRate || 0)} = ${formatMoney(mileageAmount)}`

  return (
    <section className="salary-adjustment-input-panel mt-3" aria-labelledby="otherMileageHeading">
      <FormPanelHeading id="otherMileageHeading" title="Travel claim" action={addAction} />
      {showDraft && (
        <>
          <p className="salary-form-panel-note">
            Choose what you are claiming to see only the relevant fields and evidence requirements.
          </p>
          <CRow className="g-3 salary-claim-field-row salary-travel-editor-row">
            <CCol xs={12} md="auto" className="salary-claim-date-col">
              <CFormLabel htmlFor="otherMileageDate" className="mb-1">
                Date
              </CFormLabel>
              <CFormInput
                id="otherMileageDate"
                type="date"
                name="mileageDate"
                value={formData.mileageDate}
                onChange={onChange}
              />
            </CCol>
            <CCol xs={12} md className="salary-claim-grow-col">
              <CFormLabel htmlFor="otherTravelCategory" className="mb-1">
                What are you claiming?
              </CFormLabel>
              <CFormSelect
                id="otherTravelCategory"
                name="travelCategory"
                value={category}
                onChange={onChange}
              >
                {travelCategories.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </CFormSelect>
            </CCol>
            <CCol xs={12} md className="salary-claim-grow-col">
              <CFormLabel htmlFor="otherMileageChargeMode" className="mb-1">
                Charge to
              </CFormLabel>
              <CFormSelect
                id="otherMileageChargeMode"
                name="mileageChargeToMode"
                value={formData.mileageChargeToMode || 'company'}
                onChange={onChange}
              >
                <option value="company">Company</option>
                <option value="project">Project</option>
              </CFormSelect>
            </CCol>
            {formData.mileageChargeToMode === 'project' && (
              <CCol xs={12} md className="salary-claim-grow-col">
                <CFormLabel htmlFor="otherMileageProject" className="mb-1">
                  Project
                </CFormLabel>
                <CFormSelect
                  id="otherMileageProject"
                  name="mileageChargeToProjectId"
                  value={formData.mileageChargeToProjectId || ''}
                  onChange={onChange}
                  disabled={isProjectOptionsLoading}
                >
                  <option value="">
                    {isProjectOptionsLoading ? 'Loading projects...' : 'Select project'}
                  </option>
                  {(projectOptions || []).map((project) => (
                    <option key={project.value} value={project.value}>
                      {project.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
            )}
          </CRow>

          <CRow className="g-3 salary-claim-field-row salary-travel-editor-row mt-0">
            <CCol xs={12} md className="salary-claim-grow-col">
              <CFormLabel htmlFor="otherMileagePurpose" className="mb-1">
                Business purpose
              </CFormLabel>
              <CFormInput
                id="otherMileagePurpose"
                name="mileagePurpose"
                value={formData.mileagePurpose}
                onChange={onChange}
                placeholder="Site inspection or client meeting"
              />
            </CCol>
          </CRow>

          {category === 'mileage' && (
            <>
              <CRow className="g-3 salary-claim-field-row salary-travel-editor-row mt-0">
                <CCol xs={12} md className="salary-claim-grow-col">
                  <CFormLabel htmlFor="otherStartLocation" className="mb-1">
                    From
                  </CFormLabel>
                  <CFormInput
                    id="otherStartLocation"
                    name="startLocation"
                    value={formData.startLocation}
                    onChange={onChange}
                  />
                </CCol>
                <CCol xs={12} md className="salary-claim-grow-col">
                  <CFormLabel htmlFor="otherEndLocation" className="mb-1">
                    To
                  </CFormLabel>
                  <CFormInput
                    id="otherEndLocation"
                    name="endLocation"
                    value={formData.endLocation}
                    onChange={onChange}
                  />
                </CCol>
              </CRow>
              <CRow className="g-3 salary-claim-field-row salary-travel-editor-row mt-0">
                <CCol xs={12} md="auto" className="salary-claim-date-col">
                  <CFormLabel htmlFor="otherTravelDistanceMethod" className="mb-1">
                    Distance method
                  </CFormLabel>
                  <CFormSelect
                    id="otherTravelDistanceMethod"
                    name="travelDistanceMethod"
                    value={distanceMethod}
                    onChange={onChange}
                  >
                    {distanceMethods.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
                <CCol xs={12} md="auto" className="salary-claim-mileage-col">
                  <CFormLabel htmlFor="otherMileageKm" className="mb-1">
                    {distanceCopy.label}
                  </CFormLabel>
                  <CFormInput
                    id="otherMileageKm"
                    type="number"
                    min="0"
                    step="0.1"
                    name="mileageKm"
                    value={formData.mileageKm}
                    onChange={onChange}
                  />
                  <div className="salary-travel-mileage-hint salary-field-help" role="note">
                    {distanceCopy.help}
                    {Number(formData.mileageKm || 0) > 0 && ` ${mileageFormula}`}
                  </div>
                </CCol>
              </CRow>
            </>
          )}

          {category === 'taxi' && (
            <CRow className="g-3 salary-claim-field-row salary-travel-editor-row mt-0">
              <CCol xs={12} md className="salary-claim-grow-col">
                <CFormLabel htmlFor="otherStartLocation" className="mb-1">
                  Pickup
                </CFormLabel>
                <CFormInput
                  id="otherStartLocation"
                  name="startLocation"
                  value={formData.startLocation}
                  onChange={onChange}
                />
              </CCol>
              <CCol xs={12} md className="salary-claim-grow-col">
                <CFormLabel htmlFor="otherEndLocation" className="mb-1">
                  Drop-off
                </CFormLabel>
                <CFormInput
                  id="otherEndLocation"
                  name="endLocation"
                  value={formData.endLocation}
                  onChange={onChange}
                />
              </CCol>
            </CRow>
          )}

          {category === 'toll' && (
            <CRow className="g-3 salary-claim-field-row salary-travel-editor-row mt-0">
              <CCol xs={12} md className="salary-claim-grow-col">
                <CFormLabel htmlFor="otherStartLocation" className="mb-1">
                  From
                </CFormLabel>
                <CFormInput
                  id="otherStartLocation"
                  name="startLocation"
                  value={formData.startLocation}
                  onChange={onChange}
                />
              </CCol>
              <CCol xs={12} md className="salary-claim-grow-col">
                <CFormLabel htmlFor="otherEndLocation" className="mb-1">
                  To
                </CFormLabel>
                <CFormInput
                  id="otherEndLocation"
                  name="endLocation"
                  value={formData.endLocation}
                  onChange={onChange}
                />
              </CCol>
              <CCol xs={12} md className="salary-claim-grow-col">
                <CFormLabel htmlFor="otherTravelLocationDetail" className="mb-1">
                  Route taken (optional)
                </CFormLabel>
                <CFormInput
                  id="otherTravelLocationDetail"
                  name="travelLocationDetail"
                  value={formData.travelLocationDetail}
                  onChange={onChange}
                />
              </CCol>
            </CRow>
          )}

          {category === 'parking' && (
            <CRow className="g-3 salary-claim-field-row salary-travel-editor-row mt-0">
              <CCol xs={12} md className="salary-claim-grow-col">
                <CFormLabel htmlFor="otherTravelLocationDetail" className="mb-1">
                  Parking location
                </CFormLabel>
                <CFormInput
                  id="otherTravelLocationDetail"
                  name="travelLocationDetail"
                  value={formData.travelLocationDetail}
                  onChange={onChange}
                />
              </CCol>
            </CRow>
          )}

          {category === 'other' && (
            <CRow className="g-3 salary-claim-field-row salary-travel-editor-row mt-0">
              <CCol xs={12} md className="salary-claim-grow-col">
                <CFormLabel htmlFor="otherTravelExpenseType" className="mb-1">
                  What was paid for?
                </CFormLabel>
                <CFormInput
                  id="otherTravelExpenseType"
                  name="travelExpenseType"
                  value={formData.travelExpenseType}
                  onChange={onChange}
                  placeholder="Airport luggage fee or public bus fare"
                />
              </CCol>
              <CCol xs={12} md className="salary-claim-grow-col">
                <CFormLabel htmlFor="otherTravelLocationDetail" className="mb-1">
                  Route or location (optional)
                </CFormLabel>
                <CFormInput
                  id="otherTravelLocationDetail"
                  name="travelLocationDetail"
                  value={formData.travelLocationDetail}
                  onChange={onChange}
                />
              </CCol>
            </CRow>
          )}

          {category !== 'mileage' && (
            <CRow className="g-3 salary-claim-field-row salary-travel-editor-row mt-0">
              <CCol xs={12} md="auto" className="salary-claim-amount-col">
                <CFormLabel htmlFor="otherTravelExpenseAmount" className="mb-1">
                  Amount
                </CFormLabel>
                <CFormInput
                  id="otherTravelExpenseAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  name="travelExpenseAmount"
                  value={formData.travelExpenseAmount}
                  onChange={onChange}
                />
              </CCol>
            </CRow>
          )}

          <CRow className="g-3 salary-claim-field-row salary-travel-editor-row mt-0">
            <CCol xs={12} className="salary-claim-attachment-col">
              <AttachmentInput
                id="otherTravelEvidence"
                label={evidence.label}
                attachments={formData.travelAttachments}
                inputKey={`other-travel-${attachmentInputVersion}`}
                isPreparing={isPreparing}
                multiple
                required={evidence.required}
                helpText={evidence.helpText}
                onChange={onAttachmentChange}
                onRemove={onAttachmentRemove}
              />
            </CCol>
          </CRow>
          <ClaimDraftActions onSave={onSave} onCancel={onCancel} isPreparing={isPreparing} />
        </>
      )}
    </section>
  )
}

export default TravelClaimEditor
