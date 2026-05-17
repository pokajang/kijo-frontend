import React from 'react'
import {
  CCard,
  CRow,
  CCol,
  CCardHeader,
  CCardBody,
  CTable,
  CTableHead,
  CTableRow,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CButton,
} from '@coreui/react'
import { cilCloudDownload } from '@coreui/icons'
import CIcon from '@coreui/icons-react'

// Use consistent mock data (only record id 1)
const mockSalaryRecords = [
  {
    id: 1,
    employeeName: 'Alice Johnson',
    salaryMonth: 'March 2025',
    basicSalary: '2000',
    totalAllowances: '500',
    totalExpenses: '300',
    totalMileage: '100',
    epf: '200',
    socso: '300',
    eis: '300',
    netSalary: '10000',
    status: 'Paid',
  },
  // If you want multiple rows with the same structure, you could duplicate this object
  // or assume that all records in your system follow this structure.
]

const SalaryRecord = () => {
  return (
    <CRow>
      <CCol>
        {/* datatable-exempt: existing embedded/layout table */}
        <CTable hover responsive className="data-table-compact embedded-data-table">
          <CTableHead>
            <CTableRow>
              <CTableHeaderCell>Salary Month</CTableHeaderCell>
              <CTableHeaderCell>Basic Salary</CTableHeaderCell>
              <CTableHeaderCell>Total Allowances</CTableHeaderCell>
              <CTableHeaderCell>Deductions</CTableHeaderCell>
              <CTableHeaderCell>Net Salary</CTableHeaderCell>
              <CTableHeaderCell>Status</CTableHeaderCell>
              <CTableHeaderCell>Action</CTableHeaderCell>
            </CTableRow>
          </CTableHead>
          <CTableBody>
            {mockSalaryRecords.map((record) => (
              <CTableRow key={record.id}>
                <CTableDataCell>{record.salaryMonth}</CTableDataCell>
                <CTableDataCell>{record.basicSalary}</CTableDataCell>
                <CTableDataCell>{record.totalAllowances}</CTableDataCell>
                <CTableDataCell>
                  <small>EPF {record.epf}</small> <br />
                  <small>SOCSO {record.socso}</small>
                  <br />
                  <small>EIS {record.eis}</small>
                </CTableDataCell>
                <CTableDataCell>{record.netSalary}</CTableDataCell>
                <CTableDataCell>{record.status}</CTableDataCell>
                <CTableDataCell className="text-center">
                  <CButton color="primary">
                    <CIcon icon={cilCloudDownload} />
                  </CButton>
                </CTableDataCell>
              </CTableRow>
            ))}
          </CTableBody>
        </CTable>
      </CCol>
    </CRow>
  )
}

export default SalaryRecord
