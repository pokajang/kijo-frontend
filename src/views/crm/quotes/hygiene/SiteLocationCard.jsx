// SiteAddressCard.jsx
import React, { useEffect } from 'react'
import { CRow, CCol, CFormLabel, CFormInput } from '@coreui/react'

const SiteAddressCard = ({ formData, setFormData, selectedClient }) => {
  useEffect(() => {
    if (
      selectedClient &&
      !formData.siteAddress // only auto-fill if empty
    ) {
      const full = [
        selectedClient.address,
        selectedClient.zip && selectedClient.city
          ? `${selectedClient.zip} ${selectedClient.city}`
          : selectedClient.zip || selectedClient.city,
        selectedClient.state,
      ]
        .filter(Boolean)
        .join(', ')

      setFormData((prev) => ({ ...prev, siteAddress: full }))
    }
  }, [selectedClient, formData.siteAddress, setFormData])

  return (
    <CRow className="g-3 mb-3">
      <CCol md={12}>
        <CFormLabel>Site Address</CFormLabel>
        <CFormInput
          name="siteAddress"
          placeholder="Enter full site address"
          value={formData.siteAddress || ''}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              siteAddress: e.target.value,
            }))
          }
        />
      </CCol>
    </CRow>
  )
}

export default SiteAddressCard
