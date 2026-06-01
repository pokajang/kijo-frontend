import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CCardFooter,
  CRow,
  CCol,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CButton,
  CAlert,
} from '@coreui/react'

import Select from '../../../components/forms/ThemedSelect'
import dialog from '../../../components/dialog/dialogService'
const CreateProject = () => {
  const navigate = useNavigate()

  const initialState = {
    client_id: '',
    project_name: '',
    project_type: '',
    po_loa_number: '', // added field
    quote_value: '',
    award_date: '',
    service_start_date: '',
    service_end_date: '',
    description: '',
  }

  const [formData, setFormData] = useState(initialState)

  const [clients, setClients] = useState([])
  const [showWarning, setShowWarning] = useState(true)

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_BASE}client-companies/options`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => setClients(data.data || []))
      .catch((err) => {
        console.error('Failed to load clients', err)
        setClients([])
      })
  }, [])

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSelectChange = (selectedOption) => {
    setFormData({ ...formData, project_type: selectedOption?.value || '' })
  }

  const handleSubmit = async () => {
    if (!(await dialog.confirm('Are you sure you want to create this project?'))) {
      return
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE}projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(formData),
      })
      const data = await res.json()
      if (data.status === 'success') {
        const goToList = await dialog.confirm(
          'Project created successfully. Go to projects list?',
          {
            title: 'Project Created',
            confirmText: 'Go to list',
            cancelText: 'Create another',
          },
        )
        if (goToList) {
          navigate('/project/manage')
        } else {
          setFormData(initialState)
        }
      } else {
        dialog.alert(data.message || 'Failed to create project.')
      }
    } catch (err) {
      console.error('Create error', err)
      dialog.alert('Server error occurred.')
    }
  }

  // ✅ Project type options
  const projectTypeOptions = [
    { value: 'Manpower Supply', label: 'Manpower Supply' },
    { value: 'Equipment Supply', label: 'Equipment Supply' },
    { value: 'Special', label: 'Special' },
    { value: 'Training', label: 'Training' },
    { value: 'Industrial Hygiene', label: 'Industrial Hygiene' },
  ]

  return (
    <CCard>
      <CCardHeader>
        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap">
          <strong>Create New Project</strong>
          <CButton
            size="sm"
            color="secondary"
            variant="outline"
            onClick={() => navigate('/project/manage')}
          >
            Back
          </CButton>
        </div>
      </CCardHeader>
      <CCardBody>
        <CRow className="g-3">
          <CCol md={12}>
            {showWarning && (
              <CCol md={12}>
                <CAlert color="warning" dismissible onClose={() => setShowWarning(false)}>
                  <strong>Warning:</strong> Only use this form if an official quotation has not been
                  issued to the client. By default, always create a project from the{' '}
                  <strong>Quotation&gt;Records&gt;</strong> page via the <strong>Awarded</strong>{' '}
                  function.
                </CAlert>
              </CCol>
            )}
          </CCol>

          <CCol md={6}>
            <CFormLabel htmlFor="client_id">Client</CFormLabel>

            <Select
              id="client_id"
              name="client_id"
              value={clients.find((c) => c.company_id === formData.client_id) || null}
              onChange={(selectedOption) =>
                setFormData({ ...formData, client_id: selectedOption?.company_id || '' })
              }
              options={clients}
              getOptionLabel={(c) => c.company_name}
              getOptionValue={(c) => c.company_id}
              placeholder="Select Client..."
              isClearable
              noOptionsMessage={() => (
                <>
                  No options. Create new client from <strong>Clients List</strong>
                </>
              )}
            />
          </CCol>

          <CCol md={6}>
            <CFormLabel htmlFor="project_type">Project Type</CFormLabel>
            <Select
              id="project_type"
              name="project_type"
              value={projectTypeOptions.find((opt) => opt.value === formData.project_type) || null}
              onChange={handleSelectChange}
              options={projectTypeOptions}
              placeholder="Select Project Type..."
              isClearable
            />
          </CCol>

          <CCol md={12}>
            <CFormLabel htmlFor="project_name">Project Name</CFormLabel>
            <CFormInput name="project_name" value={formData.project_name} onChange={handleChange} />
          </CCol>

          <CCol md={6}>
            <CFormLabel htmlFor="po_loa_number">Purchase Order / LOA Number</CFormLabel>
            <CFormInput
              name="po_loa_number"
              value={formData.po_loa_number}
              onChange={handleChange}
            />
          </CCol>

          <CCol md={6}>
            <CFormLabel htmlFor="quote_value">Project Value (RM)</CFormLabel>
            <CFormInput
              type="number"
              name="quote_value"
              value={formData.quote_value}
              onChange={handleChange}
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="award_date">Award Date</CFormLabel>
            <CFormInput
              type="date"
              name="award_date"
              value={formData.award_date}
              onChange={handleChange}
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="service_start_date">Service Start Date</CFormLabel>
            <CFormInput
              type="date"
              name="service_start_date"
              value={formData.service_start_date}
              onChange={handleChange}
            />
          </CCol>

          <CCol md={4}>
            <CFormLabel htmlFor="service_end_date">Service End Date</CFormLabel>
            <CFormInput
              type="date"
              name="service_end_date"
              value={formData.service_end_date}
              onChange={handleChange}
            />
          </CCol>

          <CCol md={12}>
            <CFormLabel htmlFor="description">Project Description</CFormLabel>
            <CFormTextarea
              name="description"
              rows={3}
              value={formData.description}
              onChange={handleChange}
            />
          </CCol>
        </CRow>
      </CCardBody>
      <CCardFooter className="d-flex justify-content-end gap-2">
        <CButton
          color="secondary"
          variant="outline"
          size="sm"
          onClick={() => navigate('/project/manage')}
        >
          Cancel
        </CButton>
        <CButton color="primary" size="sm" onClick={handleSubmit}>
          Create Project
        </CButton>
      </CCardFooter>
    </CCard>
  )
}

export default CreateProject
