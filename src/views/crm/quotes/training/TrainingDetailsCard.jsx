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
import { useQuoteRouteParams } from '../helpers/quoteRouteParams'
import { getPricingDurationDefaults } from './trainingDuration'

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
  const shouldSyncDurationToDateRange = prev.durationUnit !== 'hour(s)'

  return {
    ...prev,
    selectedDate: nextStartValue ? new Date(`${nextStartValue}T00:00:00`) : null,
    selectedEndDate: normalizedEndValue ? new Date(`${normalizedEndValue}T00:00:00`) : null,
    toBeConfirmed: false,
    ...(shouldSyncDurationToDateRange && trainingDays > 0
      ? {
          trainingDuration: trainingDays,
          durationUnit: 'day(s)',
        }
      : {}),
  }
}

const labels = {
  en: {
    title: 'Training Details',
    revision:
      'You are revising the existing quotation. The quotation number will be appended with Rev xx.',
    edit: "You are editing the existing quotation. This won't change the quotation number.",
    trainingTopic: 'Training Topic',
    topicPlaceholder: 'Search and select training topic...',
    noTopics: 'No training topics available.',
    noBmTopics:
      'No reviewed BM training proposals available. Review and save the BM proposal first.',
    createOne: 'Create One?',
    trainingType: 'Training Type',
    physical: 'Physical',
    online: 'Online',
    paymentMethod: 'Payment Method',
    other: 'Other',
    paymentPlaceholder: 'Enter payment method',
    proposedDateRange: 'Proposed Date Range',
    tbc: 'To be confirmed',
    chooseDate: 'Choose date',
    to: 'to',
    trainingDays: 'Training days',
    day: 'day',
    days: 'days',
    trainingVenue: 'Training Venue',
    venuePlaceholder: 'Enter training venue full address',
    targetParticipants: 'Target Participants',
    targetPlaceholder: 'e.g. Supervisors, General Workers',
    quotationRemarks: 'Quotation Remarks',
    remarksPlaceholder: 'e.g. Mention things to highlight in the quotation.',
  },
  bm: {
    title: 'Butiran Latihan',
    revision:
      'Anda sedang menyemak sebut harga sedia ada. Nombor sebut harga akan ditambah dengan Rev xx.',
    edit: 'Anda sedang mengedit sebut harga sedia ada. Nombor sebut harga tidak akan berubah.',
    trainingTopic: 'Topik Latihan',
    topicPlaceholder: 'Cari dan pilih topik latihan...',
    noTopics: 'Tiada topik latihan tersedia.',
    noBmTopics:
      'Tiada cadangan latihan BM yang telah disemak. Sila semak dan simpan cadangan BM dahulu.',
    createOne: 'Cipta Satu?',
    trainingType: 'Jenis Latihan',
    physical: 'Fizikal',
    online: 'Dalam Talian',
    paymentMethod: 'Kaedah Bayaran',
    other: 'Lain-lain',
    paymentPlaceholder: 'Masukkan kaedah bayaran',
    proposedDateRange: 'Julat Tarikh Dicadangkan',
    tbc: 'Akan disahkan',
    chooseDate: 'Pilih tarikh',
    to: 'hingga',
    trainingDays: 'Hari latihan',
    day: 'hari',
    days: 'hari',
    trainingVenue: 'Tempat Latihan',
    venuePlaceholder: 'Masukkan alamat penuh tempat latihan',
    targetParticipants: 'Peserta Sasaran',
    targetPlaceholder: 'cth. Penyelia, Pekerja Am',
    quotationRemarks: 'Catatan Sebut Harga',
    remarksPlaceholder: 'cth. Nyatakan perkara yang perlu ditonjolkan dalam sebut harga.',
  },
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
  const { isRevision } = useQuoteRouteParams()
  const text = proposalLanguage === 'ms-MY' ? labels.bm : labels.en
  const selectedPaymentMethodOption = presetPaymentMethods.includes(formData.paymentMethod)
    ? formData.paymentMethod
    : 'Other'
  const selectedDateValue = toInputDateValue(formData.selectedDate)
  const selectedEndDateValue = toInputDateValue(formData.selectedEndDate)
  const trainingDays = getInclusiveTrainingDays(selectedDateValue, selectedEndDateValue)
  const selectedTrainingOption =
    trainingOptions.find((opt) => String(opt.value) === String(formData.trainingId)) ||
    (isEditMode && formData.trainingTitle
      ? {
          value: formData.trainingId,
          proposal_id: formData.proposal_id || formData.trainingId,
          label: formData.trainingTitle,
          trainingTitle: formData.trainingTitle,
        }
      : null)

  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>{text.title}</strong>
        </CCardHeader>
        <CCardBody>
          {isEditMode && (
            <CAlert color="primary">
              <strong>{isRevision ? text.revision : text.edit}</strong>
            </CAlert>
          )}

          <CForm className="row g-3">
            {/* Training Topic Selection */}
            <CCol md={12}>
              <CFormLabel htmlFor="trainingTitle">{text.trainingTopic}</CFormLabel>
              <Select
                id="trainingTitle"
                options={trainingOptions}
                value={selectedTrainingOption}
                onChange={(selected) =>
                  setFormData((prev) => ({
                    ...prev,
                    trainingId: selected?.value || '',
                    trainingTitle: selected?.trainingTitle || '',
                    proposal_id: selected?.proposal_id || '',
                    template: selected?.template || null,
                    ...getPricingDurationDefaults(selected?.duration),
                  }))
                }
                placeholder={text.topicPlaceholder}
                isClearable
                isDisabled={isEditMode}
                noOptionsMessage={() => (
                  <span>
                    {proposalLanguage === 'ms-MY' ? text.noBmTopics : text.noTopics}{' '}
                    <CButton
                      color="primary"
                      size="sm"
                      onClick={() => navigate('/templates/create')}
                    >
                      {text.createOne}
                    </CButton>
                  </span>
                )}
              />
            </CCol>

            {/* Training Type */}
            <CCol md={3}>
              <CFormLabel>{text.trainingType}</CFormLabel>
              <CRow className="g-2">
                {['Physical', 'Online'].map((type) => (
                  <CCol xs="auto" key={type}>
                    <CFormCheck
                      inline
                      type="radio"
                      name="trainingTypeOption"
                      id={type}
                      value={type}
                      label={type === 'Online' ? text.online : text.physical}
                      checked={formData.trainingTypeOption === type}
                      onChange={(e) =>
                        setFormData((prev) => {
                          const nextTrainingType = e.target.value
                          const isOnline = nextTrainingType === 'Online'
                          const isHourly = prev.durationUnit === 'hour(s)'

                          return {
                            ...prev,
                            trainingTypeOption: nextTrainingType,
                            unitPrice: isOnline ? 3500 : isHourly ? prev.unitPrice : 4500,
                            travelCharge: isOnline ? 0 : prev.travelCharge,
                            travelRegion: isOnline ? 'none' : prev.travelRegion,
                            mealsProvided: isOnline ? 'No' : prev.mealsProvided,
                          }
                        })
                      }
                    />
                  </CCol>
                ))}
              </CRow>
            </CCol>

            {/* Payment Method */}
            <CCol md={3}>
              <CFormLabel>{text.paymentMethod}</CFormLabel>
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
                    {method === 'Other' ? text.other : method}
                  </option>
                ))}
              </CFormSelect>
              {selectedPaymentMethodOption === 'Other' && (
                <CFormInput
                  className="mt-2"
                  placeholder={text.paymentPlaceholder}
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
              <CFormLabel>{text.proposedDateRange}</CFormLabel>
              <CRow className="g-3 align-items-center">
                <CCol xs="auto">
                  <CFormCheck
                    type="radio"
                    name="dateConfirmationMode"
                    id="tbcOption"
                    label={text.tbc}
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
                    label={text.chooseDate}
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
                        <small>{text.to}</small>
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
                            {text.trainingDays}: {trainingDays}{' '}
                            {trainingDays === 1 ? text.day : text.days}
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
              <CFormLabel htmlFor="trainingVenue">{text.trainingVenue}</CFormLabel>
              <CFormTextarea
                id="trainingVenue"
                rows={2}
                placeholder={text.venuePlaceholder}
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
              <CFormLabel htmlFor="targetGroups">{text.targetParticipants}</CFormLabel>
              <CFormTextarea
                id="targetGroups"
                rows={2}
                placeholder={text.targetPlaceholder}
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
              <CFormLabel htmlFor="trainingInqRemarks">{text.quotationRemarks}</CFormLabel>
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
                placeholder={text.remarksPlaceholder}
              />
            </CCol>
          </CForm>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default TrainingDetailsCard
