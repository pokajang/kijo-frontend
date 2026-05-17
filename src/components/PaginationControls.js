import React from 'react'
import { CRow, CCol, CPagination, CPaginationItem } from '@coreui/react'

const PaginationControls = () => {
  return (
    <CRow className="mb-3 mt-3 align-items-center">
      <CCol md="4">
        <CPagination>
          <CPaginationItem>
            <span aria-hidden="true">&laquo;</span>
          </CPaginationItem>
          <CPaginationItem active>1</CPaginationItem>
          <CPaginationItem>2</CPaginationItem>
          <CPaginationItem>3</CPaginationItem>
          <CPaginationItem aria-label="Next">
            <span aria-hidden="true">&raquo;</span>
          </CPaginationItem>
        </CPagination>
      </CCol>
    </CRow>
  )
}

export default PaginationControls
