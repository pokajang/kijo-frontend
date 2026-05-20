// crm/quotes/training/TrainingDetailsCard.jsx

import React from 'react'
import Select from '../../../../components/forms/ThemedSelect'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CAlert,
  CButton,
  CRow,
  CCol,
  CForm,
  CFormLabel,
  CFormCheck,
  CFormSelect,
  CFormTextarea,
  CFormInput,
} from '@coreui/react'

const toInputDateValue = (value) => {
  if (!value) return ''
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const getInclusiveTrainingDays = (startValue, endValue) => {
  if (!startValue) return 0
  const start = new Date(`${startValue}T00:00:00`)
  const end = new Date(`${endValue || startValue}T00:00:00`)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0
  const dayMs = 24 * 60 * 60 * 1000
  return Math.floor((end - start) / dayMs) + 1
}

const applyDateRange = (prev, nextStartValue, nextEndValue) => {
  const normalizedEndValue = nextStartValue ? nextEndValue || nextStartValue : ''
  const trainingDays = getInclusiveTrainingDays(nextStartValue, normalizedEndValue)
  return {
    ...prev,
    selectedDate: nextStartValue ? new Date(`${nextStartValue}T00:00:00`) : null,
    selectedEndDate: normalizedEndValue ? new Date(`${normalizedEndValue}T00:00:00`) : null,
    toBeConfirmed: false,
    ...(trainingDays > 0
      ? {
          trainingDuration: trainingDays,
          durationUnit: 'day(s)',
        }
      : {}),
  }
}

const TrainingDetailsCard = ({
  formData,
  setFormData,
  trainingOptions,
  isEditMode,
  presetPaymentMethods,
  proposalLanguage = 'en',
}) => {
  const navigate = useNavigate()
  const selectedPaymentMethodOption = presetPaymentMethods.includes(formData.paymentMethod)
    ? formData.paymentMethod
    : 'Other'
  const selectedDateValue = toInputDateValue(formData.selectedDate)
  const selectedEndDateValue = toInputDateValue(formData.selectedEndDate)
  const trainingDays = getInclusiveTrainingDays(selectedDateValue, selectedEndDateValue)

  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Training Details</strong>
        </CCardHeader>
        <CCardBody>
          {isEditMode && (
            <CAlert color="primary">
              <strong>
                {new URLSearchParams(window.location.search).get('isRevision') === 'true'
                  ? 'You are revising the existing quotation. The quotation number will be appended with Rev xx.'
                  : "You are editing the existing quotation. This won't change the quotation number."}
              </strong>
            </CAlert>
          )}

          <CForm className="row g-3">
            {/* Training Topic Selection */}
            <CCol md={12}>
              <CFormLabel htmlFor="trainingTitle">Training Topic</CFormLabel>
              <Select
                id="trainingTitle"
                options={trainingOptions}
                value={trainingOptions.find((opt) => opt.value === formData.trainingId) || null}
                onChange={(selected) =>
                  setFormData((prev) => ({
                    ...prev,
                    trainingId: selected?.value || '',
                    trainingTitle: selected?.trainingTitle || '',
                    proposal_id: selected?.proposal_id || '',
                    template: selected?.template || null,
                  }))
                }
                placeholder="Search and select training topic..."
                isClearable
                isDisabled={isEditMode}
                noOptionsMessage={() => (
                  <span>
                    {proposalLanguage === 'ms-MY'
                      ? 'No reviewed BM training proposals available. Review and save the BM proposal first.'
                      : 'No training topics available.'}{' '}
                    <CButton
                      color="primary"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/templates/create')}
                    >
                      Create One?
                    </CButton>
                  </span>
                )}
              />
            </CCol>

            {/* Training Type */}
            <CCol md={3}>
              <CFormLabel>Training Type</CFormLabel>
              <CRow className="g-2">
                {['Physical', 'Online'].map((type) => (
                  <CCol xs="auto" key={type}>
                    <CFormCheck
                      inline
                      type="radio"
                      name="trainingTypeOption"
                      id={type}
                      value={type}
                      label={type}
                      checked={formData.trainingTypeOption === type}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          trainingTypeOption: e.target.value,
                          unitPrice: e.target.value === 'Online' ? 3500 : 4500,
                          travelCharge: e.target.value === 'Online' ? 0 : prev.travelCharge,
                          mealsProvided: e.target.value === 'Online' ? 'No' : prev.mealsProvided,
                        }))
                      }
                    />
                  </CCol>
                ))}
              </CRow>
            </CCol>

            {/* Payment Method */}
            <CCol md={3}>
              <CFormLabel>Payment Method</CFormLabel>
              <CFormSelect
                value={selectedPaymentMethodOption}
                onChange={(e) =>
                  setFormData((prev) => {
                    const nextMethod = e.target.value
                    if (nextMethod === 'Other') {
                      return {
                        ...prev,
                        paymentMethod: prev.customPaymentMethod || '',
                        hrdCharge: 0,
                      }
                    }

                    return {
                      ...prev,
                      paymentMethod: nextMethod,
                      hrdCharge: nextMethod === 'HRD Grant' ? 4 : 0,
                    }
                  })
                }
              >
                {[...presetPaymentMethods, 'Other'].map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </CFormSelect>
              {selectedPaymentMethodOption === 'Other' && (
                <CFormInput
                  className="mt-2"
                  placeholder="Enter payment method"
                  value={formData.customPaymentMethod || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      customPaymentMethod: e.target.value,
                      paymentMethod: e.target.value,
                      hrdCharge: 0,
                    }))
                  }
                />
              )}
            </CCol>

            {/* Date Selection */}
            <CCol md={6}>
              <CFormLabel>Proposed Date Range</CFormLabel>
              <CRow className="g-3 align-items-center">
                <CCol xs="auto">
                  <CFormCheck
                    type="radio"
                    name="dateConfirmationMode"
                    id="tbcOption"
                    label="To be confirmed"
                    checked={formData.toBeConfirmed}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        toBeConfirmed: true,
                        selectedDate: null,
                        selectedEndDate: null,
                      }))
                    }
                  />
                </CCol>
                <CCol xs="auto">
                  <CFormCheck
                    type="radio"
                    name="dateConfirmationMode"
                    id="chooseDateOption"
                    label="Choose date"
                    checked={!formData.toBeConfirmed}
                    onChange={() =>
                      setFormData((prev) => ({
                        ...prev,
                        toBeConfirmed: false,
                      }))
                    }
                  />
                </CCol>

                {!formData.toBeConfirmed && (
                  <CCol xs={12}>
                    <CRow className="g-2 align-items-center">
                      <CCol md={5}>
                        <CFormInput
                          type="date"
                          id="selectedStartDate"
                          value={selectedDateValue}
                          onChange={(e) => {
                            const nextStartValue = e.target.value
                            const nextEndValue =
                              !nextStartValue || selectedEndDateValue < nextStartValue
                                ? nextStartValue
                                : selectedEndDateValue

                            setFormData((prev) =>
                              applyDateRange(prev, nextStartValue, nextEndValue),
                            )
                          }}
                        />
                      </CCol>
                      <CCol md="auto" className="text-center">
                        <small>to</small>
                      </CCol>
                      <CCol md={5}>
                        <CFormInput
                          type="date"
                          id="selectedEndDate"
                          value={selectedEndDateValue}
                          min={selectedDateValue || undefined}
                          onChange={(e) =>
                            setFormData((prev) =>
                              applyDateRange(prev, selectedDateValue, e.target.value),
                            )
                          }
                          disabled={!selectedDateValue}
                        />
                      </CCol>
                      {trainingDays > 0 && (
                        <CCol xs={12}>
                          <small className="text-body-secondary">
                            Training days: {trainingDays} day{trainingDays === 1 ? '' : 's'}
                          </small>
                        </CCol>
                      )}
                    </CRow>
                  </CCol>
                )}
              </CRow>
            </CCol>

            {/* Training Venue */}
            <CCol md={4}>
              <CFormLabel htmlFor="trainingVenue">Training Venue</CFormLabel>
              <CFormTextarea
                id="trainingVenue"
                rows={2}
                placeholder="Enter training venue full address"
                value={formData.trainingVenue}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    trainingVenue: e.target.value,
                  }))
                }
              />
            </CCol>

            {/* Target Groups */}
            <CCol md={4}>
              <CFormLabel htmlFor="targetGroups">Target Participants</CFormLabel>
              <CFormTextarea
                id="targetGroups"
                rows={2}
                placeholder="e.g. Supervisors, General Workers"
                value={formData.targetGroups || ''}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    targetGroups: e.target.value,
                  }))
                }
              />
            </CCol>

            {/* Remarks */}
            <CCol md={4}>
              <CFormLabel htmlFor="trainingInqRemarks">Quotation Remarks</CFormLabel>
              <CFormTextarea
                id="trainingInqRemarks"
                rows={2}
                value={formData.trainingInqRemarks}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    trainingInqRemarks: e.target.value,
                  }))
                }
                placeholder="e.g. Mention things to highlight in the quotation."
              />
            </CCol>
          </CForm>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default TrainingDetailsCard
