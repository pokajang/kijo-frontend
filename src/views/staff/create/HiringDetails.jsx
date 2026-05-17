import React from 'react'
import { CCol, CFormLabel, CFormInput, CFormSelect } from '@coreui/react'

const HiringDetails = ({ staffDetails, setStaffDetails, handleInputChange }) => (
  <>
    <CCol md={6}>
      <CFormLabel htmlFor="position">Position</CFormLabel>
      <CFormSelect
        name="position"
        value={staffDetails.position}
        onChange={(e) => handleInputChange(e, setStaffDetails)}
        options={[
          { label: 'Choose position', value: '' },
          { label: 'Technician', value: 'Technician' },
          { label: 'Junior Executive', value: 'Junior Executive' },
          { label: 'Executive', value: 'Executive' },
          { label: 'Senior Executive', value: 'Senior Executive' },
          { label: 'Manager', value: 'Manager' },
          { label: 'Head of Department', value: 'Head of Department' },
          { label: 'Director', value: 'Director' },
          { label: 'Vice President', value: 'Vice President' },
          { label: 'Chief Officer (C-level)', value: 'C-level' },
        ]}
      />
    </CCol>

    <CCol md={3}>
      <CFormLabel htmlFor="staffType">Hiring Type</CFormLabel>
      <CFormSelect
        name="staffType"
        value={staffDetails.staffType}
        onChange={(e) => handleInputChange(e, setStaffDetails)}
        options={[
          { label: 'Choose type', value: '' },
          { label: 'Intern', value: 'Intern' },
          { label: 'Contract', value: 'Contract' },
          { label: 'Probation', value: 'Probation' },
          { label: 'Permanent', value: 'Permanent' },
        ]}
      />
    </CCol>

    <CCol md={3}>
      <CFormLabel htmlFor="department">Department</CFormLabel>
      <CFormSelect
        name="department"
        value={staffDetails.department}
        onChange={(e) => handleInputChange(e, setStaffDetails)}
        options={[
          { label: 'Choose department', value: '' },
          { label: 'Executive Office', value: 'Executive Office' },
          { label: 'Strategy & Business Development', value: 'Strategy & Business Development' },
          { label: 'Sales & Operations', value: 'Sales & Operations' },
          { label: 'Marketing & Communications', value: 'Marketing & Communications' },
          { label: 'Technology & Information Systems', value: 'Technology & Information Systems' },
          { label: 'Finance & Accounting', value: 'Finance & Accounting' },
          { label: 'Human Resources', value: 'Human Resources' },
          { label: 'Legal & Compliance', value: 'Legal & Compliance' },
          { label: 'Customer Experience & Support', value: 'Customer Experience & Support' },
          { label: 'Product & Innovation', value: 'Product & Innovation' },
          { label: 'Research & Development (R&D)', value: 'Research & Development' },
          { label: 'Administration & Facilities', value: 'Administration & Facilities' },
          { label: 'Others', value: 'Others' },
        ]}
      />
    </CCol>

    <CCol md={3}>
      <CFormLabel htmlFor="startDate">Commencement Date</CFormLabel>
      <CFormInput
        type="date"
        name="startDate"
        value={staffDetails.startDate}
        onChange={(e) => handleInputChange(e, setStaffDetails)}
      />
    </CCol>

    <CCol md={3}>
      <CFormLabel htmlFor="status">Status</CFormLabel>
      <CFormSelect
        name="status"
        value={staffDetails.status}
        onChange={(e) => handleInputChange(e, setStaffDetails)}
        options={[
          { label: 'Active', value: 'Active' },
          { label: 'Inactive', value: 'Inactive' },
          { label: 'On Leave', value: 'On Leave' },
        ]}
      />
    </CCol>
  </>
)

export default HiringDetails
