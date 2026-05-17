import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CForm,
  CFormInput,
  CFormLabel,
  CFormTextarea,
  CButton,
} from '@coreui/react'

import { CAlert } from '@coreui/react'
import { Editor } from '@tinymce/tinymce-react'

// import dummy data
import companyData from './companyData'
import { sanitizeDisplayHtml } from '../templates/shared/templateUtils'

const renderTermsHtml = (html) => ({
  __html: sanitizeDisplayHtml(html) || '<p>-</p>',
})

const CompanySettings = () => {
  // Initialize Business Information with data from companyData
  const [businessInfo, setBusinessInfo] = useState(companyData.businessInfo)

  // Initialize Banking Information with data from companyData
  const [bankingInfo, setBankingInfo] = useState(companyData.bankingInfo)

  // Initialize Terms & Conditions with data from companyData
  const [salesTerms, setSalesTerms] = useState(companyData.salesTerms)
  const [trainingTerms, setTrainingTerms] = useState(companyData.trainingTerms)
  const [manpowerTerms, setManpowerTerms] = useState(companyData.manpowerTerms)
  const [hygieneTerms, setHygieneTerms] = useState(companyData.hygieneTerms)
  const [isoConsultationTerms, setIsoConsultationTerms] = useState(companyData.isoConsultationTerms)

  // States for handling 'Edit' button in different form fields
  const [editStates, setEditStates] = useState({
    business: false,
    banking: false,
    sales: false,
    training: false,
    manpower: false,
    hygiene: false,
    isoConsultation: false,
  })

  // Handle change for Business Information inputs
  const handleBusinessChange = (e) => {
    e.preventDefault()
    const { name, value } = e.target
    setBusinessInfo((prev) => ({ ...prev, [name]: value }))
  }

  // Handle change for Banking Information inputs
  const handleBankingChange = (e) => {
    const { name, value } = e.target
    setBankingInfo((prev) => ({ ...prev, [name]: value }))
  }

  // Handle overall form submission
  const handleSubmit = (e) => {
    e.preventDefault()
    // For demonstration purposes, we log the details to the console.
    console.log('Business Information:', businessInfo)
    console.log('Banking Information:', bankingInfo)
    console.log('Sales Terms & Conditions:', salesTerms)
    console.log('Training Service Terms & Conditions:', trainingTerms)
    // An API call can be made here to persist settings
  }

  // Single Handle Edit button for all Edit buttons
  // Generic handler to toggle a specific section's edit mode
  const toggleEditMode = (section) => {
    setEditStates((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  // Unified handleSaveClick for all Save buttons
  const handleSaveClick = (section) => {
    // Perform your save logic here (e.g., API call or state update)
    console.log(`Saving changes for ${section}`)

    // After saving, toggle off the editing mode for that section
    setEditStates((prevState) => ({
      ...prevState,
      [section]: false,
    }))
  }

  // Unified handleCancleClick for all Cancel buttons
  const handleCancelClick = (section) => {
    // Optionally reset any unsaved changes here
    setEditStates((prev) => ({ ...prev, [section]: false }))
  }

  return (
    <CRow>
      <CCol xs={12} className="mb-4">
        <CAlert color="warning" dismissible>
          <strong>
            Warning: Be cautious updating key business details—they will affect all transaction
            records (e.g., quotes, invoices, delivery orders, receipts, etc.).
          </strong>
        </CAlert>
        <CForm onSubmit={handleSubmit}>
          {/* Business Information Card */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Business Information</strong>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel htmlFor="companyName">Company Name</CFormLabel>
                  <CFormInput
                    type="text"
                    id="companyName"
                    name="companyName"
                    value={businessInfo.companyName}
                    onChange={handleBusinessChange}
                    autoComplete="off"
                    disabled={!editStates['business']}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="defaultEmail">Default Email Address</CFormLabel>
                  <CFormInput
                    type="email"
                    id="defaultEmail"
                    name="defaultEmail"
                    value={businessInfo.defaultEmail}
                    onChange={handleBusinessChange}
                    autoComplete="off"
                    disabled={!editStates['business']}
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="phoneNumber">Phone Number</CFormLabel>
                  <CFormInput
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={businessInfo.phoneNumber}
                    onChange={handleBusinessChange}
                    autoComplete="off"
                    disabled={!editStates['business']}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel htmlFor="sstNumber">SST Number</CFormLabel>
                  <CFormInput
                    type="text"
                    id="sstNumber"
                    name="sstNumber"
                    value={businessInfo.sstNumber}
                    onChange={handleBusinessChange}
                    autoComplete="off"
                    disabled={!editStates['business']}
                  />
                </CCol>
                <CCol md={3}>
                  <CFormLabel htmlFor="ssmRegistrationNumber">SSM Registration Number</CFormLabel>
                  <CFormInput
                    type="text"
                    id="ssmRegistrationNumber"
                    name="ssmRegistrationNumber"
                    value={businessInfo.ssmRegistrationNumber}
                    onChange={handleBusinessChange}
                    autoComplete="off"
                    disabled={!editStates['business']}
                  />
                </CCol>
                <CCol xs={6}>
                  <CFormLabel htmlFor="address">Address</CFormLabel>
                  <CFormInput
                    type="text"
                    id="address"
                    name="address"
                    value={businessInfo.address}
                    onChange={handleBusinessChange}
                    autoComplete="off"
                    disabled={!editStates['business']}
                  />
                </CCol>
                <CCol xs={12} className="d-flex gap-2">
                  {!editStates['business'] ? (
                    <CButton color="primary" onClick={() => toggleEditMode('business')}>
                      Edit
                    </CButton>
                  ) : (
                    <>
                      <CButton color="secondary" onClick={() => handleCancelClick('business')}>
                        Cancel
                      </CButton>
                      <CButton color="primary" onClick={() => handleSaveClick('business')}>
                        Save
                      </CButton>
                    </>
                  )}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          {/* Banking Information */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Banking Information</strong>
            </CCardHeader>
            <CCardBody>
              <CRow className="g-3">
                <CCol md={4}>
                  <CFormLabel htmlFor="bankName">Bank Name</CFormLabel>
                  <CFormInput
                    type="text"
                    id="bankName"
                    name="bankName"
                    value={bankingInfo.bankName}
                    onChange={handleBankingChange}
                    autoComplete="off"
                    disabled={!editStates['banking']} // Fields are disabled unless in edit mode
                  />
                </CCol>
                <CCol md={4}>
                  <CFormLabel htmlFor="accountHolderName">Account Holder Name</CFormLabel>
                  <CFormInput
                    type="text"
                    id="accountHolderName"
                    name="accountHolderName"
                    value={bankingInfo.accountHolderName}
                    onChange={handleBankingChange}
                    autoComplete="off"
                    disabled={!editStates['banking']}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel htmlFor="bankAccountNumber">Bank Account Number</CFormLabel>
                  <CFormInput
                    type="text"
                    id="bankAccountNumber"
                    name="bankAccountNumber"
                    value={bankingInfo.bankAccountNumber}
                    onChange={handleBankingChange}
                    autoComplete="off"
                    disabled={!editStates['banking']}
                  />
                </CCol>
                <CCol md={2}>
                  <CFormLabel htmlFor="swiftCode">SWIFT Code</CFormLabel>
                  <CFormInput
                    type="text"
                    id="swiftCode"
                    name="swiftCode"
                    value={bankingInfo.swiftCode}
                    onChange={handleBankingChange}
                    autoComplete="off"
                    disabled={!editStates['banking']}
                  />
                </CCol>
                <CCol xs={12} className="d-flex gap-2">
                  {!editStates['banking'] ? (
                    <CButton color="primary" onClick={() => toggleEditMode('banking')}>
                      Edit
                    </CButton>
                  ) : (
                    <>
                      <CButton color="secondary" onClick={() => handleCancelClick('banking')}>
                        Cancel
                      </CButton>
                      <CButton color="primary" onClick={() => handleSaveClick('banking')}>
                        Save
                      </CButton>
                    </>
                  )}
                </CCol>
              </CRow>
            </CCardBody>
          </CCard>

          {/* Default Terms and Conditions */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Common Sales Terms & Conditions</strong>
              <small className="m-3">Common T&Cs for all of services. To be used everywhere.</small>
            </CCardHeader>
            <CCardBody>
              <CFormLabel htmlFor="salesTerms">Terms & Conditions</CFormLabel>
              {!editStates['sales'] ? (
                // View Mode: Render the content as HTML.
                <div dangerouslySetInnerHTML={renderTermsHtml(salesTerms)} />
              ) : (
                // Edit Mode: Render TinyMCE editor.
                <Editor
                  tinymceScriptSrc="/tinymce/tinymce.min.js" // 👈 Load local TinyMCE
                  value={salesTerms}
                  init={{
                    license_key: 'gpl', // 👈 GPL mode for self-hosted use
                    branding: false,
                    height: 300,
                    menubar: false,
                    plugins: 'lists link image code',
                    toolbar:
                      'undo redo | formatselect | bold italic underline | bullist numlist outdent indent | removeformat',
                  }}
                  onEditorChange={(content) => setSalesTerms(content)}
                />
              )}
              <CCol xs={12} className="d-flex gap-2 mt-3">
                {!editStates['sales'] ? (
                  <CButton color="primary" onClick={() => toggleEditMode('sales')}>
                    Edit
                  </CButton>
                ) : (
                  <>
                    <CButton color="secondary" onClick={() => handleCancelClick('sales')}>
                      Cancel
                    </CButton>
                    <CButton color="primary" onClick={() => handleSaveClick('sales')}>
                      Save
                    </CButton>
                  </>
                )}
              </CCol>
            </CCardBody>
          </CCard>

          <CAlert color="primary">
            Note: Specific terms and conditions below will be used in addition to the Default T&Cs
            in relevant quotations. Be mindful when editing not to incur redundant points.
          </CAlert>

          {/* Training Service Terms & Conditions Card */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Training Service Terms & Conditions</strong>
            </CCardHeader>
            <CCardBody>
              <CFormLabel htmlFor="trainingTerms">Terms & Conditions</CFormLabel>
              {!editStates['training'] ? (
                // View Mode: Render saved HTML as a bullet list.
                <div dangerouslySetInnerHTML={renderTermsHtml(trainingTerms)} />
              ) : (
                // Edit Mode: Render the TinyMCE editor.
                <Editor
                  tinymceScriptSrc="/tinymce/tinymce.min.js" // 👈 Loads from public folder
                  value={trainingTerms}
                  init={{
                    license_key: 'gpl', // 👈 Enables GPL mode (no API key needed)
                    height: 300,
                    menubar: false,
                    branding: false, // Disable TinyMCE branding.
                    plugins: 'lists link image code',
                    toolbar:
                      'undo redo | formatselect | bold italic underline | bullist numlist outdent indent | removeformat',
                  }}
                  onEditorChange={(content) => setTrainingTerms(content)}
                />
              )}
              <CCol xs={12} className="d-flex gap-2 mt-3">
                {!editStates['training'] ? (
                  <CButton color="primary" onClick={() => toggleEditMode('training')}>
                    Edit
                  </CButton>
                ) : (
                  <>
                    <CButton color="secondary" onClick={() => handleCancelClick('training')}>
                      Cancel
                    </CButton>
                    <CButton color="primary" onClick={() => handleSaveClick('training')}>
                      Save
                    </CButton>
                  </>
                )}
              </CCol>
            </CCardBody>
          </CCard>

          {/* Manpower Supply Terms & Conditions Card */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Manpower Supply Service Terms & Conditions</strong>
              <small className="m-3">Specific T&Cs for manpower supply services.</small>
            </CCardHeader>
            <CCardBody>
              <CFormLabel htmlFor="manpowerTerms">Terms & Conditions</CFormLabel>
              {!editStates['manpower'] ? (
                // View Mode: Render saved HTML as a bullet list.
                <div dangerouslySetInnerHTML={renderTermsHtml(manpowerTerms)} />
              ) : (
                // Edit Mode: Render the TinyMCE editor.
                <Editor
                  tinymceScriptSrc="/tinymce/tinymce.min.js" // 👈 Loads from public folder
                  value={manpowerTerms}
                  init={{
                    license_key: 'gpl', // 👈 Enables GPL mode (no API key needed)
                    height: 300,
                    menubar: false,
                    branding: false, // Disable TinyMCE branding.
                    plugins: 'lists link image code',
                    toolbar:
                      'undo redo | formatselect | bold italic underline | bullist numlist outdent indent | removeformat',
                  }}
                  onEditorChange={(content) => setManpowerTerms(content)}
                />
              )}
              <CCol xs={12} className="d-flex gap-2 mt-3">
                {!editStates['manpower'] ? (
                  <CButton color="primary" onClick={() => toggleEditMode('manpower')}>
                    Edit
                  </CButton>
                ) : (
                  <>
                    <CButton color="secondary" onClick={() => handleCancelClick('manpower')}>
                      Cancel
                    </CButton>
                    <CButton color="primary" onClick={() => handleSaveClick('manpower')}>
                      Save
                    </CButton>
                  </>
                )}
              </CCol>
            </CCardBody>
          </CCard>

          {/* Industrial Hygiene Terms & Conditions Card */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>Industrial Hygiene Service Terms & Conditions</strong>
            </CCardHeader>
            <CCardBody>
              <CFormLabel htmlFor="hygieneTerms">Terms & Conditions</CFormLabel>
              {!editStates['hygiene'] ? (
                // View Mode: Render saved HTML as a bullet list.
                <div dangerouslySetInnerHTML={renderTermsHtml(hygieneTerms)} />
              ) : (
                // Edit Mode: Render the TinyMCE editor.
                <Editor
                  tinymceScriptSrc="/tinymce/tinymce.min.js" // 👈 Loads from public folder
                  value={hygieneTerms}
                  init={{
                    license_key: 'gpl', // 👈 Enables GPL mode (no API key needed)
                    height: 300,
                    menubar: false,
                    branding: false, // Disable TinyMCE branding.
                    plugins: 'lists link image code',
                    toolbar:
                      'undo redo | formatselect | bold italic underline | bullist numlist outdent indent | removeformat',
                  }}
                  onEditorChange={(content) => setHygieneTerms(content)}
                />
              )}
              <CCol xs={12} className="d-flex gap-2 mt-3">
                {!editStates['hygiene'] ? (
                  <CButton color="primary" onClick={() => toggleEditMode('hygiene')}>
                    Edit
                  </CButton>
                ) : (
                  <>
                    <CButton color="secondary" onClick={() => handleCancelClick('hygiene')}>
                      Cancel
                    </CButton>
                    <CButton color="primary" onClick={() => handleSaveClick('hygiene')}>
                      Save
                    </CButton>
                  </>
                )}
              </CCol>
            </CCardBody>
          </CCard>

          {/* ISO Consultations Terms & Conditions Card */}
          <CCard className="mb-4">
            <CCardHeader>
              <strong>ISO Consultation Service Terms & Conditions</strong>
            </CCardHeader>
            <CCardBody>
              <CFormLabel htmlFor="isoConsultationTerms">Terms & Conditions</CFormLabel>
              {!editStates['isoConsultation'] ? (
                // View Mode: Render saved HTML as a bullet list.
                <div dangerouslySetInnerHTML={renderTermsHtml(isoConsultationTerms)} />
              ) : (
                // Edit Mode: Render the TinyMCE editor.
                <Editor
                  tinymceScriptSrc="/tinymce/tinymce.min.js" // 👈 Loads from public folder
                  value={isoConsultationTerms}
                  init={{
                    license_key: 'gpl', // 👈 Enables GPL mode (no API key needed)
                    height: 300,
                    menubar: false,
                    branding: false, // Disable TinyMCE branding.
                    plugins: 'lists link image code',
                    toolbar:
                      'undo redo | formatselect | bold italic underline | bullist numlist outdent indent | removeformat',
                  }}
                  onEditorChange={(content) => setIsoConsultationTerms(content)}
                />
              )}
              <CCol xs={12} className="d-flex gap-2 mt-3">
                {!editStates['isoConsultation'] ? (
                  <CButton color="primary" onClick={() => toggleEditMode('isoConsultation')}>
                    Edit
                  </CButton>
                ) : (
                  <>
                    <CButton color="secondary" onClick={() => handleCancelClick('isoConsultation')}>
                      Cancel
                    </CButton>
                    <CButton color="primary" onClick={() => handleSaveClick('isoConsultation')}>
                      Save
                    </CButton>
                  </>
                )}
              </CCol>
            </CCardBody>
          </CCard>
        </CForm>
      </CCol>
    </CRow>
  )
}

export default CompanySettings
