import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  CAlert,
  CButton,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CForm,
  CFormInput,
  CFormLabel,
} from '@coreui/react'
import { DataTableLoadingState } from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import useDuplicateChecker from '../../../hooks/useDuplicateChecker'
import CompanyDetails from '../create/CompanyDetails'
import PicCard from './components/PicCard'
import { SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS } from '../../../shared/paymentTerms'

const API_BASE = import.meta.env.VITE_API_BASE

const MALAYSIA_STATES = [
  'Johor',
  'Kedah',
  'Kelantan',
  'Melaka',
  'Negeri Sembilan',
  'Pahang',
  'Perak',
  'Perlis',
  'Pulau Pinang',
  'Sabah',
  'Sarawak',
  'Selangor',
  'Terengganu',
  'Wilayah Persekutuan Kuala Lumpur',
  'Wilayah Persekutuan Labuan',
  'Wilayah Persekutuan Putrajaya',
]

const emptyBranchForm = {
  branchName: '',
  address: '',
  city: '',
  state: '',
  zip: '',
  country: 'Malaysia',
  intlCountry: '',
}

const emptyPicForm = {
  full_name: '',
  email: '',
  mobile_number: '',
  position: '',
}

const normalizeCompanyLocation = (rawState) => {
  const cleaned = (rawState || '').trim()
  if (!cleaned) return { country: 'Malaysia', state: '', intlCountry: '' }
  if (MALAYSIA_STATES.includes(cleaned))
    return { country: 'Malaysia', state: cleaned, intlCountry: '' }

  const lastComma = cleaned.lastIndexOf(',')
  if (lastComma >= 0) {
    return {
      country: 'Other',
      state: cleaned.slice(0, lastComma).trim(),
      intlCountry: cleaned.slice(lastComma + 1).trim(),
    }
  }

  return { country: 'Other', state: '', intlCountry: cleaned }
}

const composeState = (details) => {
  const state = (details.state || '').trim()
  const intlCountry = (details.intlCountry || '').trim()
  if ((details.country || 'Malaysia') === 'Malaysia') return state
  return [state, intlCountry].filter(Boolean).join(', ')
}

const normalizeCompanyForForm = (company = {}) => {
  const location = normalizeCompanyLocation(company.state)
  const paymentTermsDays = company.payment_terms_days

  return {
    company_id: company.company_id,
    companyName: company.company_name || '',
    ssmNumber: company.ssm_number || '',
    taxIdNoTin: company.tax_id_no_tin || '',
    clientStatus: company.client_status || 'New',
    useDefaultPaymentTerms:
      paymentTermsDays === null || paymentTermsDays === undefined || paymentTermsDays === '',
    paymentTermsDays:
      paymentTermsDays === null || paymentTermsDays === undefined || paymentTermsDays === ''
        ? SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS
        : paymentTermsDays,
    address: company.address || '',
    city: company.city || '',
    state: location.state,
    zip: company.zip || '',
    country: location.country,
    intlCountry: location.intlCountry,
  }
}

const normalizePic = (pic) => ({
  pic_id: pic.pic_id,
  company_id: pic.company_id,
  full_name: pic.full_name || '',
  email: pic.email || '',
  mobile_number: pic.mobile_number || '',
  position: pic.position || '',
  status: pic.status || '',
})

const normalizeBranch = (branch, companyId) => {
  const rawCountry = (branch.country || 'Malaysia').trim() || 'Malaysia'
  const isMalaysia = rawCountry === 'Malaysia'

  return {
    branch_id: branch.branch_id || null,
    company_id: branch.company_id || companyId,
    branchName: branch.branch_name || '',
    address: branch.address || '',
    city: branch.city || '',
    state: branch.state || '',
    zip: branch.zip || '',
    country: isMalaysia ? 'Malaysia' : 'Other',
    intlCountry: isMalaysia ? '' : rawCountry,
  }
}

