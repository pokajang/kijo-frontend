import React from 'react'
import { CCol, CFormInput, CFormLabel, CFormSelect, CRow } from '@coreui/react'
import { calculateMileageAmount, formatMoney } from '../../salaryCalculations'
import {
  AttachmentInput,
  ClaimDraftActions,
  FormPanelHeading,
} from '../../claim-ui/ClaimFormPrimitives'

const TravelClaimEditor = ({
  formData,
  showDraft,
  addAction,
  attachmentInputVersion,
  isPreparing,
  onChange,
  onAttachmentChange,
  onSave,
  onCancel,
}) => (
  <section className="salary-adjustment-input-panel mt-3" aria-labelledby="otherMileageHeading">
    <FormPanelHeading id="otherMileageHeading" title="Travel & Mileage" action={addAction} />
    {showDraft && (
      <>
        <CRow className="g-3 salary-claim-field-row">
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
          <CCol xs={12} md="auto" className="salary-claim-km-col">
            <CFormLabel htmlFor="otherMileageTripMode" className="mb-1">
              Trip type
            </CFormLabel>
            <CFormSelect
              id="otherMileageTripMode"
              name="mileageTripMode"
              value={formData.mileageTripMode}
              onChange={onChange}
            >
              <option value="return">Return</option>
              <option value="one_way">One-way</option>
            </CFormSelect>
          </CCol>
          <CCol xs={12} md="auto" className="salary-claim-km-col">
            <CFormLabel htmlFor="otherMileageKm" className="mb-1">
              Mileage KM (optional)
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
            <div className="salary-field-help">
              {Number(formData.mileageKm || 0) > 0
                ? `Mileage: ${formatMoney(
                    calculateMileageAmount(
                      formData.mileageKm,
                      formData.mileageRate,
                      formData.mileageTripMode,
                    ),
                  )}`
                : 'Leave blank for taxi, parking, toll, or other travel without mileage.'}
            </div>
          </CCol>
        </CRow>
        <CRow className="g-3 salary-claim-field-row mt-0">
          <CCol xs={12} md className="salary-claim-grow-col">
            <CFormLabel htmlFor="otherMileagePurpose" className="mb-1">
              Purpose
            </CFormLabel>
            <CFormInput
              id="otherMileagePurpose"
              name="mileagePurpose"
              value={formData.mileagePurpose}
              onChange={onChange}
              placeholder="Site inspection or client meeting"
            />
          </CCol>
          <CCol xs={12} md className="salary-claim-grow-col">
            <CFormLabel htmlFor="otherMileageChargeTo" className="mb-1">
              Charge to project/company
            </CFormLabel>
            <CFormInput
              id="otherMileageChargeTo"
              name="mileageChargeTo"
              value={formData.mileageChargeTo}
              onChange={onChange}
              placeholder="Project or company"
            />
          </CCol>
        </CRow>
        <CRow className="g-3 salary-claim-field-row mt-0">
          <CCol xs={12} md="auto" className="salary-claim-date-col">
            <CFormLabel htmlFor="otherTravelExpenseCategory" className="mb-1">
              Parking / taxi / toll / others
            </CFormLabel>
            <CFormSelect
              id="otherTravelExpenseCategory"
              name="travelExpenseCategory"
              value={formData.travelExpenseCategory}
              onChange={onChange}
            >
              <option value="">None</option>
              <option value="combined">Combined travel expense</option>
              <option value="parking">Parking</option>
              <option value="toll">Toll</option>
              <option value="taxi">Taxi</option>
              <option value="other">Other</option>
            </CFormSelect>
          </CCol>
          <CCol xs={12} md="auto" className="salary-claim-amount-col">
            <CFormLabel htmlFor="otherTravelExpenseAmount" className="mb-1">
              Expense amount
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
          <CCol xs={12} md className="salary-claim-attachment-col">
            <AttachmentInput
              id="otherTravelExpenseAttachment"
              label="Travel expense receipt"
              attachment={formData.mileageAttachment}
              inputKey={`other-travel-${attachmentInputVersion}`}
              isPreparing={isPreparing}
              onChange={onAttachmentChange}
            />
          </CCol>
        </CRow>
        <ClaimDraftActions onSave={onSave} onCancel={onCancel} isPreparing={isPreparing} />
      </>
    )}
  </section>
)

export default TravelClaimEditor
