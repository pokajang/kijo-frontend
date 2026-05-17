import React from 'react'
import { CCol, CFormLabel, CFormInput, CFormSelect } from '@coreui/react'

const MALAYSIA_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Wilayah Persekutuan Kuala Lumpur',
  'Wilayah Persekutuan Labuan',
  'Wilayah Persekutuan Putrajaya',
]

const BranchFormFields = ({ form, onFieldChange, onCountryChange }) => {
  const isInternational = (form.country || 'Malaysia') !== 'Malaysia'

  return (
    <>
      <CCol md={3}>
        <CFormLabel>Branch Name</CFormLabel>
        <CFormInput
          name="branch_name"
          value={form.branch_name}
          onChange={onFieldChange}
          placeholder="e.g. HQ / Penang"
        />
      </CCol>
      <CCol md={6}>
        <CFormLabel>Address</CFormLabel>
        <CFormInput
          name="address"
          value={form.address}
          onChange={onFieldChange}
          placeholder="Street address"
        />
      </CCol>
      <CCol md={3}>
        <CFormLabel>City</CFormLabel>
        <CFormInput name="city" value={form.city} onChange={onFieldChange} />
      </CCol>
      <CCol md={3}>
        <CFormLabel>Country</CFormLabel>
        <CFormSelect name="country" value={form.country} onChange={onCountryChange}>
          <option value="Malaysia">Malaysia</option>
          <option value="Other">Other (specify)</option>
        </CFormSelect>
      </CCol>
      {isInternational && (
        <CCol md={3}>
          <CFormLabel>Country Name</CFormLabel>
          <CFormInput name="intlCountry" value={form.intlCountry || ''} onChange={onFieldChange} />
        </CCol>
      )}
      <CCol md={3}>
        <CFormLabel>{isInternational ? 'State / Province / Region' : 'State'}</CFormLabel>
        {!isInternational ? (
          <CFormSelect name="state" value={form.state} onChange={onFieldChange}>
            <option value="">Choose state</option>
            {MALAYSIA_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </CFormSelect>
        ) : (
          <CFormInput name="state" value={form.state} onChange={onFieldChange} />
        )}
      </CCol>
      <CCol md={3}>
        <CFormLabel>{isInternational ? 'Postal Code' : 'Zip'}</CFormLabel>
        <CFormInput name="zip" value={form.zip} onChange={onFieldChange} />
      </CCol>
    </>
  )
}

export default BranchFormFields