const ClientEditPage = () => {
  const navigate = useNavigate()
  const { companyId } = useParams()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [alertMessage, setAlertMessage] = useState('')
  const [alertColor, setAlertColor] = useState('info')
  const [selectedClient, setSelectedClient] = useState(null)
  const [branchList, setBranchList] = useState([])
  const [showBranchForm, setShowBranchForm] = useState(false)
  const [currentBranch, setCurrentBranch] = useState(emptyBranchForm)
  const [picList, setPicList] = useState([])
  const [newPicList, setNewPicList] = useState([])
  const [picDatabase, setPicDatabase] = useState([])
  const [showSaveReminder, setShowSaveReminder] = useState(false)
  const [showBranchSaveReminder, setShowBranchSaveReminder] = useState(false)
  const [newPICForm, setNewPICForm] = useState(emptyPicForm)
  const [editingPicTarget, setEditingPicTarget] = useState(null)
  const [editingPicForm, setEditingPicForm] = useState(emptyPicForm)

  const {
    isDuplicate: isDuplicatePIC,
    matchedValue: duplicatePICName,
    partialMatch: partialMatchPIC,
  } = useDuplicateChecker({
    valueToCheck: newPICForm.full_name,
    key: 'full_name',
    dataset: picDatabase,
    matchType: 'partial',
  })

  const { isDuplicate: isDuplicateEmail, matchedValue: duplicateEmail } = useDuplicateChecker({
    valueToCheck: newPICForm.email,
    key: 'email',
    dataset: picDatabase,
  })

  const fetchCompanyPics = useCallback(async (id) => {
    const response = await fetch(`${API_BASE}client-companies/${id}/pics`, {
      credentials: 'include',
    })
    const result = await response.json()
    if (result.status !== 'success' || !Array.isArray(result.data)) return []
    return result.data.map(normalizePic)
  }, [])

  const fetchCompanyBranches = useCallback(async (id) => {
    const response = await fetch(`${API_BASE}client-companies/${id}/branches`, {
      credentials: 'include',
    })
    const result = await response.json()
    if (result.status !== 'success' || !Array.isArray(result.data)) return []
    return result.data.map((branch) => normalizeBranch(branch, id))
  }, [])

  const fetchPicDatabase = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}client-pics`, { credentials: 'include' })
      const result = await response.json()
      setPicDatabase(result.status === 'success' && Array.isArray(result.data) ? result.data : [])
    } catch (err) {
      console.error('Failed to fetch PIC list:', err)
      setPicDatabase([])
    }
  }, [])

  const loadClient = useCallback(async () => {
    const id = Number(companyId)
    if (!id) {
      setError('Invalid client company id.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}client-companies/${id}`, { credentials: 'include' })
      const result = await response.json()
      if (result.status !== 'success') {
        throw new Error(result.message || 'Unable to load client company.')
      }

      const company = result.data || null
      if (!company) {
        setSelectedClient(null)
        setBranchList([])
        setPicList([])
        setError('Client company not found.')
        return
      }

      const [branches, pics] = await Promise.all([fetchCompanyBranches(id), fetchCompanyPics(id)])
      setSelectedClient(normalizeCompanyForForm(company))
      setBranchList(branches)
      setShowBranchForm(branches.length > 0)
      setPicList(pics.filter((pic) => pic && pic.pic_id))
      setNewPicList([])
      setShowSaveReminder(false)
      setShowBranchSaveReminder(false)
      setAlertMessage('')
      setCurrentBranch(emptyBranchForm)
    } catch (err) {
      setSelectedClient(null)
      setBranchList([])
      setPicList([])
      setError(err.message || 'Unable to load client company.')
    } finally {
      setLoading(false)
    }
  }, [companyId, fetchCompanyBranches, fetchCompanyPics])

  useEffect(() => {
    loadClient()
    fetchPicDatabase()
  }, [loadClient, fetchPicDatabase])

  const handleInputChange = (e) => {
    const { name, type, checked, value } = e.target
    setSelectedClient((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }))
  }

  const handleBranchInputChange = (e) => {
    const { name, value } = e.target
    setCurrentBranch((prev) => ({ ...prev, [name]: value }))
  }

  const handleBranchListFieldChange = (index, name, value) => {
    setBranchList((prev) =>
      prev.map((branch, currentIndex) =>
        currentIndex === index ? { ...branch, [name]: value } : branch,
      ),
    )
    setShowBranchSaveReminder(true)
  }

  const addBranchToList = () => {
    if (!currentBranch.address.trim()) {
      dialog.alert('Branch address is required.')
      return
    }

    setBranchList((prev) => [
      ...prev,
      {
        ...currentBranch,
        branch_id: null,
        branchName: currentBranch.branchName.trim() || `Branch ${prev.length + 1}`,
      },
    ])
    setCurrentBranch(emptyBranchForm)
    setShowBranchSaveReminder(true)
  }

  const handleNewPICInputChange = (e) => {
    const { name, value } = e.target
    setNewPICForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddNewPIC = () => {
    if (!newPICForm.full_name.trim()) {
      dialog.alert('Full Name is required.')
      return
    }
    if (!newPICForm.email.trim()) {
      dialog.alert('Email is required.')
      return
    }
    if (isDuplicatePIC || isDuplicateEmail) {
      dialog.alert('This PIC or email already exists in the system.')
      return
    }

    setNewPicList((prev) => [...prev, newPICForm])
    setNewPICForm(emptyPicForm)
    setShowSaveReminder(true)
  }

  const handleStartEditPic = (source, index, pic) => {
    setEditingPicTarget({ source, index })
    setEditingPicForm({
      full_name: pic.full_name || '',
      email: pic.email || '',
      mobile_number: pic.mobile_number || '',
      position: pic.position || '',
    })
  }

  const handleSavePicEdit = () => {
    if (!editingPicTarget) return
    if (!editingPicForm.full_name.trim()) {
      dialog.alert('Full Name is required.')
      return
    }
    if (!editingPicForm.email.trim()) {
      dialog.alert('Email is required.')
      return
    }

    const trimmed = {
      full_name: editingPicForm.full_name.trim(),
      email: editingPicForm.email.trim(),
      mobile_number: editingPicForm.mobile_number.trim(),
      position: editingPicForm.position.trim(),
    }
    const setter = editingPicTarget.source === 'existing' ? setPicList : setNewPicList
    setter((prev) =>
      prev.map((pic, idx) => (idx === editingPicTarget.index ? { ...pic, ...trimmed } : pic)),
    )
    setEditingPicTarget(null)
    setEditingPicForm(emptyPicForm)
    setShowSaveReminder(true)
  }

  const handleDeletePic = (source, index) => {
    const setter = source === 'existing' ? setPicList : setNewPicList
    setter((prev) => prev.filter((_, idx) => idx !== index))
    setShowSaveReminder(true)
    if (editingPicTarget?.source === source && editingPicTarget?.index === index) {
      setEditingPicTarget(null)
      setEditingPicForm(emptyPicForm)
    }
  }

  const buildPayload = () => ({
    companyName: (selectedClient.companyName || '').trim(),
    ssmNumber: (selectedClient.ssmNumber || '').trim(),
    taxIdNoTin: (selectedClient.taxIdNoTin || '').trim(),
    clientStatus: (selectedClient.clientStatus || 'New').trim(),
    useDefaultPaymentTerms: Boolean(selectedClient.useDefaultPaymentTerms),
    paymentTermsDays: selectedClient.useDefaultPaymentTerms
      ? null
      : Number(selectedClient.paymentTermsDays || SYSTEM_DEFAULT_PAYMENT_TERMS_DAYS),
    address: (selectedClient.address || '').trim(),
    city: (selectedClient.city || '').trim(),
    state: composeState(selectedClient),
    zip: (selectedClient.zip || '').trim(),
    country: selectedClient.country || 'Malaysia',
    intlCountry: (selectedClient.intlCountry || '').trim(),
    picList: picList
      .filter((pic) => pic && pic.pic_id)
      .map((pic) => ({
        pic_id: pic.pic_id,
        full_name: (pic.full_name || '').trim(),
        email: (pic.email || '').trim(),
        mobile_number: (pic.mobile_number || '').trim(),
        position: (pic.position || '').trim(),
      })),
    newPicList: newPicList.map((pic) => ({
      full_name: (pic.full_name || '').trim(),
      email: (pic.email || '').trim(),
      mobile_number: (pic.mobile_number || '').trim(),
      position: (pic.position || '').trim(),
    })),
    branchList: branchList.map((branch) => ({
      branch_id: branch.branch_id || null,
      branchName: (branch.branchName || '').trim(),
      address: (branch.address || '').trim(),
      city: (branch.city || '').trim(),
      state: (branch.state || '').trim(),
      zip: (branch.zip || '').trim(),
      country: (branch.country || '').trim() || 'Malaysia',
      intlCountry:
        (branch.country || 'Malaysia') === 'Other' ? (branch.intlCountry || '').trim() : '',
    })),
  })

  const handleSave = async () => {
    if (!selectedClient?.company_id || saving) return
    if (!(await dialog.confirm('Save changes to this client?'))) return

    setSaving(true)
    setAlertMessage('')
    try {
      const response = await fetch(`${API_BASE}client-companies/${selectedClient.company_id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })
      const result = await response.json()

      if (result.status === 'success') {
        await dialog.alert('Client updated successfully.', {
          title: 'Client Updated',
          okText: 'OK',
          alert: {
            color: 'warning',
            message:
              "Client documents are not updated automatically. To apply the latest client details to a specific document, use 'Sync Client' from its quotation record.",
          },
        })
        navigate(`/client/manage/${selectedClient.company_id}`, {
          state: { message: 'Client updated successfully.' },
        })
        return
      }

      setAlertMessage(result.message || 'Update failed.')
      setAlertColor(result.status === 'warn' ? 'warning' : 'danger')
    } catch (err) {
      console.error('Update error:', err)
      dialog.alert('Server error. Please try again later.')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    const id = selectedClient?.company_id || companyId
    navigate(id ? `/client/manage/${id}` : '/client/manage')
  }

  if (loading) {
    return <DataTableLoadingState message="Loading client..." />
  }

  if (error || !selectedClient) {
    return (
      <CCard className="mb-4">
        <CCardHeader>
          <strong>Edit Client</strong>
        </CCardHeader>
        <CCardBody>
          <CAlert color="danger">{error || 'Client company not found.'}</CAlert>
          <CButton
            color="secondary"
            variant="outline"
            size="sm"
            onClick={() => navigate('/client/manage')}
          >
            Back
          </CButton>
        </CCardBody>
      </CCard>
    )
  }

  const existingPicList = picList.filter((pic) => pic && pic.pic_id)
  const hasAnyPic = existingPicList.length > 0 || newPicList.length > 0

  return (
    <>
      {alertMessage && (
        <CAlert color={alertColor} dismissible onClose={() => setAlertMessage('')} className="mb-3">
          {alertMessage}
        </CAlert>
      )}

      <CompanyDetails
        title="Edit Client"
        clientDetails={selectedClient}
        handleInputChange={handleInputChange}
        branchList={branchList}
        setBranchList={(next) => {
          setBranchList(next)
          setShowBranchSaveReminder(true)
        }}
        editableBranchList
        onBranchListFieldChange={handleBranchListFieldChange}
        showBranchForm={showBranchForm}
        setShowBranchForm={setShowBranchForm}
        currentBranch={currentBranch}
        handleBranchInputChange={handleBranchInputChange}
        addBranchToList={addBranchToList}
        onBack={handleCancel}
        footerActions={
          <CCardFooter className="d-flex justify-content-end gap-2">
            <CButton
              color="secondary"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              disabled={saving}
            >
              Cancel
            </CButton>
            <CButton color="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </CButton>
          </CCardFooter>
        }
      >
        {showBranchSaveReminder && (
          <CCardBody className="pt-0">
            <CAlert
              color="warning"
              dismissible
              onClose={() => setShowBranchSaveReminder(false)}
              className="mb-0"
            >
              You have changed branch details. Click <strong>Save Changes</strong> to update the
              company.
            </CAlert>
          </CCardBody>
        )}
        <CCardHeader>
          <strong>Client In Charge Details</strong> <small>Multiple PICs allowed</small>
        </CCardHeader>
        <CCardBody>
          {!hasAnyPic && <small className="text-muted">Currently no PIC is assigned.</small>}

          {existingPicList.map((pic, index) => (
            <PicCard
              key={`existing-${pic.pic_id || index}`}
              pic={pic}
              source="existing"
              index={index}
              isEditing={
                editingPicTarget?.source === 'existing' && editingPicTarget?.index === index
              }
              editForm={editingPicForm}
              onEditFormChange={(field, value) =>
                setEditingPicForm((prev) => ({ ...prev, [field]: value }))
              }
              onStartEdit={handleStartEditPic}
              onSaveEdit={handleSavePicEdit}
              onCancelEdit={() => {
                setEditingPicTarget(null)
                setEditingPicForm(emptyPicForm)
              }}
              onDelete={handleDeletePic}
            />
          ))}

          {newPicList.map((pic, index) => (
            <PicCard
              key={`new-${index}`}
              pic={pic}
              source="new"
              index={index}
              isEditing={editingPicTarget?.source === 'new' && editingPicTarget?.index === index}
              editForm={editingPicForm}
              onEditFormChange={(field, value) =>
                setEditingPicForm((prev) => ({ ...prev, [field]: value }))
              }
              onStartEdit={handleStartEditPic}
              onSaveEdit={handleSavePicEdit}
              onCancelEdit={() => {
                setEditingPicTarget(null)
                setEditingPicForm(emptyPicForm)
              }}
              onDelete={handleDeletePic}
            />
          ))}

          {showSaveReminder && (
            <CAlert
              color="warning"
              dismissible
              onClose={() => setShowSaveReminder(false)}
              className="mb-3"
            >
              You have changed PIC details. Click <strong>Save Changes</strong> to update the
              company.
            </CAlert>
          )}

          <div className="mt-4">
            <div className="text-muted mb-3">Add New PIC</div>
            <CForm className="row g-3">
              <CCol md={3}>
                <CFormLabel>Full Name</CFormLabel>
                <CFormInput
                  name="full_name"
                  value={newPICForm.full_name}
                  onChange={handleNewPICInputChange}
                />
                {isDuplicatePIC && (
                  <CAlert color="danger" className="mt-2">
                    <strong>{duplicatePICName}</strong> already exists in the system.
                  </CAlert>
                )}
                {!isDuplicatePIC && partialMatchPIC && (
                  <CAlert color="primary" className="mt-2">
                    <strong>{partialMatchPIC}</strong> looks similar. Please double-check.
                  </CAlert>
                )}
              </CCol>
              <CCol md={3}>
                <CFormLabel>Email</CFormLabel>
                <CFormInput
                  name="email"
                  value={newPICForm.email}
                  onChange={handleNewPICInputChange}
                />
                {isDuplicateEmail && (
                  <CAlert color="warning" className="mt-2">
                    <strong>{duplicateEmail}</strong> is already in use.
                  </CAlert>
                )}
              </CCol>
              <CCol md={3}>
                <CFormLabel>Mobile Number</CFormLabel>
                <CFormInput
                  name="mobile_number"
                  value={newPICForm.mobile_number}
                  onChange={handleNewPICInputChange}
                />
              </CCol>
              <CCol md={2}>
                <CFormLabel>Position</CFormLabel>
                <CFormInput
                  name="position"
                  value={newPICForm.position}
                  onChange={handleNewPICInputChange}
                />
              </CCol>
              <CCol md={1} className="d-flex align-items-end">
                <CButton color="primary" size="sm" onClick={handleAddNewPIC}>
                  Add
                </CButton>
              </CCol>
            </CForm>
          </div>
        </CCardBody>
      </CompanyDetails>
    </>
  )
}

export default ClientEditPage
