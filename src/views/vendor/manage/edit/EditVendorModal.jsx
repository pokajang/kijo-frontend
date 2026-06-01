import React from 'react'
import {
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CButton,
  CFormInput,
  CCol,
  CRow,
  CFormLabel,
  CFormCheck,
  CCard,
  CCardBody,
  CCardHeader,
  CFormSelect,
} from '@coreui/react'

import MultilineInput from '../../../../components/forms/MultilineInput'
import dialog from '../../../../components/dialog/dialogService'

const EditVendorModal = ({ visible, vendor, setVendor, onClose, onSave }) => {
  // const handleChange = (e) => {
  //   const { name, value } = e.target
  //   setVendor({ ...vendor, [name]: value })
  // }

  const handleChange = (e) => {
    const { name, value } = e.target

    if (!name) {
      console.warn('⚠️ Ignored change: event has no name attribute', e.target)
      return
    }

    setVendor({ ...vendor, [name]: value })
  }

  const dependentFieldMap = {
    Trainer: ['trainingTopics', 'trainingTopicsText'],
    'Competent Person': ['competency'],
    'Equipment Supplier': ['supplierProducts', 'supplierProductsText'],
    Consultant: ['consultancy', 'consultancyText'],
    'Service Provider': ['servicesOffered', 'servicesOfferedText'],
  }

  const handleCheckboxChange = async (field, value) => {
    const current = vendor[field] || []
    const isRemoving = current.includes(value)

    if (isRemoving) {
      const confirmed = await dialog.confirm(
        'Unchecking this Vendor Category will clear its related data, but you can re-enter it later. Continue?',
      )
      if (!confirmed) {
        return
      }
    }

    const updated = isRemoving ? current.filter((v) => v !== value) : [...current, value]
    const nextVendor = { ...vendor, [field]: updated }

    if (isRemoving) {
      ;(dependentFieldMap[value] || []).forEach((dependentKey) => {
        nextVendor[dependentKey] = Array.isArray(nextVendor[dependentKey]) ? [] : ''
      })
    }

    setVendor(nextVendor)
  }

  const categoryOptions = [
    'Trainer',
    'Consultant',
    'Competent Person',
    'Service Provider',
    'Equipment Supplier',
  ]

  const competencyOptions = [
    'Safety and Health Officer',
    'Site Safety Supervisor',
    'Hygiene Technician 1',
    'Hygiene Technician 2',
    'Authorized Entrant and Standby Person',
    'Authorized Gas Tester and Entry Supervisor',
    'Indoor Air Quality Assessor',
    'Noise Risk Assessor',
    'Chemical Health Risk Assessor',
    'Occupational Health Doctor',
  ]

  return (
    <CModal
      visible={visible}
      onClose={onClose}
      size="xl"
      alignment="center"
      backdrop="static"
      scrollable
    >
      <CModalHeader>
        <CModalTitle>Edit Vendor</CModalTitle>
      </CModalHeader>

      <CModalBody>
        <CCard>
          {/* Vendor Details */}
          <CCardHeader>
            <strong>Vendor Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={6}>
                <CFormLabel htmlFor="vendorName">Vendor Name</CFormLabel>
                <CFormInput
                  name="vendorName"
                  value={vendor?.vendorName || ''}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="ssmNumber">SSM Number</CFormLabel>
                <CFormInput
                  name="ssmNumber"
                  value={vendor?.ssmNumber || ''}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel htmlFor="sstNo">SST Number</CFormLabel>
                <CFormInput name="sstNo" value={vendor?.sstNo || ''} onChange={handleChange} />
              </CCol>

              <CCol md={12}>
                <CFormLabel htmlFor="address">Address</CFormLabel>
                <CFormInput name="address" value={vendor?.address || ''} onChange={handleChange} />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="city">City</CFormLabel>
                <CFormInput name="city" value={vendor?.city || ''} onChange={handleChange} />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="state">State</CFormLabel>
                <CFormSelect
                  id="state"
                  name="state"
                  value={vendor?.state || ''}
                  onChange={handleChange}
                >
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
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="zip">Zip Code</CFormLabel>
                <CFormInput name="zip" value={vendor?.zip || ''} onChange={handleChange} />
              </CCol>
            </CRow>
          </CCardBody>

          {/* Contact */}
          <CCardHeader>
            <strong>Contact Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={3}>
                <CFormLabel>Contact Person</CFormLabel>
                <CFormInput
                  name="contactPersonName"
                  value={vendor?.contactPersonName || ''}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Mobile Number</CFormLabel>
                <CFormInput
                  name="mobileNumber"
                  value={vendor?.mobileNumber || ''}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput name="email" value={vendor?.email || ''} onChange={handleChange} />
              </CCol>
              <CCol md={3}>
                <CFormLabel>Website</CFormLabel>
                <CFormInput
                  name="companyWebsite"
                  value={vendor?.companyWebsite || ''}
                  onChange={handleChange}
                />
              </CCol>
            </CRow>

            <CRow className="g-3 mt-3">
              <CCol md={4}>
                <CFormLabel>Emergency Contact Name</CFormLabel>
                <CFormInput
                  name="emergencyContactName"
                  value={vendor?.emergencyContactName || ''}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Relationship</CFormLabel>
                <CFormInput
                  name="emergencyRelationship"
                  value={vendor?.emergencyRelationship || ''}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Emergency Contact Number</CFormLabel>
                <CFormInput
                  name="emergencyMobileNumber"
                  value={vendor?.emergencyMobileNumber || ''}
                  onChange={handleChange}
                />
              </CCol>
            </CRow>
          </CCardBody>

          {/* Category */}
          <CCardHeader>
            <strong>Vendor Type</strong>
          </CCardHeader>
          <CCardBody>
            <CRow>
              <CCol>
                <CFormLabel>Category</CFormLabel>
                <div className="d-flex flex-wrap">
                  {categoryOptions.map((cat) => (
                    <CFormCheck
                      key={cat}
                      label={cat}
                      value={cat}
                      checked={vendor?.category?.includes(cat)}
                      onChange={() => handleCheckboxChange('category', cat)}
                      className="me-3 mb-2"
                    />
                  ))}
                </div>
              </CCol>
            </CRow>
          </CCardBody>

          {/* Trainer */}
          {vendor?.category?.includes('Trainer') && (
            <>
              <CCardHeader>
                <strong>Training Topics</strong>
              </CCardHeader>
              <CCardBody>
                <MultilineInput
                  label="Training Topics (one per line)"
                  valueKey="trainingTopics"
                  textKey="trainingTopicsText"
                  formData={vendor}
                  setFormData={setVendor}
                />
              </CCardBody>
            </>
          )}

          {/* Competency */}
          {vendor?.category?.includes('Competent Person') && (
            <>
              <CCardHeader>
                <strong>Competency Details</strong>
              </CCardHeader>
              <CCardBody>
                <CFormLabel>List of Competencies</CFormLabel>
                <div className="d-flex flex-wrap">
                  {competencyOptions.map((comp) => (
                    <CFormCheck
                      key={comp}
                      label={comp}
                      value={comp}
                      checked={vendor?.competency?.includes(comp)}
                      onChange={() => handleCheckboxChange('competency', comp)}
                      className="me-3 mb-2"
                    />
                  ))}
                </div>
              </CCardBody>
            </>
          )}

          {/* Supplier */}
          {vendor?.category?.includes('Equipment Supplier') && (
            <>
              <CCardHeader>
                <strong>Products Supplied</strong>
              </CCardHeader>
              <CCardBody>
                <MultilineInput
                  label="Products Supplied (one per line)"
                  valueKey="supplierProducts"
                  textKey="supplierProductsText"
                  formData={vendor}
                  setFormData={setVendor}
                />
              </CCardBody>
            </>
          )}

          {/* Consultant */}
          {vendor?.category?.includes('Consultant') && (
            <>
              <CCardHeader>
                <strong>Consulting Fields</strong>
              </CCardHeader>
              <CCardBody>
                <MultilineInput
                  label="Fields of Consulting (one per line)"
                  valueKey="consultancy"
                  textKey="consultancyText"
                  formData={vendor}
                  setFormData={setVendor}
                />
              </CCardBody>
            </>
          )}

          {/* Service Provider */}
          {vendor?.category?.includes('Service Provider') && (
            <>
              <CCardHeader>
                <strong>Services Offered</strong>
              </CCardHeader>
              <CCardBody>
                <MultilineInput
                  label="Services Offered (one per line)"
                  valueKey="servicesOffered"
                  textKey="servicesOfferedText"
                  formData={vendor}
                  setFormData={setVendor}
                />
              </CCardBody>
            </>
          )}

          {/* Banking */}
          <CCardHeader>
            <strong>Banking Details</strong>
          </CCardHeader>
          <CCardBody>
            <CRow className="g-3">
              <CCol md={4}>
                <CFormLabel>Bank Name</CFormLabel>
                <CFormInput
                  name="bankName"
                  value={vendor?.bankName || ''}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Bank Account Number</CFormLabel>
                <CFormInput
                  name="bankAccountNumber"
                  value={vendor?.bankAccountNumber || ''}
                  onChange={handleChange}
                />
              </CCol>
              <CCol md={4}>
                <CFormLabel>Bank Holder Name</CFormLabel>
                <CFormInput
                  name="bankHolderName"
                  value={vendor?.bankHolderName || ''}
                  onChange={handleChange}
                />
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CModalBody>

      <CModalFooter>
        <CButton color="secondary" variant="outline" size="sm" onClick={onClose}>
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={() => onSave(vendor)}>
          Save Changes
        </CButton>
      </CModalFooter>
    </CModal>
  )
}

export default EditVendorModal
