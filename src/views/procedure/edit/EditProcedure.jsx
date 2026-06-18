import React, { useEffect, useMemo, useState } from 'react'
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
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { resolveAssetUrl } from '../../../utils/assetUrls'
import { fetchDetailJson } from '../../../utils/detailPages'
import { getDetailReturnTo } from '../../../utils/navigation/returnTo'

const CATEGORY_OPTIONS = [
  { value: '', label: 'Choose category...' },
  { value: 'IT', label: 'IT' },
  { value: 'OSH', label: 'OSH' },
  { value: 'HR', label: 'HR' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'OPERATION', label: 'Operation' },
  { value: 'SALES', label: 'Sales' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'OTHERS', label: 'Others' },
]

const validCategorySet = new Set(CATEGORY_OPTIONS.map((o) => o.value).filter(Boolean))

const cleanTail = (s) => (s || '').trim().replace(/[\s,;:/\\.!-]+$/g, '')

export default function EditProcedure() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id: routeId } = useParams()
  const [params] = useSearchParams()
  const id = routeId || params.get('id')
  const returnTo = getDetailReturnTo(location, '/administration/procedures')

  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [alert, setAlert] = useState({ visible: false, color: 'success', message: '' })

  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    file: null,
  })
  const [initialForm, setInitialForm] = useState({
    title: '',
    description: '',
    category: '',
  })
  const [currentFile, setCurrentFile] = useState({ name: '', path: '' })

  useEffect(() => {
    if (!id) {
      setAlert({ visible: true, color: 'danger', message: 'Missing procedure id.' })
      setLoaded(false)
      setLoading(false)
      return
    }

    const fetchOne = async () => {
      setLoading(true)
      setAlert({ visible: false, color: 'success', message: '' })
      try {
        const detail = await fetchDetailJson(`${import.meta.env.VITE_API_BASE}procedures/${id}`, {
          credentials: 'include',
        })
        if (detail.notFound) {
          setLoaded(false)
          setAlert({ visible: true, color: 'warning', message: 'Procedure not found.' })
          return
        }
        const data = detail.data || {}
        if (!detail.ok || data?.success === false) {
          throw new Error(data?.message || 'Failed to load procedure.')
        }

        const rec = data?.item || null
        if (!rec) {
          throw new Error('Procedure not found.')
        }

        const normalizedCategory = String(rec.category || '').toUpperCase()
        const nextInitial = {
          title: rec.title || '',
          description: rec.description || '',
          category: validCategorySet.has(normalizedCategory) ? normalizedCategory : '',
        }

        setInitialForm(nextInitial)
        setForm({ ...nextInitial, file: null })
        setCurrentFile({
          name: rec.file_name || '',
          path: rec.file_path || '',
        })
        setLoaded(true)
      } catch (e) {
        setLoaded(false)
        setAlert({
          visible: true,
          color: 'danger',
          message: e.message || 'Unexpected error while loading procedure.',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchOne()
  }, [id])

  const selectedFileText = useMemo(() => {
    if (!form.file) return ''
    return `${form.file.name} (${Math.round(form.file.size / 1024)} KB)`
  }, [form.file])

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleBlur = (e) => {
    const { name, value } = e.target
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

    if (form.file) {
      if (form.file.type !== 'application/pdf') errors.push('Uploaded file must be a PDF.')
      if (form.file.size > 10 * 1024 * 1024) errors.push('File size must be below 10MB.')
    }

    return errors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!loaded) return
    setAlert({ visible: false, color: 'success', message: '' })

    const errors = validate()
    if (errors.length > 0) {
      setAlert({ visible: true, color: 'danger', message: errors.join(' ') })
      return
    }

    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('id', String(id))
      formData.append('title', form.title.trim())
      formData.append('description', form.description.trim())
      formData.append('category', form.category)
      if (form.file) {
        formData.append('file', form.file)
      }

      const res = await fetch(`${import.meta.env.VITE_API_BASE}procedures/${id}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || data?.success === false) {
        throw new Error(data?.message || 'Failed to update procedure.')
      }

      const nextInitial = {
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
      }
      setInitialForm(nextInitial)
      setForm({ ...nextInitial, file: null })

      if (form.file) {
        setCurrentFile((prev) => ({
          name: form.file.name,
          path: data?.fileUrl || prev.path,
        }))
      }

      setAlert({
        visible: true,
        color: 'success',
        message: 'Procedure updated successfully.',
      })
    } catch (e) {
      setAlert({
        visible: true,
        color: 'danger',
        message: e.message || 'Unexpected error occurred.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleReset = () => {
    setForm({ ...initialForm, file: null })
    setAlert({ visible: false, color: 'success', message: '' })
  }

  return (
    <CRow>
      <CCol xs={12}>
        <CCard className="mb-4">
          <CCardHeader>
            <strong>Edit Procedure</strong>
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

            {loading ? (
              <div className="py-5 text-center">
                <CSpinner /> Loading...
              </div>
            ) : loaded ? (
              <CForm onSubmit={handleSubmit}>
                <CRow className="mb-3">
                  <CCol md={6} lg={8}>
                    <CFormLabel htmlFor="title">Title of Procedure</CFormLabel>
                    <CFormInput
                      id="title"
                      name="title"
                      type="text"
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

                <CRow className="mb-3">
                  <CCol md={12}>
                    <CFormLabel htmlFor="description">
                      Brief description of this procedure
                    </CFormLabel>
                    <CFormTextarea
                      id="description"
                      name="description"
                      rows={4}
                      value={form.description}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      disabled={submitting}
                    />
                  </CCol>
                </CRow>

                <CRow className="mb-4">
                  <CCol md={8}>
                    <CFormLabel htmlFor="file">Replace PDF file (optional)</CFormLabel>
                    <CFormInput
                      id="file"
                      name="file"
                      type="file"
                      accept="application/pdf"
                      onChange={handleFileChange}
                      disabled={submitting}
                    />
                    {selectedFileText && (
                      <small className="text-muted d-block mt-1">
                        New file: {selectedFileText}
                      </small>
                    )}
                    {!selectedFileText && currentFile.name && (
                      <small className="text-muted d-block mt-1">
                        Current file:{' '}
                        {currentFile.path ? (
                          <a
                            href={resolveAssetUrl(currentFile.path)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {currentFile.name}
                          </a>
                        ) : (
                          currentFile.name
                        )}
                      </small>
                    )}
                  </CCol>
                </CRow>

                <CRow>
                  <CCol className="d-flex justify-content-end gap-2 flex-wrap flex-row-reverse">
                    <CButton type="submit" color="primary" size="sm" disabled={submitting}>
                      {submitting ? (
                        <>
                          <CSpinner size="sm" className="me-2" /> Saving...
                        </>
                      ) : (
                        'Save Changes'
                      )}
                    </CButton>
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                      disabled={submitting}
                    >
                      Reset
                    </CButton>
                    <CButton
                      type="button"
                      color="secondary"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        id
                          ? navigate(`/administration/procedures/view/${id}`, {
                              state: { returnTo },
                            })
                          : navigate(returnTo)
                      }
                      disabled={submitting}
                    >
                      Back
                    </CButton>
                  </CCol>
                </CRow>
              </CForm>
            ) : (
              <CRow>
                <CCol>
                  <CButton
                    type="button"
                    color="secondary"
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(returnTo)}
                  >
                    Back to List
                  </CButton>
                </CCol>
              </CRow>
            )}
          </CCardBody>
        </CCard>
      </CCol>
    </CRow>
  )
}
