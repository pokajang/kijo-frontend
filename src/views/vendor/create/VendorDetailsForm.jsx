// /vendor/create/VendorDetailsForm.jsx

import React from 'react'
import {
  CButton,
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CAlert,
  CForm,
} from '@coreui/react'

const VendorDetailsForm = ({
  formData,
  setFormData,
  handleChange,
  handleNameInputChange,
  isDuplicate,
  duplicateVendorName,
  partialMatchCompany,
  onBack,
}) => {
  const isInternational = formData.country && formData.country !== 'Malaysia'

  // trim spaces + trailing punctuation on blur for select inputs
  const trimOnBlur = (name) => (e) => {
    const cleaned = (e.target.value || '').trim().replace(/[\s,;:/\\.!-]+$/g, '')
    if (cleaned !== e.target.value) {
      handleChange({ target: { name, value: cleaned } })
    }
  }

  // handle country switch: clear intlCountry when going back to Malaysia,
  // clear state when switching to Other (so users re-enter a non-MY region)
  const handleCountryChange = (e) => {
    const { value } = e.target
    if (value === 'Malaysia') {
      handleChange({ target: { name: 'country', value } })
      handleChange({ target: { name: 'intlCountry', value: '' } })
    } else {
      handleChange({ target: { name: 'country', value } })
      handleChange({ target: { name: 'state', value: '' } })
    }
  }

  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
            <strong>Vendor Details</strong>
            <CButton size="sm" color="secondary" variant="outline" onClick={onBack}>
              Back
            </CButton>
          </div>
        </CCardHeader>
        <CCardBody>
          <CForm autoComplete="off" className="row g-3">
            <CCol md={9}>
              <CFormLabel htmlFor="vendorName">
                Vendor Name (Company/Person) <span className="text-danger">*</span>
              </CFormLabel>
              <CFormInput
                name="vendorName"
                value={formData.vendorName}
                onChange={handleNameInputChange}
                onBlur={trimOnBlur('vendorName')}
              />
              {isDuplicate && (
                <CAlert color="danger" className="mt-2">
                  <strong>{duplicateVendorName}</strong> already exists.
                </CAlert>
              )}
              {!isDuplicate && partialMatchCompany && (
                <CAlert color="primary" className="mt-2">
                  <strong>{partialMatchCompany}</strong> looks similar. Check Manage tab.
                </CAlert>
              )}
            </CCol>

            <CCol md={3}>
              <CFormLabel htmlFor="sstNo">SST Number (optional)</CFormLabel>
              <CFormInput
                name="sstNo"
                value={formData.sstNo}
                onChange={handleChange}
                onBlur={trimOnBlur('sstNo')}
              />
            </CCol>

            {/* Country selector */}
            <CCol md={4}>
              <CFormLabel htmlFor="country">
                Country <span className="text-danger">*</span>
              </CFormLabel>
              <CFormSelect
                id="country"
                name="country"
                value={formData.country}
                onChange={handleCountryChange}
              >
                <option value="Malaysia">Malaysia</option>
                <option value="Other">Other (specify)</option>
              </CFormSelect>
            </CCol>

            {/* When "Other", ask for country name */}
            {isInternational && (
              <CCol md={4}>
                <CFormLabel htmlFor="intlCountry">
                  Country Name <span className="text-danger">*</span>
                </CFormLabel>
                <CFormInput
                  id="intlCountry"
                  name="intlCountry"
                  placeholder="e.g., Singapore, United Kingdom, United States"
                  value={formData.intlCountry}
                  onChange={handleChange}
                  onBlur={trimOnBlur('intlCountry')}
                />
              </CCol>
            )}

            <CCol xs={12}>
              <CFormLabel htmlFor="address">Address</CFormLabel>
              <CFormInput
                name="address"
                value={formData.address}
                onChange={handleChange}
                onBlur={trimOnBlur('address')}
                placeholder="Street address"
              />
            </CCol>

            <CCol md={4}>
              <CFormLabel htmlFor="city">City</CFormLabel>
              <CFormInput
                name="city"
                value={formData.city}
                onChange={handleChange}
                onBlur={trimOnBlur('city')}
                placeholder={isInternational ? 'e.g., Singapore, London' : 'e.g., Shah Alam'}
              />
            </CCol>

            <CCol md={4}>
              <CFormLabel htmlFor="state">
                {isInternational ? 'State / Province / Region' : 'State'}
              </CFormLabel>

              {!isInternational ? (
                <CFormSelect id="state" name="state" value={formData.state} onChange={handleChange}>
                  <option value="">Choose state</option>
                  <option value="Johor">Johor</option>
                  <option value="Kedah">Kedah</option>
                  <option value="Kelantan">Kelantan</option>
                  <option value="Melaka">Melaka</option>
                  <option value="Negeri Sembilan">Negeri Sembilan</option>
                  <option value="Pahang">Pahang</option>
                  <option value="Perak">Perak</option>
                  <option value="Perlis">Perlis</option>
                  <option value="Pulau Pinang">Pulau Pinang</option>
                  <option value="Sabah">Sabah</option>
                  <option value="Sarawak">Sarawak</option>
                  <option value="Selangor">Selangor</option>
                  <option value="Terengganu">Terengganu</option>
                  <option value="Wilayah Persekutuan Kuala Lumpur">
                    Wilayah Persekutuan Kuala Lumpur
                  </option>
                  <option value="Wilayah Persekutuan Labuan">Wilayah Persekutuan Labuan</option>
                  <option value="Wilayah Persekutuan Putrajaya">
                    Wilayah Persekutuan Putrajaya
                  </option>
                </CFormSelect>
              ) : (
                <CFormInput
                  id="state"
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  onBlur={trimOnBlur('state')}
                  placeholder="e.g., California, Ontario, Greater London"
                />
              )}
            </CCol>

            <CCol md={4}>
              <CFormLabel htmlFor="zip">{isInternational ? 'Postal Code' : 'Zip Code'}</CFormLabel>
              <CFormInput
                name="zip"
                value={formData.zip}
                onChange={handleChange}
                onBlur={trimOnBlur('zip')}
                placeholder={isInternational ? 'e.g., 90210, SW1A 1AA, 10200' : 'e.g., 40150'}
              />
            </CCol>
          </CForm>
        </CCardBody>
      </CCard>
    </CCol>
  )
}

export default VendorDetailsForm
