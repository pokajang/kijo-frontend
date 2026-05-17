import React, { useEffect, useState } from 'react'
import {
  CCard,
  CCardHeader,
  CCardBody,
  CForm,
  CCol,
  CFormLabel,
  CFormInput,
  CFormSelect,
  CButton,
  CAlert,
} from '@coreui/react'
import CIcon from '@coreui/icons-react'
import { cilPencil, cilTrash } from '@coreui/icons'
import { DataTableLoadingState } from '../../../../components/datatable'
import dialog from '../../../../components/dialog/dialogService'
import BranchFormFields from './BranchFormFields'
import PicCard from './PicCard'

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
  branch_name: '',
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
  if (!cleaned) {
    return { country: 'Malaysia', state: '', intlCountry: '' }
  }

  if (MALAYSIA_STATES.includes(cleaned)) {
    return { country: 'Malaysia', state: cleaned, intlCountry: '' }
  }

  const lastComma = cleaned.lastIndexOf(',')
  if (lastComma >= 0) {
    const statePart = cleaned.slice(0, lastComma).trim()
    const intlCountry = cleaned.slice(lastComma + 1).trim()
    return { country: 'Other', state: statePart, intlCountry }
  }

  return { country: 'Other', state: '', intlCountry: cleaned }
}

const normalizeBranchForEdit = (branch = {}) => {
  const rawCountry = (branch.country || '').trim()
  const rawIntl = (branch.intlCountry || branch.intl_country || '').trim()

  if (rawCountry === 'Other') return { ...branch, country: 'Other', intlCountry: rawIntl }
  if (!rawCountry || rawCountry === 'Malaysia')
    return { ...branch, country: 'Malaysia', intlCountry: '' }
  return { ...branch, country: 'Other', intlCountry: rawCountry }
}

const normalizeBranchListForEdit = (branches = []) => {
  let changed = false
  const normalized = branches.map((branch) => {
    const next = normalizeBranchForEdit(branch)
    const prevIntl = (branch.intlCountry || branch.intl_country || '').trim()
    if (next.country !== (branch.country || '').trim() || next.intlCountry !== prevIntl)
      changed = true
    if ('intl_country' in next) {
      const { intl_country, ...rest } = next
      return rest
    }
    return next
  })
  return { normalized, changed }
}

const makeCountryChangeHandler = (setter) => (e) => {
  const { value } = e.target
  setter((prev) => ({
    ...prev,
    country: value,
    intlCountry: value === 'Malaysia' ? '' : prev.intlCountry,
    state: value === 'Malaysia' ? prev.state : '',
  }))
}

const buildBranchPayload = (form) => {
  const country = (form.country || 'Malaysia').trim() || 'Malaysia'
  return {
    branch_name: (form.branch_name || '').trim(),
    address: (form.address || '').trim(),
    city: (form.city || '').trim(),
    state: (form.state || '').trim(),
    zip: (form.zip || '').trim(),
    country,
    intlCountry: country === 'Other' ? (form.intlCountry || '').trim() : '',
  }
}

