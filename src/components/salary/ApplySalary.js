import React, { useState, useEffect } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CFormCheck,
  CAlert,
  CAlertLink,
  CRow,
  CCol,
  CTable,
  CTableHead,
  CTableHeaderCell,
  CTableBody,
  CTableDataCell,
  CTableRow,
  CForm,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CButton,
} from '@coreui/react'
import { auto } from '@popperjs/core'

import socsoEisTable from './socsoEisTable'
import socsoTable from './socsoTable'

const ApplySalary = ({ handleCancel }) => {
  // State for form part selector
  const [selectedForms, setSelectedForms] = useState(['allowanceSelector'])

  // States for allowance and expenses
  const [salaryFormData, setSalaryFormData] = useState({
    allowanceDescription: '',
    allowanceAmount: '',
    allowanceDate: '',
    expenseDate: '',
    expenseDescription: '',
    expenseAmount: '',
    finalSalary: '',
  })

  // Specific states for mileage form
  const [mileageClaimData, setMileageClaimData] = useState({
    mileageDate: '',
    startLocation: '',
    endLocation: '',
    mileageKm: '',
    claimAmount: '',
  })

  // specific states for statutory salary calculation
  const [statutoryDeductionData, setStatutoryDeductionData] = useState({
    basicSalary: '',
    employerEpf: '',
    employeeEpf: '',
    employerSocso: '',
    employeeSocso: '',
    employerEis: '',
    employeeEis: '',
    employerTotal: '',
    employeeTotal: '',
  })

  // useEffect handler for determining epf and socso rates
  useEffect(() => {
    const basic = Number(statutoryDeductionData.basicSalary) || 0

    // EPF Calculation Logic
    const effectiveSalary = basic
      ? basic <= 5000
        ? Math.ceil(basic / 20) * 20
        : Math.ceil(basic / 100) * 100
      : 0

    const employerEpf = effectiveSalary
      ? Math.ceil(effectiveSalary * (basic <= 5000 ? 0.13 : 0.12))
      : 0

    const employeeEpf = effectiveSalary ? Math.ceil(effectiveSalary * 0.11) : 0

    // Match EIS
    const matchedEis = socsoEisTable.find(
      (item) =>
        basic > item.lowerBoundary && (item.upperBoundary === null || basic <= item.upperBoundary),
    )

    // Match SOCSO
    const matchedSocso = socsoTable.find(
      (item) =>
        basic > item.lowerBoundary && (item.upperBoundary === null || basic <= item.upperBoundary),
    )

    // Extract contributions or set to 0
    const employerEis = matchedEis ? matchedEis.employer : 0
    const employeeEis = matchedEis ? matchedEis.employee : 0

    const employerSocso = matchedSocso ? matchedSocso.employer : 0
    const employeeSocso = matchedSocso ? matchedSocso.employee : 0

    // Calculate totals
    const employerTotal = employerEpf + employerSocso + employerEis

    const employeeTotal = employeeEpf + employeeSocso + employeeEis

    // Update all in one go
    setStatutoryDeductionData((prev) => ({
      ...prev,
      employerEpf,
      employeeEpf,
      employerEis,
      employeeEis,
      employerSocso,
      employeeSocso,
      employerTotal: employerTotal.toFixed(2),
      employeeTotal: employeeTotal.toFixed(2),
    }))
  }, [statutoryDeductionData.basicSalary])

  // Handle form selector change
  const handleFormSelector = (e) => {
    const { id, checked } = e.target
    if (checked) {
      // add this form ID to the array
      setSelectedForms((prev) => [...prev, id])
    } else {
      // remove it from the array
      setSelectedForms((prev) => prev.filter((item) => item !== id))
    }
  }

  // Generic change handler for form fields.
  const handleChange = (e) => {
    const { name, value } = e.target
    setSalaryFormData((prev) => ({ ...prev, [name]: value }))
  }

  // Specific handlers for mileage input fields
  const handleMileageInputs = (e) => {
    const { name, value } = e.target
    setMileageClaimData((prev) => ({ ...prev, [name]: value }))
  }

  // mockallowance data
  const mockData = [
    { date: '2025-03-20', description: 'Phone Allowance', amount: 100 },
    { date: '2025-03-22', description: 'Training Allowance', amount: 150 },
    { date: '2025-03-24', description: 'Insurance', amount: 80 },
  ]

  // handle add allowance
  const handleAddAllowance = (e) => {
    console.log('something')
  }

  // handle add expense
  const handleAddExpense = (e) => {
    console.log('something')
  }

  // Handler for basic salary input changes.
  const handleBasicSalaryChange = (e) => {
    const { value } = e.target
    setStatutoryDeductionData((prev) => ({ ...prev, basicSalary: value }))
  }

  // handle final submit
  const handleSubmit = (e) => {
    console.log('claim submitted')
  }

  return (
    <CRow>
      <CCol xs={12}>
        {/* Form fields selector */}
        <CCard className="mb-3">
          <CCardBody>
            <CCol xs={12}>
              <CFormLabel htmlFor="selector" className="mb-1">
                Select Claim Form
              </CFormLabel>
              <CFormCheck
                type="checkbox"
                className="mx-3"
                inline
                id="allowanceSelector"
                value="allowanceSelector"
                label="Allowance Form"
                checked={selectedForms.includes('allowanceSelector')}
                onChange={handleFormSelector}
                disabled
              />
              <CFormCheck
                type="checkbox"
                inline
                id="expenseSelector"
                value="expenseSelector"
                label="Expense Form"
                checked={selectedForms.includes('expenseSelector')}
                onChange={handleFormSelector}
              />
              <CFormCheck
                type="checkbox"
                inline
                id="mileageSelector"
                value="mileageSelector"
                label="Mileage Form"
                checked={selectedForms.includes('mileageSelector')}
                onChange={handleFormSelector}
              />
            </CCol>
          </CCardBody>
        </CCard>

        <CCard>
          {/* Allowance Section */}
          {selectedForms.includes('allowanceSelector') && (
            <>
              <CCardHeader>
                <strong>Allowance</strong>
              </CCardHeader>
              <CCardBody>
                <CRow>
                  <CCol xs={12} md={2} className="mb-2">
                    <CFormLabel htmlFor="allowanceDate" className="mb-1">
                      Date
                    </CFormLabel>
                    <CFormInput
                      id="allowanceDate"
                      type="date"
                      name="allowanceDate"
                      value={salaryFormData.allowanceDate}
                      onChange={handleChange}
                    />
                  </CCol>
                  <CCol xs={12} md={5} className="mb-2">
                    <CFormLabel htmlFor="allowanceDescription" className="mb-1">
                      Description
                    </CFormLabel>
                    <CFormInput
                      id="allowanceDescription"
                      type="text"
                      name="allowanceDescription"
                      value={salaryFormData.allowanceDescription}
                      onChange={handleChange}
                      placeholder="Describe allowance"
                    />
                  </CCol>
                  <CCol xs={12} md={3} className="mb-2">
                    <CFormLabel htmlFor="allowanceAmount" className="mb-1">
                      Amount
                    </CFormLabel>
                    <CFormInput
                      id="allowanceAmount"
                      type="number"
                      name="allowanceAmount"
                      value={salaryFormData.allowanceAmount}
                      onChange={handleChange}
                      placeholder="Enter amount"
                    />
                  </CCol>
                  <CCol xs={12} md={2} className="d-flex align-items-end mb-2">
                    <CButton color="primary" onClick={handleAddAllowance}>
                      Add
                    </CButton>
                  </CCol>
                  <CCol xs={12} md={12}>
                    <CFormLabel htmlFor="currentAllowanceTable" className="mb-1">
                      Current Allowance Entitlement
                    </CFormLabel>
                    <CCol xs={12} className="mb-3">
                      <div>
                        {mockData.map((item, index) => (
                          <span key={index}>
                            {item.description} (Starting {item.date}):{' '}
                            <strong>RM{parseFloat(item.amount).toFixed(2)}</strong>
                            {index !== mockData.length - 1 && ', '}
                          </span>
                        ))}
                      </div>
                    </CCol>
                    <CAlert dismissible color="info">
                      For fix allowance, please update in{' '}
                      <CAlertLink href="#">Personal Settings</CAlertLink> page.
                    </CAlert>
                  </CCol>
                </CRow>
              </CCardBody>
            </>
          )}

          {/* Expenses Section */}
          {selectedForms.includes('expenseSelector') && (
            <>
              <CCardHeader>Expenses</CCardHeader>
              <CCardBody>
                <CRow>
                  <CCol xs={12} md={4} className="mb-2">
                    <CFormLabel htmlFor="expenseDate" className="mb-1">
                      Date
                    </CFormLabel>
                    <CFormInput
                      id="expenseDate"
                      type="date"
                      name="expenseDate"
                      value={salaryFormData.expenseDate}
                      onChange={handleChange}
                    />
                  </CCol>
                  <CCol xs={12} md={8} className="mb-2">
                    <CFormLabel htmlFor="expenseDescription" className="mb-1">
                      Description
                    </CFormLabel>
                    <CFormInput
                      id="expenseDescription"
                      type="text"
                      name="expenseDescription"
                      value={salaryFormData.expenseDescription}
                      onChange={handleChange}
                      placeholder="Describe expense"
                    />
                  </CCol>
                  <CCol xs={12} md={3} className="mb-2">
                    <CFormLabel htmlFor="expenseAmount" className="mb-1">
                      Amount
                    </CFormLabel>
                    <CFormInput
                      id="expenseAmount"
                      type="number"
                      name="expenseAmount"
                      value={salaryFormData.expenseAmount}
                      onChange={handleChange}
                    />
                  </CCol>
                  <CCol xs={6} md={6}>
                    <CFormLabel htmlFor="expenseProof" className="mb-1">
                      Upload Receipt
                    </CFormLabel>
                    <CFormInput id="expenseProof" type="file" name="expenseProof"></CFormInput>
                  </CCol>
                  <CCol xs={6} md={3} className="d-flex align-items-end">
                    <CButton color="primary" onClick={handleAddExpense}>
                      Add
                    </CButton>
                  </CCol>
                </CRow>
              </CCardBody>
            </>
          )}

          {/* Vehicle Mileage */}
          {selectedForms.includes('mileageSelector') && (
            <>
              <CCardHeader>Mileage</CCardHeader>
              <CCardBody>
                <CRow>
                  <CCol xs={4} md={4} className="mb-2">
                    <CFormLabel htmlFor="mileageDate" className="mb-1">
                      Date
                    </CFormLabel>
                    <CFormInput
                      id="mileageDate"
                      type="date"
                      name="mileageDate"
                      value={mileageClaimData.mileageDate}
                      onChange={handleMileageInputs}
                    />
                  </CCol>
                  <CCol xs={4} md={4} className="mb-2">
                    <CFormLabel htmlFor="startLocation" className="mb-1">
                      From
                    </CFormLabel>
                    <CFormInput
                      id="startLocation"
                      type="text"
                      name="startLocation"
                      value={mileageClaimData.startLocation}
                      onChange={handleMileageInputs}
                    />
                  </CCol>
                  <CCol xs={4} md={4} className="mb-2">
                    <CFormLabel htmlFor="endLocation" className="mb-1">
                      To
                    </CFormLabel>
                    <CFormInput
                      id="endLocation"
                      type="text"
                      name="endLocation"
                      value={mileageClaimData.endLocation}
                      onChange={handleMileageInputs}
                    />
                  </CCol>
                  <CCol xs={6} md={6}>
                    <CFormLabel htmlFor="mileageKm" className="mb-1">
                      Total Mileage (KM)
                    </CFormLabel>
                    <CFormInput
                      id="mileageKm"
                      type="number"
                      name="mileageKm"
                      value={mileageClaimData.mileageKm}
                      onChange={handleMileageInputs}
                    ></CFormInput>
                  </CCol>
                  <CCol xs={6} md={3}>
                    <CFormLabel htmlFor="claimAmount" className="mb-1">
                      Claim Amount
                    </CFormLabel>
                    <p>
                      RM{(mileageClaimData.mileageKm * 0.6).toFixed(2)} <small>(RM0.60/km)</small>
                    </p>
                  </CCol>
                </CRow>
              </CCardBody>
            </>
          )}

          {/* Statutory Deduction Section */}
          <CCardHeader>Employer Statutory Deduction</CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              <CCol xs={12} md={4}>
                <CFormInput
                  type="number"
                  name="basicSalary"
                  placeholder="Enter Basic Salary"
                  value={statutoryDeductionData.basicSalary}
                  onChange={handleBasicSalaryChange}
                />
              </CCol>
              <CCol xs={12} md={4} className="d-flex align-items-end">
                <CButton type="submit" color="primary">
                  Submit
                </CButton>
              </CCol>
            </CRow>
            <CRow className="mb-2">
              <CCol xs={3} md={3}>
                <CFormLabel>EPF</CFormLabel>
                <CFormInput readOnly value={statutoryDeductionData.employerEpf} />
              </CCol>
              <CCol xs={3} md={3}>
                <CFormLabel>SOCSO</CFormLabel>
                <CFormInput readOnly value={statutoryDeductionData.employerSocso} />
              </CCol>
              <CCol xs={3} md={3}>
                <CFormLabel>EIS</CFormLabel>
                <CFormInput readOnly value={statutoryDeductionData.employerEis} />
              </CCol>
              <CCol xs={3} md={3}>
                <CFormLabel>Total</CFormLabel>
                <CFormInput readOnly value={statutoryDeductionData.employerTotal} />
              </CCol>
            </CRow>
          </CCardBody>

          <CCardHeader>Employee Statutory Deduction</CCardHeader>
          <CCardBody>
            <CRow className="mb-2">
              <CCol xs={3} md={3}>
                <CFormLabel>EPF</CFormLabel>
                <CFormInput readOnly value={statutoryDeductionData.employeeEpf} />
              </CCol>
              <CCol xs={3} md={3}>
                <CFormLabel>SOCSO</CFormLabel>
                <CFormInput readOnly value={statutoryDeductionData.employeeSocso} />
              </CCol>
              <CCol xs={3} md={3}>
                <CFormLabel>EIS</CFormLabel>
                <CFormInput readOnly value={statutoryDeductionData.employeeEis} />
              </CCol>
              <CCol xs={3} md={3}>
                <CFormLabel>Total</CFormLabel>
                <CFormInput readOnly value={statutoryDeductionData.employeeTotal} />
              </CCol>
            </CRow>
          </CCardBody>

          {/* Final review section */}
          <CCardHeader>Review Salary</CCardHeader>
          <CCardBody>
            <CRow className="mb-3">
              {/* Left Table: Employee Earnings */}
              <CCol xs={12} md={6}>
                {/* datatable-exempt: existing embedded/layout table */}
                <CTable bordered className="mb-1 data-table-compact embedded-data-table">
                  <CTableBody>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Basic Salary</CTableHeaderCell>
                      <CTableDataCell>RM 1000.00</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Total Allowance</CTableHeaderCell>
                      <CTableDataCell>RM 220.00</CTableDataCell>
                    </CTableRow>

                    {selectedForms.includes('expenseSelector') && (
                      <CTableRow>
                        <CTableHeaderCell scope="row">Total Expenses</CTableHeaderCell>
                        <CTableDataCell>RM 0.00</CTableDataCell>
                      </CTableRow>
                    )}

                    {selectedForms.includes('mileageSelector') && (
                      <CTableRow>
                        <CTableHeaderCell scope="row">Total Mileage</CTableHeaderCell>
                        <CTableDataCell>RM 0.00</CTableDataCell>
                      </CTableRow>
                    )}

                    <CTableRow>
                      <CTableHeaderCell scope="row">EPF (Employee)</CTableHeaderCell>
                      <CTableDataCell>-RM 110.00</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">SOCSO (Employee)</CTableHeaderCell>
                      <CTableDataCell>-RM 10.00</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">EIS (Employee)</CTableHeaderCell>
                      <CTableDataCell>-RM 5.00</CTableDataCell>
                    </CTableRow>

                    <CTableRow className="table-success">
                      <CTableHeaderCell scope="row">Salary Payable</CTableHeaderCell>
                      <CTableDataCell>RM 1095.00</CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>
              </CCol>

              {/* Right Table: Employer Deductions */}
              <CCol xs={12} md={6}>
                {/* datatable-exempt: existing embedded/layout table */}
                <CTable bordered className="mb-1 data-table-compact embedded-data-table">
                  <CTableBody>
                    <CTableRow>
                      <CTableHeaderCell scope="row">EPF (Employer)</CTableHeaderCell>
                      <CTableDataCell>RM 130.00</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">SOCSO (Employer)</CTableHeaderCell>
                      <CTableDataCell>RM 30.00</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">EIS (Employer)</CTableHeaderCell>
                      <CTableDataCell>RM 5.00</CTableDataCell>
                    </CTableRow>
                    <CTableRow>
                      <CTableHeaderCell scope="row">Total Deduction</CTableHeaderCell>
                      <CTableDataCell>RM 165.00</CTableDataCell>
                    </CTableRow>
                  </CTableBody>
                </CTable>
              </CCol>
            </CRow>
            <CRow className="justify-content-start g-2">
              <CCol xs="auto">
                <CButton color="primary">Submit Claim</CButton>
              </CCol>
            </CRow>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default ApplySalary
