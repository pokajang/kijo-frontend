import React, { useEffect, useState } from 'react'
import Select from '../../../../components/forms/ThemedSelect'
import { useLocation, useNavigate } from 'react-router-dom'
import { CRow, CButton, CCol, CFormLabel, CFormInput } from '@coreui/react'
import { isQuoteResultSuccess, quoteApiUrl } from '../quoteApi'
import { buildQuoteTemplateCreateNavigation } from '../../../templates/shared/templateHandoff'

/**
 * IH Service selector.
 * In edit mode, shows current service in a disabled text input instead of a dropdown.
 */
const ServiceTypeCard = ({
  formData,
  setFormData,
  isEditMode = false,
  proposalLanguage = 'en',
  createdProposalTemplate = null,
  onCreatedProposalTemplateConsumed,
}) => {
  const [options, setOptions] = useState([])
  const [optionsLoaded, setOptionsLoaded] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    setOptionsLoaded(false)
    setOptions([])
    const query = new URLSearchParams({ language: proposalLanguage })
    fetch(quoteApiUrl(`proposal-templates/ih/list?${query.toString()}`), {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((result) => {
        const rows = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : []
        if (isQuoteResultSuccess(result)) {
          if (!cancelled) setOptions(rows)
        } else {
          console.error('Failed to load IH services', result)
        }
      })
      .catch((err) => {
        console.error('API error loading IH services:', err)
      })
      .finally(() => {
        if (!cancelled) setOptionsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [proposalLanguage])

  useEffect(() => {
    if (!createdProposalTemplate || isEditMode) return
    if (
      createdProposalTemplate.serviceKey !== 'ih' ||
      createdProposalTemplate.proposalLanguage !== proposalLanguage
    ) {
      onCreatedProposalTemplateConsumed?.()
      return
    }
    if (!optionsLoaded) return

    const selected = options.find(
      (option) => Number(option.id) === Number(createdProposalTemplate.templateId),
    )
    if (!selected) {
      onCreatedProposalTemplateConsumed?.(
        'The new Industrial Hygiene proposal template could not be loaded. Refresh the list or select it manually.',
      )
      return
    }

    setFormData((prev) => ({
      ...prev,
      serviceId: selected.id,
      serviceCode: selected.serviceCode,
      serviceTitle: selected.serviceTitle,
    }))
    onCreatedProposalTemplateConsumed?.()
  }, [
    createdProposalTemplate,
    isEditMode,
    onCreatedProposalTemplateConsumed,
    options,
    optionsLoaded,
    proposalLanguage,
    setFormData,
  ])

  const reactSelectOptions = options.map((opt) => ({
    value: opt.serviceCode,
    label: `${opt.serviceTitle} (${opt.serviceCode.toUpperCase()})${opt.proposalLanguage === 'ms-MY' ? ' [BM]' : ''}`,
    id: opt.id,
    serviceTitle: opt.serviceTitle,
    serviceCode: opt.serviceCode,
  }))

  useEffect(() => {
    if (isEditMode || formData.serviceId || !formData.serviceCode || options.length === 0) {
      return
    }

    const matchingOptions = options.filter((option) => {
      const sameCode = String(option.serviceCode || '') === String(formData.serviceCode || '')
      const sameTitle = !formData.serviceTitle || option.serviceTitle === formData.serviceTitle
      return sameCode && sameTitle
    })
    if (matchingOptions.length !== 1) return

    const [matchingOption] = matchingOptions
    setFormData((prev) => {
      if (
        prev.serviceId ||
        String(prev.serviceCode || '') !== String(matchingOption.serviceCode || '')
      ) {
        return prev
      }

      return {
        ...prev,
        serviceId: matchingOption.id,
        serviceCode: matchingOption.serviceCode,
        serviceTitle: matchingOption.serviceTitle,
      }
    })
  }, [
    formData.serviceCode,
    formData.serviceId,
    formData.serviceTitle,
    isEditMode,
    options,
    setFormData,
  ])

  const handleSelect = (selected) => {
    if (!selected) {
      setFormData((prev) => ({
        ...prev,
        serviceId: null,
        serviceCode: '',
        serviceTitle: '',
      }))
      return
    }

    setFormData((prev) => ({
      ...prev,
      serviceId: selected.id,
      serviceCode: selected.value,
      serviceTitle: selected.serviceTitle,
    }))
  }

  return (
    <>
      <CRow></CRow>
      <CRow className="g-3 mb-3">
        <CCol xs={12}>
          <CFormLabel>IH Service Type</CFormLabel>
          {isEditMode ? (
            <CFormInput
              type="text"
              value={`${formData.serviceTitle} (${formData.serviceCode.toUpperCase()})`}
              disabled
            />
          ) : (
            <Select
              options={reactSelectOptions}
              value={
                reactSelectOptions.find((opt) => String(opt.id) === String(formData.serviceId)) ||
                reactSelectOptions.find((opt) => opt.value === formData.serviceCode) ||
                null
              }
              onChange={handleSelect}
              placeholder="Select IH service type..."
              isClearable
              noOptionsMessage={() => (
                <span>
                  {proposalLanguage === 'ms-MY'
                    ? 'No reviewed BM IH proposals available. Review and save the BM proposal first.'
                    : 'No services found.'}{' '}
                  <CButton
                    size="sm"
                    color="primary"
                    className="p-1 m-0 align-baseline"
                    onClick={() => {
                      const target = buildQuoteTemplateCreateNavigation({
                        location,
                        serviceKey: 'ih',
                        proposalLanguage,
                      })
                      if (target) navigate(target.to, { state: target.state })
                    }}
                  >
                    Create one?
                  </CButton>
                </span>
              )}
            />
          )}
        </CCol>
      </CRow>
    </>
  )
}

export default ServiceTypeCard
