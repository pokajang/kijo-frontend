import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { CAlert, CCol, CRow } from '@coreui/react'
import {
  DataTableDetailShell,
  DataTableEmbeddedList,
  DataTableStatusBadge,
} from '../../../components/datatable'
import dialog from '../../../components/dialog/dialogService'
import useDuplicateChecker from '../../../hooks/useDuplicateChecker'
import DeleteCompanyModal from './components/DeleteCompanyModal'
import EditClientModal from './components/EditClientModal'

const API_BASE = import.meta.env.VITE_API_BASE
const emptyValue = '-'

const normalizeStatus = (status) => {
  const value = String(status || '').trim()
  if (!value) return 'No Status'
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
}

const getStatusTone = (status) => {
  if (status === 'New') return 'success'
  if (status === 'Old') return 'info'
  return 'danger'
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

const normalizeBranch = (branch, companyId) => ({
  branch_id: branch.branch_id || null,
  company_id: branch.company_id || companyId,
  branch_name: branch.branch_name || '',
  address: branch.address || '',
  city: branch.city || '',
  state: branch.state || '',
  zip: branch.zip || '',
  country: branch.country || 'Malaysia',
})

const DetailField = ({ label, value, children }) => (
  <CCol xs={12} md={6} lg={4}>
    <div className="records-detail-field">
      <div className="small text-muted">{label}</div>
      <div>{children || value || emptyValue}</div>
    </div>
  </CCol>
)

const branchColumns = [
  {
    key: 'branch_name',
    label: 'Branch',
    render: (branch, index) => branch.branch_name || `Branch ${index + 1}`,
  },
  { key: 'address', label: 'Address' },
  { key: 'zip', label: 'Zip' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
]

const picColumns = [
  { key: 'full_name', label: 'Full Name' },
  { key: 'email', label: 'Email' },
  { key: 'mobile_number', label: 'Mobile' },
  { key: 'position', label: 'Position' },
]

const ClientCompanyDetailPage = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { companyId } = useParams()
  const autoEditOpenedRef = useRef(false)
  const [company, setCompany] = useState(null)
  const [branches, setBranches] = useState([])
  const [pics, setPics] = useState([])
  const [picDatabase, setPicDatabase] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [actionError, setActionError] = useState('')
  const [editModalVisible, setEditModalVisible] = useState(false)
  const [editBranchLoading, setEditBranchLoading] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedPic, setSelectedPic] = useState(null)
  const [picList, setPicList] = useState([])
  const [newPicList, setNewPicList] = useState([])
  const [showSaveReminder, setShowSaveReminder] = useState(false)
  const [showBranchSaveReminder, setShowBranchSaveReminder] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')
  const [alertColor, setAlertColor] = useState('info')
  const [newPICForm, setNewPICForm] = useState({
    full_name: '',
    email: '',
    mobile_number: '',
    position: '',
  })
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)

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

  const loadPicDatabase = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}client-pics`, { credentials: 'include' })
      const result = await response.json()
      if (result.status === 'success' && Array.isArray(result.data)) {
        setPicDatabase(result.data)
      }
    } catch (err) {
      console.error('Failed to fetch PIC list:', err)
      setPicDatabase([])
    }
  }, [])

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

  const loadCompany = useCallback(async () => {
    const id = Number(companyId)
    if (!id) {
      setError('Invalid client company id.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')
    try {
      const response = await fetch(`${API_BASE}client-companies`, { credentials: 'include' })
      const result = await response.json()
      if (result.status !== 'success' || !Array.isArray(result.data)) {
        throw new Error(result.message || 'Unable to load client company.')
      }

      const nextCompany = result.data.find((item) => String(item.company_id) === String(id)) || null
      if (!nextCompany) {
        setCompany(null)
        setBranches([])
        setPics([])
        setError('Client company not found.')
        return
      }

      const [nextBranches, nextPics] = await Promise.all([
        fetchCompanyBranches(id),
        fetchCompanyPics(id),
      ])
      setCompany(nextCompany)
      setBranches(nextBranches)
      setPics(nextPics)
    } catch (err) {
      setCompany(null)
      setBranches([])
      setPics([])
      setError(err.message || 'Unable to load client company.')
    } finally {
      setLoading(false)
    }
  }, [companyId, fetchCompanyBranches, fetchCompanyPics])

  useEffect(() => {
    loadCompany()
    loadPicDatabase()
  }, [loadCompany, loadPicDatabase])

  const openEditModal = useCallback(() => {
    if (!company) return
    setSelectedClient({ ...company, branchList: branches })
    setSelectedPic(null)
    setPicList(pics.filter((pic) => pic && pic.pic_id))
    setNewPicList([])
    setShowSaveReminder(false)
    setShowBranchSaveReminder(false)
    setAlertMessage('')
    setEditBranchLoading(false)
    setEditModalVisible(true)
  }, [branches, company, pics])

  useEffect(() => {
    if (!company || autoEditOpenedRef.current || !location.state?.openEdit) return
    autoEditOpenedRef.current = true
    openEditModal()
  }, [company, location.state?.openEdit, openEditModal])

  useEffect(() => {
    if (loading || !company || !location.hash) return undefined

    const timer = window.setTimeout(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      })
    }, 50)

    return () => window.clearTimeout(timer)
  }, [company, loading, location.hash])

  const handleNewPICInputChange = (e) => {
    const { name, value } = e.target
    setNewPICForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddNewPIC = () => {
    if (!newPICForm.full_name.trim()) {
      dialog.alert('Full Name is required.')
      return
    }

    if (isDuplicatePIC || isDuplicateEmail) {
      dialog.alert('This PIC or email already exists in the system.')
      return
    }

    setNewPicList((prev) => [...prev, newPICForm])
    setNewPICForm({
      full_name: '',
      email: '',
      mobile_number: '',
      position: '',
    })
    setShowSaveReminder(true)
  }

  const saveEdit = async () => {
    const companyCountry = (selectedClient?.country || 'Malaysia').trim() || 'Malaysia'
    const companyIntlCountry = (
      selectedClient?.intlCountry ||
      selectedClient?.intl_country ||
      ''
    ).trim()

    const payload = {
      ...selectedClient,
      country: companyCountry,
      intl_country: companyIntlCountry,
      picList: Array.isArray(picList)
        ? picList
            .filter((pic) => pic && pic.pic_id)
            .map((pic) => ({
              pic_id: pic.pic_id,
              full_name: (pic.full_name || '').trim(),
              email: (pic.email || '').trim(),
              mobile_number: (pic.mobile_number || '').trim(),
              position: (pic.position || '').trim(),
            }))
        : [],
      newPicList,
      branchList: Array.isArray(selectedClient?.branchList)
        ? selectedClient.branchList.map((branch) => ({
            branch_id: branch.branch_id || null,
            branch_name: (branch.branch_name || '').trim(),
            address: (branch.address || '').trim(),
            city: (branch.city || '').trim(),
            state: (branch.state || '').trim(),
            zip: (branch.zip || '').trim(),
            country: (branch.country || '').trim() || 'Malaysia',
            intl_country: (branch.intlCountry || branch.intl_country || '').trim(),
          }))
        : [],
    }

    try {
      const response = await fetch(`${API_BASE}client-companies/${selectedClient?.company_id}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const result = await response.json()

      if (result.status === 'success') {
        setEditModalVisible(false)
        setSelectedClient(null)
        setPicList([])
        setNewPicList([])
        setShowSaveReminder(false)
        setShowBranchSaveReminder(false)
        setInfo('Client updated successfully.')
        await loadCompany()
        await loadPicDatabase()
        await dialog.alert('Client updated successfully.', {
          title: 'Client Updated',
          okText: 'OK',
          alert: {
            color: 'warning',
            message:
              "Client documents are not updated automatically. To apply the latest client details to a specific document, use 'Sync Client' from its quotation record.",
          },
        })
      } else if (result.status === 'warn') {
        setAlertMessage(result.message)
        setAlertColor('warning')
      } else {
        setAlertMessage(`Update failed: ${result.message}`)
        setAlertColor('danger')
      }
    } catch (err) {
      console.error('Update error:', err)
      dialog.alert('Server error. Please try again later.')
    }
  }

  const confirmDeleteCompany = async () => {
    if (!company?.company_id) return

    setDeleteLoading(true)
    setActionError('')
    try {
      const response = await fetch(`${API_BASE}client-companies/${company.company_id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const result = await response.json()
      if (result.status === 'success') {
        setDeleteModalVisible(false)
        navigate('/client/manage')
      } else {
        setActionError(result.message || 'Unable to delete client company.')
      }
    } catch (err) {
      console.error('Delete company error:', err)
      setActionError('Server error. Please try again later.')
    } finally {
      setDeleteLoading(false)
    }
  }

  const status = normalizeStatus(company?.client_status)
  const actions = company
    ? [
        {
          key: 'edit',
          label: 'Edit',
          onClick: openEditModal,
        },
        {
          key: 'delete',
          label: 'Delete',
          danger: true,
          onClick: () => setDeleteModalVisible(true),
        },
      ]
    : []

  return (
    <>
      {info && (
        <CAlert color="success" dismissible onClose={() => setInfo('')} className="mb-3">
          {info}
        </CAlert>
      )}
      {actionError && (
        <CAlert color="danger" dismissible onClose={() => setActionError('')} className="mb-3">
          {actionError}
        </CAlert>
      )}

      <DataTableDetailShell
        title="Client Company Details"
        backLabel="Back"
        onBack={() => navigate('/client/manage')}
        loading={loading || editBranchLoading}
        error={error}
        record={company}
        actions={actions}
        emptyMessage="Client company not found."
      >
        <CRow className="g-3 mb-4">
          <DetailField label="Company" value={company?.company_name} />
          <DetailField label="Status">
            <DataTableStatusBadge tone={getStatusTone(status)}>{status}</DataTableStatusBadge>
          </DetailField>
          <DetailField label="SSM" value={company?.ssm_number} />
          <DetailField label="TIN" value={company?.tax_id_no_tin} />
          <DetailField label="Address" value={company?.address} />
          <DetailField label="Zip" value={company?.zip} />
          <DetailField label="City" value={company?.city} />
          <DetailField label="State" value={company?.state} />
        </CRow>

        <div id="branches" className="mb-4">
          <div className="fw-semibold mb-2">Branches ({branches.length})</div>
          <DataTableEmbeddedList
            rows={branches}
            columns={branchColumns}
            getRowKey={(branch, index) => branch.branch_id || `${branch.company_id}-${index}`}
            emptyMessage="No branch records found."
            renderMobileItem={(branch, index) => (
              <div className="records-mobile-item">
                <div className="records-mobile-quote-id">
                  {branch.branch_name || `Branch ${index + 1}`}
                </div>
                <div className="records-mobile-subtitle mt-1">{branch.address || '-'}</div>
                <div className="records-mobile-client mt-1">
                  {[branch.zip, branch.city, branch.state, branch.country]
                    .filter(Boolean)
                    .join(', ') || '-'}
                </div>
              </div>
            )}
          />
        </div>

        <div id="pics">
          <div className="fw-semibold mb-2">PICs ({pics.length})</div>
          <DataTableEmbeddedList
            rows={pics}
            columns={picColumns}
            getRowKey={(pic, index) => pic.pic_id || `${pic.company_id}-${index}`}
            emptyMessage="No PIC records found."
            renderMobileItem={(pic) => (
              <div className="records-mobile-item">
                <div className="records-mobile-quote-id">{pic.full_name || '-'}</div>
                <div className="records-mobile-subtitle mt-1">{pic.position || '-'}</div>
                <div className="records-mobile-client mt-1">
                  {[pic.email, pic.mobile_number].filter(Boolean).join(' | ') || '-'}
                </div>
              </div>
            )}
          />
        </div>
      </DataTableDetailShell>

      <EditClientModal
        visible={editModalVisible}
        onClose={() => setEditModalVisible(false)}
        editMode="company"
        selectedPic={selectedPic}
        setSelectedPic={setSelectedPic}
        selectedClient={selectedClient}
        setSelectedClient={setSelectedClient}
        alertMessage={alertMessage}
        alertColor={alertColor}
        onDismissAlert={() => setAlertMessage('')}
        picList={picList}
        setPicList={setPicList}
        newPicList={newPicList}
        setNewPicList={setNewPicList}
        showSaveReminder={showSaveReminder}
        setShowSaveReminder={setShowSaveReminder}
        showBranchSaveReminder={showBranchSaveReminder}
        setShowBranchSaveReminder={setShowBranchSaveReminder}
        editBranchLoading={editBranchLoading}
        newPICForm={newPICForm}
        onNewPICInputChange={handleNewPICInputChange}
        onAddNewPIC={handleAddNewPIC}
        isDuplicatePIC={isDuplicatePIC}
        duplicatePICName={duplicatePICName}
        partialMatchPIC={partialMatchPIC}
        isDuplicateEmail={isDuplicateEmail}
        duplicateEmail={duplicateEmail}
        onSave={saveEdit}
      />

      <DeleteCompanyModal
        visible={deleteModalVisible}
        onClose={() => {
          if (deleteLoading) return
          setDeleteModalVisible(false)
        }}
        onConfirm={confirmDeleteCompany}
        companyName={company?.company_name || ''}
        loading={deleteLoading}
      />
    </>
  )
}

export default ClientCompanyDetailPage
