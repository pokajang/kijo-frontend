import dialog from '../../../components/dialog/dialogService'
import { apiJson } from '../../../api/apiClient'

const API_BASE = import.meta.env.VITE_API_BASE || '/'

export const handleInputChange = (e, setFormData) => {
  const { name, value } = e.target
  setFormData((prev) => ({ ...prev, [name]: value }))
}

export const openQuickInput = (selectedSection, setModalVisible) => {
  if (selectedSection) setModalVisible(true)
}

export const createAppraisalRecord = async ({ section, staffId, eventDate, input }) => {
  const payload = {
    section,
    staffId,
    eventDate,
    input,
    timestamp: new Date().toISOString(),
  }

  const json = await apiJson(`${API_BASE}hr/appraisals`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (json.status === 'success') return json
  throw new Error(json.message || 'Could not submit appraisal.')
}

export const submitQuickInput = async (selectedSection, formData, setModalVisible, setFormData) => {
  const confirmed = await dialog.confirm(
    `Are you sure you want to submit this appraisal for staff ID ${formData.selectedStaff}?`,
  )
  if (!confirmed) return

  try {
    await createAppraisalRecord({
      section: selectedSection,
      staffId: formData.selectedStaff,
      eventDate: formData.eventDate,
      input: formData.quickInput,
    })
    dialog.alert('Appraisal submitted successfully.')
    setFormData({
      selectedStaff: '',
      eventDate: new Date().toISOString().slice(0, 10),
      quickInput: '',
    })
    setModalVisible(false)
  } catch (err) {
    console.error(err)
    dialog.alert(err.message || 'Network error: failed to submit appraisal.')
  }
}

export const openInfoModal = (selectedSection, setInfoModalVisible) => {
  setInfoModalVisible(true)
}

export const fetchAppraisalRecords = async (staffId = '', year = '', options = {}) => {
  const { throwOnError = false } = options
  try {
    const query = new URLSearchParams()
    if (staffId) query.append('staff_id', staffId)
    if (year) query.append('year', year)

    const queryString = query.toString()
    const url = `${API_BASE}hr/appraisals${queryString ? `?${queryString}` : ''}`
    const json = await apiJson(url, {
      credentials: 'include',
      silentError: !throwOnError,
    })
    if (json.status === 'success') return Array.isArray(json.records) ? json.records : []
    const message = json.message || 'Failed to fetch appraisal records.'
    if (throwOnError) throw new Error(message)
    console.error(message)
    return []
  } catch (err) {
    if (throwOnError) throw err
    console.error('Failed to fetch appraisal records:', err)
    return []
  }
}

export const fetchFinalAppraisals = async (staffId = '', year = '', options = {}) => {
  const { throwOnError = false } = options
  try {
    const query = new URLSearchParams()
    if (staffId) query.append('staff_id', staffId)
    if (year) query.append('year', year)

    const queryString = query.toString()
    const url = `${API_BASE}hr/appraisals/final${queryString ? `?${queryString}` : ''}`
    const json = await apiJson(url, {
      credentials: 'include',
      silentError: !throwOnError,
    })
    if (json.status === 'success') return Array.isArray(json.records) ? json.records : []
    const message = json.message || 'Failed to fetch final appraisals.'
    if (throwOnError) throw new Error(message)
    console.error(message)
    return []
  } catch (err) {
    if (throwOnError) throw err
    console.error('Failed to fetch final appraisals:', err)
    return []
  }
}

export const fetchFinalAppraisal = async (id) => {
  const json = await apiJson(`${API_BASE}hr/appraisals/final/${encodeURIComponent(id)}`, {
    credentials: 'include',
    silentError: true,
  })
  if (json.status === 'success' && json.record) return json.record
  throw new Error(json.message || 'Failed to fetch final appraisal.')
}

export const createFinalAppraisal = async (payload) => {
  const json = await apiJson(`${API_BASE}hr/appraisals/final`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (json.status === 'success') return json
  throw new Error(json.message || 'Failed to create final appraisal.')
}

export const updateFinalAppraisal = async (id, payload) => {
  const json = await apiJson(`${API_BASE}hr/appraisals/final/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (json.status === 'success') return json
  throw new Error(json.message || 'Failed to update final appraisal.')
}

export const deleteFinalAppraisal = async (id) => {
  const json = await apiJson(`${API_BASE}hr/appraisals/final/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
  })
  if (json.status === 'success') return true
  throw new Error(json.message || 'Failed to delete final appraisal.')
}

export const updateAppraisalRecord = async ({ id, feedback, event_date }) => {
  try {
    const json = await apiJson(`${API_BASE}hr/appraisals/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id, feedback, eventDate: event_date }),
    })
    if (json.status === 'success') return true
    throw new Error(json.message || 'Failed to update appraisal.')
  } catch (err) {
    console.error('Update appraisal failed:', err)
    throw err
  }
}

export const deleteAppraisalRecord = async (id) => {
  try {
    const json = await apiJson(`${API_BASE}hr/appraisals/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ id }),
    })
    if (json.status === 'success') return true
    throw new Error(json.message || 'Failed to delete appraisal.')
  } catch (err) {
    console.error('Delete appraisal failed:', err)
    throw err
  }
}
