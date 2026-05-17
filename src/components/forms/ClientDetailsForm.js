import React, { useState } from 'react'
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
  CFormSelect,
  CRow,
} from '@coreui/react'

const ClientDetailsForm = ({ clientDetails, setClientDetails, clientDatabase }) => {
  const [typingTimeout, setTypingTimeout] = useState(null)
  const [filteredClients, setFilteredClients] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(-1)
  const [activeInput, setActiveInput] = useState('')
  const [fallbackShown, setFallbackShown] = useState(false)

  const handleInputChange = (e) => {
    const { name, value } = e.target

    // Reset all data if company name cleared
    if (name === 'companyName' && value === '') {
      setClientDetails({
        fullName: '',
        email: '',
        mobileNumber: '',
        position: '',
        companyName: '',
        ssmNumber: '',
        address: '',
        city: '',
        state: '',
        zip: '',
      })
    } else {
      setClientDetails((prev) => ({
        ...prev,
        [name]: value,
      }))
    }

    setHighlightIndex(-1)

    if (name === 'companyName' || name === 'fullName') {
      if (typingTimeout) clearTimeout(typingTimeout)
      const timeout = setTimeout(() => {
        filterClientSuggestions(name, value)
      }, 130)
      setTypingTimeout(timeout)
    }
  }

  const filterClientSuggestions = (field, value) => {
    if (value.length < 2) {
      setFilteredClients([])
      setShowDropdown(false)
      setFallbackShown(false)
      return
    }

    const matches = clientDatabase.filter((client) =>
      client[field]?.toLowerCase().includes(value.toLowerCase()),
    )

    if (matches.length > 0) {
      setFilteredClients(matches)
      setShowDropdown(true)
      setFallbackShown(false)
    } else {
      if (!fallbackShown) {
        setFilteredClients([{ fullName: 'No match found.' }])
        setShowDropdown(true)
        setFallbackShown(true)
      } else {
        setFilteredClients([])
        setShowDropdown(false)
      }
    }
  }

  const handleSelectClient = (client) => {
    if (client.fullName === 'No match found.') {
      setShowDropdown(false)
      setHighlightIndex(-1)
      return
    }
    setClientDetails(client)
    setShowDropdown(false)
    setHighlightIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (!showDropdown || filteredClients.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex((prev) => (prev + 1) % filteredClients.length)
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex((prev) => (prev - 1 + filteredClients.length) % filteredClients.length)
        break
      case 'Enter':
        e.preventDefault()
        if (highlightIndex >= 0) {
          handleSelectClient(filteredClients[highlightIndex])
        }
        break
      default:
        break
    }
  }

  return (
    <>
      {/* Company Details */}
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Company Details</strong>
          </CCardHeader>
          <CCardBody>
            <CForm autoComplete="off" className="row g-3">
              <CCol md={8} className="position-relative">
                <CFormLabel htmlFor="companyName">Company Name</CFormLabel>
                <CFormInput
                  type="text"
                  id="companyName"
                  name="companyName"
                  value={clientDetails.companyName}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setActiveInput('companyName')}
                />
                {activeInput === 'companyName' && showDropdown && (
                  <div className="custom-dropdown">
                    {filteredClients.map((client, idx) => (
                      <div
                        key={idx}
                        className={`dropdown-item ${highlightIndex === idx ? 'highlighted' : ''}`}
                        onClick={() => handleSelectClient(client)}
                      >
                        {client.companyName || client.fullName}
                      </div>
                    ))}
                  </div>
                )}
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="ssmNumber">SSM Number</CFormLabel>
                <CFormInput
                  id="ssmNumber"
                  name="ssmNumber"
                  value={clientDetails.ssmNumber}
                  onChange={handleInputChange}
                />
              </CCol>

              <CCol xs={12}>
                <CFormLabel htmlFor="address">Address</CFormLabel>
                <CFormInput
                  id="address"
                  name="address"
                  value={clientDetails.address}
                  onChange={handleInputChange}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="city">City</CFormLabel>
                <CFormInput
                  id="city"
                  name="city"
                  value={clientDetails.city}
                  onChange={handleInputChange}
                />
              </CCol>

              <CCol md={4}>
                <CFormLabel htmlFor="state">State</CFormLabel>
                <CFormSelect
                  id="state"
                  name="state"
                  value={clientDetails.state}
                  onChange={handleInputChange}
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
                <CFormInput
                  id="zip"
                  name="zip"
                  value={clientDetails.zip}
                  onChange={handleInputChange}
                />
              </CCol>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>

      {/* PIC Details */}
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Client In Charge Details</strong>
          </CCardHeader>
          <CCardBody>
            <CForm autoComplete="off" className="row g-3">
              <CCol md={6} className="position-relative">
                <CFormLabel htmlFor="fullName">Full Name</CFormLabel>
                <CFormInput
                  id="fullName"
                  name="fullName"
                  value={clientDetails.fullName}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setActiveInput('fullName')}
                />
                {activeInput === 'fullName' && showDropdown && (
                  <div className="custom-dropdown">
                    {filteredClients.map((client, idx) => (
                      <div
                        key={idx}
                        className={`dropdown-item ${highlightIndex === idx ? 'highlighted' : ''}`}
                        onClick={() => handleSelectClient(client)}
                      >
                        {client.fullName || client.companyName}
                      </div>
                    ))}
                  </div>
                )}
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="email">Email</CFormLabel>
                <CFormInput
                  type="email"
                  id="email"
                  name="email"
                  value={clientDetails.email}
                  onChange={handleInputChange}
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="mobileNumber">Mobile Number</CFormLabel>
                <CFormInput
                  type="text"
                  id="mobileNumber"
                  name="mobileNumber"
                  value={clientDetails.mobileNumber}
                  onChange={handleInputChange}
                />
              </CCol>

              <CCol md={6}>
                <CFormLabel htmlFor="position">Position</CFormLabel>
                <CFormInput
                  id="position"
                  name="position"
                  value={clientDetails.position}
                  onChange={handleInputChange}
                />
              </CCol>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </>
  )
}

export default ClientDetailsForm
