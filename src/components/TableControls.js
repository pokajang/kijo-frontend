import React from 'react'
import { CRow, CCol, CFormSelect, CInputGroup, CFormInput, CButton } from '@coreui/react'

const TableControls = ({
  searchTerm,
  setSearchTerm,
  handleSearch,
  rowsPerPage,
  setRowsPerPage,
  rowsPerPageOptions = [10, 20, 50],
}) => {
  return (
    <CRow className="mb-3">
      {/* Left: Rows per page selector */}
      <CCol xs={12} md={6}>
        <div className="d-flex align-items-center">
          <span className="me-2">Show</span>
          <CFormSelect
            style={{ width: '80px' }}
            aria-label="Rows per page"
            value={rowsPerPage}
            onChange={(e) => setRowsPerPage(e.target.value)}
          >
            {rowsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </CFormSelect>
          <span className="ms-2">records</span>
        </div>
      </CCol>

      {/* Right: Search bar */}
      <CCol xs={12} md={6} className="mt-3 mt-md-0">
        <div className="d-flex justify-content-end">
          <CInputGroup className="w-100 w-md-auto" style={{ maxWidth: '100%' }}>
            <CFormInput
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSearch()
                }
              }}
            />
            <CButton type="button" color="primary" size="sm" onClick={handleSearch}>
              Search
            </CButton>
          </CInputGroup>
        </div>
      </CCol>
    </CRow>
  )
}

export default TableControls