const EditCompanyCard = ({
  selectedClient,
  setSelectedClient,
  picList,
  setPicList,
  newPicList,
  setNewPicList,
  showSaveReminder,
  setShowSaveReminder,
  showBranchSaveReminder,
  setShowBranchSaveReminder,
  editBranchLoading,
  newPICForm,
  onNewPICInputChange,
  onAddNewPIC,
  isDuplicatePIC,
  duplicatePICName,
  partialMatchPIC,
  isDuplicateEmail,
  duplicateEmail,
}) => {
  const [newBranchForm, setNewBranchForm] = useState(emptyBranchForm)
  const [editingBranchIndex, setEditingBranchIndex] = useState(null)
  const [editingBranchForm, setEditingBranchForm] = useState(emptyBranchForm)
  const [editingPicTarget, setEditingPicTarget] = useState(null)
  const [editingPicForm, setEditingPicForm] = useState(emptyPicForm)

  useEffect(() => {
    setNewBranchForm(emptyBranchForm)
    setEditingBranchIndex(null)
    setEditingBranchForm(emptyBranchForm)
    setEditingPicTarget(null)
    setEditingPicForm(emptyPicForm)
  }, [selectedClient?.company_id, selectedClient?.state, setSelectedClient])

  useEffect(() => {
    if (!selectedClient?.company_id) return
    const normalized = normalizeCompanyLocation(selectedClient.state)
    setSelectedClient((prev) => {
      if (!prev || prev.company_id !== selectedClient.company_id) return prev
      const next = { ...prev }
      let changed = false

      if ((prev.country || '') !== normalized.country) {
        next.country = normalized.country
        changed = true
      }
      if ((prev.intlCountry || '') !== normalized.intlCountry) {
        next.intlCountry = normalized.intlCountry
        changed = true
      }
      if ((prev.state || '') !== normalized.state) {
        next.state = normalized.state
        changed = true
      }

      return changed ? next : prev
    })
  }, [selectedClient?.company_id, selectedClient?.state, setSelectedClient])

  useEffect(() => {
    if (!selectedClient?.branchList || !Array.isArray(selectedClient.branchList)) return
    const { normalized, changed } = normalizeBranchListForEdit(selectedClient.branchList)
    if (!changed) return
    setSelectedClient((prev) => (prev ? { ...prev, branchList: normalized } : prev))
  }, [selectedClient?.branchList, setSelectedClient])

  if (!selectedClient) return null

  const branchList = Array.isArray(selectedClient.branchList) ? selectedClient.branchList : []
  const existingPicList = Array.isArray(picList) ? picList.filter((p) => p && p.pic_id) : []
  const pendingPicList = Array.isArray(newPicList) ? newPicList : []
  const hasAnyPic = existingPicList.length > 0 || pendingPicList.length > 0
  const companyCountry = selectedClient.country || 'Malaysia'
  const isCompanyInternational = companyCountry !== 'Malaysia'

  const updateBranchList = (updater) => {
    setSelectedClient((prev) => {
      const current = Array.isArray(prev?.branchList) ? prev.branchList : []
      const next = typeof updater === 'function' ? updater(current) : updater
      return { ...prev, branchList: next }
    })
  }

  const handleCompanyCountryChange = (e) => {
    const { value } = e.target
    setSelectedClient((prev) => {
      if (!prev) return prev
      const next = { ...prev, country: value }
      if (value === 'Malaysia') next.intlCountry = ''
      else next.state = ''
      return next
    })
  }

  const handleNewBranchFieldChange = (e) => {
    const { name, value } = e.target
    setNewBranchForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleEditingBranchFieldChange = (e) => {
    const { name, value } = e.target
    setEditingBranchForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleNewBranchCountryChange = makeCountryChangeHandler(setNewBranchForm)
  const handleEditingBranchCountryChange = makeCountryChangeHandler(setEditingBranchForm)

  const handleAddNewBranch = () => {
    if (!newBranchForm.address.trim()) {
      dialog.alert('Branch address is required.')
      return
    }
    updateBranchList((current) => [
      ...current,
      { branch_id: null, ...buildBranchPayload(newBranchForm) },
    ])
    setShowBranchSaveReminder(true)
    setNewBranchForm(emptyBranchForm)
  }

  const handleDeleteBranch = (index) => {
    updateBranchList((current) => current.filter((_, i) => i !== index))
    setShowBranchSaveReminder(true)
    if (editingBranchIndex === index) {
      setEditingBranchIndex(null)
      setEditingBranchForm(emptyBranchForm)
    }
  }

  const handleStartEditBranch = (index) => {
    const branch = branchList[index] || {}
    setEditingBranchIndex(index)
    setEditingBranchForm({
      branch_name: branch.branch_name || '',
      address: branch.address || '',
      city: branch.city || '',
      state: branch.state || '',
      zip: branch.zip || '',
      country: branch.country || 'Malaysia',
      intlCountry: branch.intlCountry || '',
    })
  }

  const handleSaveBranchEdit = () => {
    if (editingBranchIndex == null) return
    if (!editingBranchForm.address.trim()) {
      dialog.alert('Branch address is required.')
      return
    }
    updateBranchList((current) =>
      current.map((branch, idx) =>
        idx === editingBranchIndex
          ? { ...branch, ...buildBranchPayload(editingBranchForm) }
          : branch,
      ),
    )
    setShowBranchSaveReminder(true)
    setEditingBranchIndex(null)
    setEditingBranchForm(emptyBranchForm)
  }

  const handleCancelBranchEdit = () => {
    setEditingBranchIndex(null)
    setEditingBranchForm(emptyBranchForm)
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
  }

  const handleCancelPicEdit = () => {
    setEditingPicTarget(null)
    setEditingPicForm(emptyPicForm)
  }

  const handleDeletePic = (source, index) => {
    if (source === 'existing' && typeof setPicList !== 'function') return
    const setter = source === 'existing' ? setPicList : setNewPicList
    setter((prev) => prev.filter((_, idx) => idx !== index))
    setShowSaveReminder(true)
    if (editingPicTarget?.source === source && editingPicTarget?.index === index) {
      setEditingPicTarget(null)
      setEditingPicForm(emptyPicForm)
    }
  }

  return (
    <CCard className="mb-4">
      <CCardHeader>
        <strong>Company Details</strong>
      </CCardHeader>
      <CCardBody>
        <CForm className="row g-3">
          <CCol md={8}>
            <CFormLabel>Company Name</CFormLabel>
            <CFormInput
              value={selectedClient.company_name}
              onChange={(e) =>
                setSelectedClient((prev) => ({ ...prev, company_name: e.target.value }))
              }
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>SSM Number</CFormLabel>
            <CFormInput
              value={selectedClient.ssm_number}
              onChange={(e) =>
                setSelectedClient((prev) => ({ ...prev, ssm_number: e.target.value }))
              }
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Tax Id. No. (TIN)</CFormLabel>
            <CFormInput
              value={selectedClient.tax_id_no_tin || ''}
              onChange={(e) =>
                setSelectedClient((prev) => ({ ...prev, tax_id_no_tin: e.target.value }))
              }
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>Client Status</CFormLabel>
            <CFormSelect
              value={selectedClient.client_status || ''}
              onChange={(e) =>
                setSelectedClient((prev) => ({ ...prev, client_status: e.target.value }))
              }
            >
              <option value="">Choose status</option>
              <option value="Old">Old</option>
              <option value="New">New</option>
            </CFormSelect>
          </CCol>
          <CCol md={4}>
            <CFormLabel>Country</CFormLabel>
            <CFormSelect value={companyCountry} onChange={handleCompanyCountryChange}>
              <option value="Malaysia">Malaysia</option>
              <option value="Other">Other (specify)</option>
            </CFormSelect>
          </CCol>
          {isCompanyInternational && (
            <CCol md={4}>
              <CFormLabel>Country Name</CFormLabel>
              <CFormInput
                value={selectedClient.intlCountry || ''}
                onChange={(e) =>
                  setSelectedClient((prev) => ({ ...prev, intlCountry: e.target.value }))
                }
                placeholder="e.g., Singapore, United Kingdom, United States"
              />
            </CCol>
          )}
          <CCol xs={12}>
            <CFormLabel>Address</CFormLabel>
            <CFormInput
              value={selectedClient.address}
              onChange={(e) => setSelectedClient((prev) => ({ ...prev, address: e.target.value }))}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>City</CFormLabel>
            <CFormInput
              value={selectedClient.city}
              onChange={(e) => setSelectedClient((prev) => ({ ...prev, city: e.target.value }))}
            />
          </CCol>
          <CCol md={4}>
            <CFormLabel>
              {isCompanyInternational ? 'State / Province / Region' : 'State'}
            </CFormLabel>
            {!isCompanyInternational ? (
              <CFormSelect
                value={selectedClient.state}
                onChange={(e) => setSelectedClient((prev) => ({ ...prev, state: e.target.value }))}
              >
                <option value="">Choose state</option>
                {MALAYSIA_STATES.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </CFormSelect>
            ) : (
              <CFormInput
                value={selectedClient.state || ''}
                onChange={(e) => setSelectedClient((prev) => ({ ...prev, state: e.target.value }))}
                placeholder="e.g., California, Ontario, Greater London"
              />
            )}
          </CCol>
          <CCol md={4}>
            <CFormLabel>{isCompanyInternational ? 'Postal Code' : 'Zip Code'}</CFormLabel>
            <CFormInput
              value={selectedClient.zip}
              onChange={(e) => setSelectedClient((prev) => ({ ...prev, zip: e.target.value }))}
            />
          </CCol>
        </CForm>
      </CCardBody>

      <CCardHeader>
        <strong>Current Branches</strong>
      </CCardHeader>
      <CCardBody>
        {editBranchLoading ? (
          <DataTableLoadingState message="Loading branches..." />
        ) : branchList.length === 0 ? (
          <small className="text-muted">No branches added for this client.</small>
        ) : (
          branchList.map((branch, index) => {
            const isEditing = editingBranchIndex === index
            if (isEditing) {
              return (
                <CCard key={`${branch.branch_id || 'new'}-${index}`} className="mb-2">
                  <CCardBody>
                    <CForm className="row g-3">
                      <BranchFormFields
                        form={editingBranchForm}
                        onFieldChange={handleEditingBranchFieldChange}
                        onCountryChange={handleEditingBranchCountryChange}
                      />
                      <CCol xs={12} className="d-flex justify-content-end gap-2">
                        <CButton
                          size="sm"
                          color="secondary"
                          variant="outline"
                          onClick={handleCancelBranchEdit}
                        >
                          Cancel
                        </CButton>
                        <CButton size="sm" color="primary" onClick={handleSaveBranchEdit}>
                          Save
                        </CButton>
                      </CCol>
                    </CForm>
                  </CCardBody>
                </CCard>
              )
            }
            return (
              <CCard key={`${branch.branch_id || 'new'}-${index}`} className="mb-2">
                <CCardBody className="p-2 d-flex justify-content-between align-items-center flex-wrap gap-2">
                  <div className="d-flex flex-wrap align-items-center gap-2">
                    <strong>{branch.branch_name || `Branch ${index + 1}`}</strong>
                    <small className="text-muted text-break">{branch.address || '-'}</small>
                    <small className="text-muted">
                      {branch.zip || '-'} {branch.city || '-'}, {branch.state || '-'}
                    </small>
                    <small className="text-muted">
                      Country:{' '}
                      {branch.country === 'Other'
                        ? branch.intlCountry || 'Other'
                        : branch.country || 'Malaysia'}
                    </small>
                  </div>
                  <div className="d-flex align-items-center gap-1">
                    <CButton
                      size="sm"
                      color="link"
                      className="p-0 border-0 bg-transparent text-primary"
                      title="Edit branch"
                      onClick={() => handleStartEditBranch(index)}
                    >
                      <CIcon icon={cilPencil} size="sm" />
                    </CButton>
                    <CButton
                      size="sm"
                      color="link"
                      className="p-0 border-0 bg-transparent text-danger"
                      title="Delete branch"
                      onClick={() => handleDeleteBranch(index)}
                    >
                      <CIcon icon={cilTrash} size="sm" />
                    </CButton>
                  </div>
                </CCardBody>
              </CCard>
            )
          })
        )}
        {showBranchSaveReminder && (
          <CAlert
            color="warning"
            dismissible
            onClose={() => setShowBranchSaveReminder(false)}
            className="mb-3"
          >
            You have added or removed branch(es). Don&apos;t forget to click{' '}
            <strong>Save Changes</strong> to update the company.
          </CAlert>
        )}
        <div className="mt-4">
          <div className="text-muted mb-3">Add New Branch</div>
          <CForm className="row g-3">
            <BranchFormFields
              form={newBranchForm}
              onFieldChange={handleNewBranchFieldChange}
              onCountryChange={handleNewBranchCountryChange}
            />
            <CCol md={2} className="d-flex align-items-end justify-content-end">
              <CButton color="secondary" onClick={handleAddNewBranch}>
                Add
              </CButton>
            </CCol>
          </CForm>
        </div>
      </CCardBody>

      <CCardHeader>
        <strong>Current PIC</strong>
      </CCardHeader>
      <CCardBody>
        {!hasAnyPic && <small className="text-muted">Currently no PIC is assigned.</small>}

        {existingPicList.map((pic, index) => (
          <PicCard
            key={`existing-${pic.pic_id || index}`}
            pic={pic}
            source="existing"
            index={index}
            isEditing={editingPicTarget?.source === 'existing' && editingPicTarget?.index === index}
            editForm={editingPicForm}
            onEditFormChange={(field, value) =>
              setEditingPicForm((prev) => ({ ...prev, [field]: value }))
            }
            onStartEdit={handleStartEditPic}
            onSaveEdit={handleSavePicEdit}
            onCancelEdit={handleCancelPicEdit}
            onDelete={handleDeletePic}
          />
        ))}
        {pendingPicList.map((pic, index) => (
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
            onCancelEdit={handleCancelPicEdit}
            onDelete={handleDeletePic}
          />
        ))}

        <CCol className="mt-3">
          {showSaveReminder && (
            <CAlert
              color="warning"
              dismissible
              onClose={() => setShowSaveReminder(false)}
              className="mb-3"
            >
              You have added or removed PIC(s). Don&apos;t forget to click{' '}
              <strong>Save Changes</strong> to update the company.
            </CAlert>
          )}
        </CCol>
        <div className="mt-4">
          <div className="text-muted mb-3">Add New PIC</div>
          <CForm className="row g-3">
            <CCol md={3}>
              <CFormLabel>Full Name</CFormLabel>
              <CFormInput
                name="full_name"
                value={newPICForm.full_name}
                onChange={onNewPICInputChange}
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
              <CFormInput name="email" value={newPICForm.email} onChange={onNewPICInputChange} />
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
                onChange={onNewPICInputChange}
              />
            </CCol>
            <CCol md={2}>
              <CFormLabel>Position</CFormLabel>
              <CFormInput
                name="position"
                value={newPICForm.position}
                onChange={onNewPICInputChange}
              />
            </CCol>
            <CCol md={1} className="d-flex align-items-end">
              <CButton color="secondary" onClick={onAddNewPIC}>
                Add
              </CButton>
            </CCol>
          </CForm>
        </div>
      </CCardBody>
    </CCard>
  )
}

export default EditCompanyCard
