import React, { useEffect, useState } from 'react'
import Select from '../../../../components/forms/ThemedSelect'
import { useNavigate } from 'react-router-dom'
import { CRow, CButton, CCol, CFormLabel, CFormInput } from '@coreui/react'
import { isQuoteResultSuccess, quoteApiUrl } from '../quoteApi'

/**
 * IH Service selector.
 * In edit mode, shows current service in a disabled text input instead of a dropdown.
 */
const ServiceTypeCard = ({
  formData,
  setFormData,
  isEditMode = false,
  proposalLanguage = 'en',
}) => {
  const [options, setOptions] = useState([])
  const navigate = useNavigate()

  useEffect(() => {
    const query = new URLSearchParams({ language: proposalLanguage })
    fetch(quoteApiUrl(`proposal-templates/ih/list?${query.toString()}`), {
      credentials: 'include',
    })
      .then((res) => res.json())
      .then((result) => {
        const rows = Array.isArray(result) ? result : Array.isArray(result?.data) ? result.data : []
        if (isQuoteResultSuccess(result)) {
          setOptions(rows)
        } else {
          console.error('Failed to load IH services', result)
        }
      })
      .catch((err) => {
        console.error('API error loading IH services:', err)
      })
  }, [proposalLanguage])

  const reactSelectOptions = options.map((opt) => ({
    value: opt.serviceCode,
    label: `${opt.serviceTitle} (${opt.serviceCode.toUpperCase()})${opt.proposalLanguage === 'ms-MY' ? ' [BM]' : ''}`,
    id: opt.id,
    serviceTitle: opt.serviceTitle,
  }))

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
              value={reactSelectOptions.find((opt) => opt.value === formData.serviceCode) || null}
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
                    variant="outline"
                    color="primary"
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
    </>
  )
}

export default ServiceTypeCard
