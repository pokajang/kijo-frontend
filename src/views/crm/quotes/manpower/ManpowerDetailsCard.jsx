import React, { useEffect, useState } from 'react'
import Select from '../../../../components/forms/ThemedSelect'
import { useNavigate } from 'react-router-dom'
import {
  CCol,
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CRow,
  CFormLabel,
  CFormInput,
  CAlert,
  CButton,
} from '@coreui/react'
import ProjectDetailsCard from './ProjectDetailsCard'
import PricingCard from './PricingCard'
import { isQuoteResultSuccess, quoteApiUrl } from '../quoteApi'
import { getManpowerRate, inferManpowerRateType } from './manpowerRates'
import { useQuoteRouteParams } from '../helpers/quoteRouteParams'

export default function ManpowerDetailsCard({
  formData,
  setFormData,
  isEditMode = false,
  proposalLanguage = 'en',
  onRequestOverride,
  appliedPriceException = null,
  showPricingSection = false,
}) {
  const [templates, setTemplates] = useState([])
  const navigate = useNavigate()
  const { isRevision } = useQuoteRouteParams()

  // load manpower‐template list
  useEffect(() => {
    const query = new URLSearchParams({ language: proposalLanguage })
    fetch(quoteApiUrl(`proposal-templates/manpower/list?${query.toString()}`), {
      credentials: 'include',
    })
      .then((r) => r.json())
      .then((json) => {
        const rows = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : []
        if (isQuoteResultSuccess(json)) {
          setTemplates(rows)
        } else {
          console.error('Unexpected response format', json)
        }
      })
      .catch((err) => {
        console.error('Failed to load manpower templates', err)
      })
  }, [proposalLanguage])

  const reactSelectOptions = templates.map((t) => ({
    value: t.id,
    label: `${t.serviceTitle} (${t.serviceCode})${t.proposalLanguage === 'ms-MY' ? ' [BM]' : ''}`,
    serviceTitle: t.serviceTitle,
    serviceCode: t.serviceCode,
  }))

  useEffect(() => {
    if (
      isEditMode ||
      formData.mpId ||
      !formData.serviceTitle ||
      !formData.serviceCode ||
      templates.length === 0
    ) {
      return
    }

    const matchingTemplates = templates.filter(
      (template) =>
        template.serviceTitle === formData.serviceTitle &&
        template.serviceCode === formData.serviceCode,
    )
    if (matchingTemplates.length !== 1) return

    const [matchingTemplate] = matchingTemplates
    const manpowerRateType = inferManpowerRateType({
      serviceTitle: matchingTemplate.serviceTitle,
      serviceCode: matchingTemplate.serviceCode,
    })
    const rate = getManpowerRate({
      rateType: manpowerRateType,
      durationMonths: formData.durationMonths,
    })

    setFormData((prev) => {
      if (
        prev.mpId ||
        prev.serviceTitle !== matchingTemplate.serviceTitle ||
        prev.serviceCode !== matchingTemplate.serviceCode
      ) {
        return prev
      }

      return {
        ...prev,
        mpId: matchingTemplate.id,
        serviceCode: matchingTemplate.serviceCode,
        serviceTitle: matchingTemplate.serviceTitle,
        manpowerRateType,
        billingUnit: rate.billingUnit,
        unitCost: rate.unitCost || prev.unitCost,
        requiresManagementApproval: !!rate.requiresManagementApproval,
        durationMonths: rate.billingUnit === 'hour' ? 0 : prev.durationMonths,
        durationHours: rate.billingUnit === 'hour' ? prev.durationHours : 0,
      }
    })
  }, [
    formData.durationMonths,
    formData.mpId,
    formData.serviceCode,
    formData.serviceTitle,
    isEditMode,
    setFormData,
    templates,
  ])

  const handleTemplateSelect = (selected) => {
    if (!selected) {
      setFormData((prev) => ({
        ...prev,
        mpId: null,
        serviceCode: '',
        serviceTitle: '',
        manpowerRateType: '',
        billingUnit: 'month',
        requiresManagementApproval: false,
        durationHours: 0,
        unitCost: 0,
      }))
      return
    }

    const manpowerRateType = inferManpowerRateType({
      serviceTitle: selected.serviceTitle,
      serviceCode: selected.serviceCode,
    })
    const rate = getManpowerRate({
      rateType: manpowerRateType,
      durationMonths: formData.durationMonths,
    })

    setFormData((prev) => ({
      ...prev,
      mpId: selected.value,
      serviceCode: selected.serviceCode,
      serviceTitle: selected.serviceTitle,
      manpowerRateType,
      billingUnit: rate.billingUnit,
      unitCost: rate.unitCost,
      requiresManagementApproval: !!rate.requiresManagementApproval,
      durationMonths: rate.billingUnit === 'hour' ? 0 : prev.durationMonths,
      durationHours: rate.billingUnit === 'hour' ? prev.durationHours : 0,
    }))
  }

  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Manpower Supply Details</strong>
        </CCardHeader>
        <CCardBody>
          <CForm>
            <CRow>
              <CCol>
                {isEditMode && (
                  <CAlert color="primary">
                    <strong>
                      {isRevision
                        ? 'You are revising the existing quotation. The quotation number will be appended with Rev xx.'
                        : "You are editing the existing quotation. This won't change the quotation number."}
                    </strong>
                  </CAlert>
                )}
              </CCol>
            </CRow>

            {/* Service Template */}
            <CRow className="mb-3">
              <CCol md={12}>
                <CFormLabel>Manpower Service Type</CFormLabel>
                {isEditMode ? (
                  <CFormInput
                    type="text"
                    value={`${formData.serviceTitle} (${formData.serviceCode})`}
                    disabled
                  />
                ) : (
                  <Select
                    options={reactSelectOptions}
                    value={
                      reactSelectOptions.find(
                        (opt) => String(opt.value) === String(formData.mpId),
                      ) || null
                    }
                    onChange={handleTemplateSelect}
                    placeholder="Select manpower service..."
                    isClearable
                    noOptionsMessage={() => (
                      <span>
                        {proposalLanguage === 'ms-MY'
                          ? 'No reviewed BM manpower proposals available. Review and save the BM proposal first.'
                          : 'No manpower services found.'}{' '}
                        <CButton
                          color="primary"
                          size="sm"
                          className="p-1 m-0 align-baseline"
                          onClick={() => navigate('/templates/create')}
                        >
                          Create one?
                        </CButton>
                      </span>
                    )}
                  />
                )}
              </CCol>
            </CRow>

            {/* Nature of Project & Site Location */}
            <ProjectDetailsCard formData={formData} setFormData={setFormData} />

            {/* Pricing Inputs and Auto-Totals */}
            {showPricingSection && (
              <PricingCard
                formData={formData}
                setFormData={setFormData}
                isEditMode={isEditMode}
                onRequestOverride={onRequestOverride}
                appliedPriceException={appliedPriceException}
              />
            )}
          </CForm>
        </CCardBody>
      </CCard>
    </CCol>
  )
}
