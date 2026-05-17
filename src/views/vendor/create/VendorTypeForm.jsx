// /vendor/create/VendorTypeForm.jsx

import React from 'react'
import { CCard, CCardBody, CCardHeader, CCol, CFormCheck, CFormLabel, CRow } from '@coreui/react'
import MultilineInput from '../../../components/forms/MultilineInput'

const VendorTypeForm = ({ formData, setFormData }) => {
  const handleCheckboxChange = (field, value) => {
    const currentValues = formData[field] || []
    const updatedValues = currentValues.includes(value)
      ? currentValues.filter((item) => item !== value)
      : [...currentValues, value]
    setFormData({ ...formData, [field]: updatedValues })
  }

  return (
    <CCol xs={12}>
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Vendor Type</strong>
        </CCardHeader>
        <CCardBody>
          <CRow className="g-3">
            <CCol md={12}>
              <CFormLabel htmlFor="category">Category (Multiple allowed)</CFormLabel>
              <CRow>
                <CCol xs={12} className="d-flex flex-wrap">
                  {[
                    'Trainer',
                    'Competent Person',
                    'Equipment Supplier',
                    'Consultant',
                    'Service Provider',
                  ].map((category) => (
                    <CFormCheck
                      key={category}
                      type="checkbox"
                      label={category}
                      value={category}
                      checked={formData.category.includes(category)}
                      onChange={() => handleCheckboxChange('category', category)}
                      className="me-3 mb-2"
                    />
                  ))}
                </CCol>
              </CRow>
            </CCol>
          </CRow>
        </CCardBody>

        {/* Trainer Section */}
        {formData.category.includes('Trainer') && (
          <>
            <CCardHeader>
              <strong>Training Service Details</strong>
            </CCardHeader>
            <CCardBody>
              <MultilineInput
                label="Training Topics (one per line)"
                placeholder={`e.g. Safety and Health Committee\nHazard Identification Risk Assessment and Risk Control\nBasic Fire Safety`}
                valueKey="trainingTopics"
                textKey="trainingTopicsText"
                formData={formData}
                setFormData={setFormData}
              />
            </CCardBody>
          </>
        )}

        {/* Competent Person Section */}
        {formData.category.includes('Competent Person') && (
          <>
            <CCardHeader>
              <strong>Competency Details</strong>
            </CCardHeader>
            <CCardBody>
              <CFormLabel htmlFor="competency">List of Competencies</CFormLabel>
              <CCol xs={12} className="d-flex flex-wrap">
                {[
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
                ].map((competency) => (
                  <CFormCheck
                    key={competency}
                    type="checkbox"
                    label={competency}
                    value={competency}
                    checked={formData.competency?.includes(competency)}
                    onChange={() => handleCheckboxChange('competency', competency)}
                    className="me-3 mb-2"
                  />
                ))}
              </CCol>
            </CCardBody>
          </>
        )}

        {/* Equipment Supplier Section */}
        {formData.category.includes('Equipment Supplier') && (
          <>
            <CCardHeader>
              <strong>Product Supplies Details</strong>
            </CCardHeader>
            <CCardBody>
              <MultilineInput
                label="Products Supplied (one per line)"
                placeholder={`e.g. Personal Protective Equipment\nChemical Spillage Kit\nFire Suppression System`}
                valueKey="supplierProducts"
                textKey="supplierProductsText"
                formData={formData}
                setFormData={setFormData}
              />
            </CCardBody>
          </>
        )}

        {/* Consultant Section */}
        {formData.category.includes('Consultant') && (
          <>
            <CCardHeader>
              <strong>Consultancy Details</strong>
            </CCardHeader>
            <CCardBody>
              <MultilineInput
                label="Fields of Consulting (one per line)"
                placeholder={`e.g. Development of ISO related documents\nMarketing and client pitching\nHuman Resources services`}
                valueKey="consultancy"
                textKey="consultancyText"
                formData={formData}
                setFormData={setFormData}
              />
            </CCardBody>
          </>
        )}

        {/* Service Provider Section */}
        {formData.category.includes('Service Provider') && (
          <>
            <CCardHeader>
              <strong>Services Offered</strong>
            </CCardHeader>
            <CCardBody>
              <MultilineInput
                label="Services Offered (one per line)"
                placeholder={`e.g. Industrial Cleaning\nEngineering Drawing and Endorsement\nManpower Supply`}
                valueKey="servicesOffered"
                textKey="servicesOfferedText"
                formData={formData}
                setFormData={setFormData}
              />
            </CCardBody>
          </>
        )}
      </CCard>
    </CCol>
  )
}

export default VendorTypeForm
