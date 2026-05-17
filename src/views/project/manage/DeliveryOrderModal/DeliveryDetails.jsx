// src/views/project/DeliveryDetails.jsx
import React from 'react'
import {
  CCardHeader,
  CCardBody,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
} from '@coreui/react'

/**
 * Editable Delivery Details form
 * @param {{ name: string, address: string, contact: { name: string, position?: string, email: string, phone: string } }} client
 * @param {Function} setClient
 * @param {{ name: string, address: string, contact: { name: string, email: string, phone: string } }} company
 * @param {Function} setCompany
 */
const DeliveryDetails = ({ client, setClient, company, setCompany }) => {
  const handleClientField = (field) => (e) => setClient({ ...client, [field]: e.target.value })
  const handleClientContact = (field) => (e) =>
    setClient({
      ...client,
      contact: { ...client.contact, [field]: e.target.value },
    })

  const handleCompanyField = (field) => (e) => setCompany({ ...company, [field]: e.target.value })
  const handleCompanyContact = (field) => (e) =>
    setCompany({
      ...company,
      contact: { ...company.contact, [field]: e.target.value },
    })

  return (
    <>
      <CCardHeader>
        <strong>Delivery Order Details</strong>
      </CCardHeader>
      <CCardBody>
        <CRow>
          <CCol md={6}>
            <strong>Delivered To</strong>
            <div className="mb-3">
              <CFormLabel>Client Name</CFormLabel>
              <CFormInput type="text" value={client.name} onChange={handleClientField('name')} />
            </div>
            <div className="mb-3">
              <CFormLabel>Address</CFormLabel>
              <CFormTextarea
                value={client.address}
                onChange={handleClientField('address')}
                rows={3}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Contact Person</CFormLabel>
              <div className="d-flex gap-3">
                <CFormInput
                  type="text"
                  value={client.contact.name}
                  onChange={handleClientContact('name')}
                  className="flex-grow-1"
                />
                <CFormInput
                  type="text"
                  value={client.contact.position || ''}
                  onChange={handleClientContact('position')}
                  className="w-25"
                  placeholder="Position"
                />
              </div>
            </div>
            <div className="mb-3">
              <CFormLabel>Email</CFormLabel>
              <CFormInput
                type="text"
                value={client.contact.email}
                onChange={handleClientContact('email')}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Phone Number</CFormLabel>
              <CFormInput
                type="text"
                value={client.contact.phone}
                onChange={handleClientContact('phone')}
              />
            </div>
          </CCol>
          <CCol md={6}>
            <strong>Delivered By</strong>
            <div className="mb-3">
              <CFormLabel>Company Name</CFormLabel>
              <CFormInput type="text" value={company.name} onChange={handleCompanyField('name')} />
            </div>
            <div className="mb-3">
              <CFormLabel>Address</CFormLabel>
              <CFormTextarea
                value={company.address}
                onChange={handleCompanyField('address')}
                rows={3}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Contact Person</CFormLabel>
              <CFormInput
                type="text"
                value={company.contact.name}
                onChange={handleCompanyContact('name')}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Email</CFormLabel>
              <CFormInput
                type="text"
                value={company.contact.email}
                onChange={handleCompanyContact('email')}
              />
            </div>
            <div className="mb-3">
              <CFormLabel>Phone Number</CFormLabel>
              <CFormInput
                type="text"
                value={company.contact.phone}
                onChange={handleCompanyContact('phone')}
              />
            </div>
          </CCol>
        </CRow>
      </CCardBody>
    </>
  )
}

export default DeliveryDetails
