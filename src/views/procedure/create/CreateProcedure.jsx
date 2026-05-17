// src/procedures/create/CreateProcedure.jsx

import React, { useState } from 'react'
import {
  CRow,
  CCol,
  CCard,
  CCardBody,
  CCardHeader,
  CForm,
  CFormLabel,
  CFormInput,
  CFormTextarea,
  CFormSelect,
  CButton,
  CAlert,
  CSpinner,
} from '@coreui/react'
import { useNavigate } from 'react-router-dom'

/**
 * CreateProcedure.jsx
 * -------------------
 * Collects a procedure title, description, category, and PDF upload.
 * Submits to backend via Vite API base environment variable.
 */
const CreateProcedure = () => {
  const navigate = useNavigate()

  // ─── Category Options (stable values for future filtering) ─────────
  const CATEGORY_OPTIONS = [
    { value: '', label: 'Choose category…' },
    { value: 'IT', label: 'IT' },
    { value: 'OSH', label: 'OSH' }, // Occupational Safety & Health
    { value: 'HR', label: 'HR' },
    { value: 'Finance', label: 'Finance' },
    { value: 'Operation', label: 'Operation' },
    { value: 'Sales', label: 'Sales' },
    { value: 'Marketing', label: 'Marketing' },
    { value: 'Others', label: 'Others' },
  ]
  const validCategorySet = new Set(CATEGORY_OPTIONS.map((o) => o.value))

  // ─── State ──────────────────────────────────────────────
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    file: null,
  })
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState({ visible: false, color: 'success', message: '' })

  // ─── Utilities ──────────────────────────────────────────
  const cleanTail = (s) => (s || '').trim().replace(/[\s,;:/\\.!-]+$/g, '')

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
    // Do not trim file/category values aggressively; just text fields
    if (name === 'title' || name === 'description') {
      setForm((prev) => ({ ...prev, [name]: cleanTail(value) }))
    }
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null
    setForm((prev) => ({ ...prev, file }))
  }

  const validate = () => {
    const errors = []
    if (!form.title.trim()) errors.push('Title of Procedure is required.')
    if (!form.description.trim()) errors.push('Brief description is required.')

    if (!form.category) {
      errors.push('Please select a category.')
    } else if (!validCategorySet.has(form.category)) {
      errors.push('Selected category is not valid.')
    }

    if (!form.file) {
      errors.push('Please upload the PDF file.')
    } else {
      if (form.file.type !== 'application/pdf') errors.push('Uploaded file must be a PDF.')
      if (form.file.size > 10 * 1024 * 1024) errors.push('File size must be below 10MB.')
    }
    return errors
  }

  // ─── Submit Form ────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    setAlert({ visible: false, color: 'success', message: '' })

    const errors = validate()
    if (errors.length > 0) {
      setAlert({ visible: true, color: 'danger', message: errors.join(' ') })
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('title', form.title.trim())
      formData.append('description', form.description.trim())
      formData.append('category', form.category) // ← NEW
      formData.append('file', form.file)

      const res = await fetch(`${import.meta.env.VITE_API_BASE}procedures`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to create procedure.')
      }

      setAlert({
        visible: true,
        color: 'success',
        message: 'Procedure created successfully!',
      })

      // optionally navigate to list page after success
      // setTimeout(() => navigate('/procedures'), 1000)
    } catch (err) {
      setAlert({
        visible: true,
        color: 'danger',
        message: err.message || 'Unexpected error occurred.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm({ title: '', description: '', category: '', file: null })
    setAlert({ visible: false, color: 'success', message: '' })
  }

  // ─── Render ─────────────────────────────────────────────
  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Upload Procedure</strong>
          </CCardHeader>
          <CCardBody>
            {alert.visible && (
              <CAlert
                color={alert.color}
                dismissible
                onClose={() => setAlert((a) => ({ ...a, visible: false }))}
              >
                {alert.message}
              </CAlert>
            )}

            <CForm onSubmit={handleSubmit}>
              {/* ─── Title ─────────────────────────────── */}
              <CRow className="mb-3">
                <CCol md={6} lg={8}>
                  <CFormLabel htmlFor="title">Title of Procedure</CFormLabel>
                  <CFormInput
                    id="title"
                    name="title"
                    type="text"
                    placeholder="e.g. Procedure for Leave Application"
                    value={form.title}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={submitting}
                  />
                </CCol>
                <CCol md={6} lg={4}>
                  <CFormLabel htmlFor="category">Category</CFormLabel>
                  <CFormSelect
                    id="category"
                    name="category"
                    value={form.category}
                    onChange={handleChange}
                    disabled={submitting}
                  >
                    {CATEGORY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} disabled={opt.value === ''}>
                        {opt.label}
                      </option>
                    ))}
                  </CFormSelect>
                </CCol>
              </CRow>

              {/* ─── Description ───────────────────────── */}
              <CRow className="mb-3">
                <CCol md={12}>
                  <CFormLabel htmlFor="description">Brief description of this procedure</CFormLabel>
                  <CFormTextarea
                    id="description"
                    name="description"
                    rows={4}
                    placeholder="e.g. This procedure explains in detail the flow of annual leave application including timing, review period, and approval steps."
                    value={form.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    disabled={submitting}
                  />
                </CCol>
              </CRow>

              {/* ─── PDF Upload ────────────────────────── */}
              <CRow className="mb-4">
                <CCol md={8}>
                  <CFormLabel htmlFor="file">Upload PDF file</CFormLabel>
                  <CFormInput
                    id="file"
                    name="file"
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileChange}
                    disabled={submitting}
                  />
                  {form.file && (
                    <small className="text-muted d-block mt-1">
                      Selected: {form.file.name} ({Math.round(form.file.size / 1024)} KB)
                    </small>
                  )}
                </CCol>
              </CRow>

              {/* ─── Buttons ───────────────────────────── */}
              <CRow>
                <CCol>
                  <CButton type="submit" color="primary" disabled={submitting} className="me-2">
                    {submitting ? (
                      <>
                        <CSpinner size="sm" className="me-2" /> Saving…
                      </>
                    ) : (
                      'Upload Procedure'
                    )}
                  </CButton>
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    onClick={handleReset}
                    disabled={submitting}
                  >
                    Reset
                  </CButton>
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    className="ms-2"
                    onClick={() => navigate(-1)}
                    disabled={submitting}
                  >
                    Back
                  </CButton>
                </CCol>
              </CRow>
            </CForm>
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}

export default CreateProcedure
